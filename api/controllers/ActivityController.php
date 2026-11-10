<?php
// api/controllers/ActivityController.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../middleware/auth.php';

class ActivityController {
    public static function index() {
        $user = getAuthUser();
        $db = Database::getInstance();

        // Check voting_open setting
        $settingsStmt = $db->query('SELECT voting_open FROM settings WHERE id = 1');
        $setting = $settingsStmt->fetch();
        $votingOpen = ($setting && isset($setting['voting_open'])) ? (bool)$setting['voting_open'] : true;

        $isMember = ($user && $user['role'] === 'member');
        if ($isMember && !$votingOpen) {
            jsonResponse([
                'success' => true,
                'activities' => [],
                'memberCount' => 0,
                'votingOpen' => false,
                'message' => 'التصويت وعرض الأنشطة مغلق حالياً بانتظار إيعاز الإدارة'
            ]);
        }

        // Get activities
        $actStmt = $db->query('SELECT * FROM activities ORDER BY CAST(seq AS UNSIGNED), seq, imported_at ASC');
        $activities = $actStmt->fetchAll();

        // Get votes
        $voteStmt = $db->query('SELECT * FROM votes');
        $votes = $voteStmt->fetchAll();

        // Get active members count
        $memStmt = $db->query("SELECT id FROM users WHERE role = 'member' AND active = 1");
        $members = $memStmt->fetchAll();
        $memberCount = count($members);

        $activitiesWithStatus = array_map(function($act) use ($votes, $memberCount) {
            $actVotes = array_values(array_filter($votes, function($v) use ($act) {
                return $v['activity_id'] === $act['id'];
            }));
            $approved = count(array_filter($actVotes, function($v) { return $v['vote'] === 'approve'; }));
            $rejected = count(array_filter($actVotes, function($v) { return $v['vote'] === 'reject'; }));

            $status = 'pending';
            if ($memberCount > 0 && count($actVotes) >= $memberCount) {
                if ($approved > $rejected) $status = 'approved';
                else if ($rejected > $approved) $status = 'rejected';
            }

            $extra = null;
            if (!empty($act['extra'])) {
                $extra = is_string($act['extra']) ? json_decode($act['extra'], true) : $act['extra'];
            }

            return array_merge($act, [
                'extra' => $extra,
                'votes' => $actVotes,
                'approveCount' => $approved,
                'rejectCount' => $rejected,
                'status' => $status
            ]);
        }, $activities);

        jsonResponse([
            'success' => true,
            'activities' => $activitiesWithStatus,
            'memberCount' => $memberCount,
            'votingOpen' => $votingOpen
        ]);
    }

    public static function create() {
        requireAdmin();
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');

        if (!$name) {
            jsonResponse(['success' => false, 'message' => 'اسم النشاط مطلوب'], 400);
        }

        $db = Database::getInstance();
        $cntStmt = $db->query('SELECT COUNT(*) as cnt FROM activities');
        $cnt = $cntStmt->fetch()['cnt'];

        $id = generateUuid();
        $seq = !empty($input['seq']) ? $input['seq'] : (string)($cnt + 1);

        $stmt = $db->prepare('INSERT INTO activities (id, seq, name, type, team_leader, affiliation, team_members, attachment, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $id,
            $seq,
            $name,
            $input['type'] ?? '',
            $input['teamLeader'] ?? '',
            $input['affiliation'] ?? '',
            $input['teamMembers'] ?? '',
            $input['attachment'] ?? '',
            !empty($input['extra']) ? json_encode($input['extra']) : null
        ]);

        jsonResponse(['success' => true, 'message' => 'تم إضافة النشاط', 'id' => $id], 201);
    }

    public static function bulkImport() {
        requireAdmin();
        $input = getJsonInput();
        $activities = $input['activities'] ?? [];
        $replace = !empty($input['replace']);

        if (!is_array($activities) || empty($activities)) {
            jsonResponse(['success' => false, 'message' => 'لا توجد بيانات للاستيراد'], 400);
        }

        $db = Database::getInstance();
        if ($replace) {
            $db->exec('DELETE FROM votes');
            $db->exec('DELETE FROM activities');
        }

        $cntStmt = $db->query('SELECT COUNT(*) as cnt FROM activities');
        $offset = (int)$cntStmt->fetch()['cnt'];
        $added = 0;

        $stmt = $db->prepare('INSERT INTO activities (id, seq, name, type, team_leader, affiliation, team_members, attachment, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

        foreach ($activities as $i => $act) {
            $name = trim($act['name'] ?? '');
            if (!$name) continue;

            $id = generateUuid();
            $seq = !empty($act['seq']) ? (string)$act['seq'] : (string)($offset + $i + 1);

            $stmt->execute([
                $id,
                $seq,
                $name,
                $act['type'] ?? '',
                $act['teamLeader'] ?? $act['team_leader'] ?? '',
                $act['affiliation'] ?? '',
                $act['teamMembers'] ?? $act['team_members'] ?? '',
                $act['attachment'] ?? '',
                !empty($act['extra']) ? json_encode($act['extra']) : null
            ]);
            $added++;
        }

        jsonResponse(['success' => true, 'message' => "تم استيراد {$added} نشاط بنجاح", 'count' => $added]);
    }

    public static function update($id) {
        requireAdmin();
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');

        if (!$name) {
            jsonResponse(['success' => false, 'message' => 'اسم النشاط مطلوب'], 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare('UPDATE activities SET seq = ?, name = ?, type = ?, team_leader = ?, affiliation = ?, team_members = ?, attachment = ? WHERE id = ?');
        $stmt->execute([
            $input['seq'] ?? '',
            $name,
            $input['type'] ?? '',
            $input['teamLeader'] ?? '',
            $input['affiliation'] ?? '',
            $input['teamMembers'] ?? '',
            $input['attachment'] ?? '',
            $id
        ]);

        jsonResponse(['success' => true, 'message' => 'تم التعديل']);
    }

    public static function delete($id) {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->prepare('DELETE FROM activities WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'تم الحذف']);
    }

    public static function resetAll() {
        requireAdmin();
        $db = Database::getInstance();
        $db->exec('DELETE FROM votes');
        $db->exec('DELETE FROM activities');
        jsonResponse(['success' => true, 'message' => 'تم مسح جميع الأنشطة والتصويتات']);
    }

    public static function resetVotesOnly() {
        requireAdmin();
        $db = Database::getInstance();
        $db->exec('DELETE FROM votes');
        jsonResponse(['success' => true, 'message' => 'تم مسح سجلات التصويت']);
    }

    public static function toggleVoting() {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->query('SELECT voting_open FROM settings WHERE id = 1');
        $row = $stmt->fetch();
        $current = ($row && isset($row['voting_open'])) ? (int)$row['voting_open'] : 1;
        $next = $current ? 0 : 1;

        $up = $db->prepare('UPDATE settings SET voting_open = ? WHERE id = 1');
        $up->execute([$next]);

        jsonResponse([
            'success' => true,
            'votingOpen' => (bool)$next,
            'message' => $next ? 'تم فتح جلسة التصويت وعرض الأنشطة للأعضاء' : 'تم قفل وعزل الأنشطة عن الأعضاء بنجاح'
        ]);
    }

    public static function getSettings() {
        $db = Database::getInstance();
        $stmt = $db->query('SELECT * FROM settings WHERE id = 1');
        $row = $stmt->fetch() ?: [];
        jsonResponse(['success' => true, 'settings' => $row]);
    }

    public static function saveSettings() {
        requireAdmin();
        $input = getJsonInput();
        $db = Database::getInstance();

        $stmt = $db->prepare('UPDATE settings SET system_title = ?, system_subtitle = ?, logo_type = ?, logo_emoji = ?, logo_image = ?, google_webhook_url = ? WHERE id = 1');
        $stmt->execute([
            $input['system_title'] ?? 'نظام إدارة الأنشطة',
            $input['system_subtitle'] ?? 'وحدة التنمية المستدامة',
            $input['logo_type'] ?? 'emoji',
            $input['logo_emoji'] ?? '🏛️',
            $input['logo_image'] ?? '',
            $input['google_webhook_url'] ?? ''
        ]);

        jsonResponse(['success' => true, 'message' => 'تم حفظ الإعدادات بنجاح']);
    }

    public static function submitPublicActivity() {
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');

        if (!$name) {
            jsonResponse(['success' => false, 'message' => 'اسم النشاط حقل مطلوب'], 400);
        }

        $db = Database::getInstance();
        $cntStmt = $db->query('SELECT COUNT(*) as cnt FROM activities');
        $cnt = $cntStmt->fetch()['cnt'];

        $id = generateUuid();
        $seq = (string)($cnt + 1);
        $finalAttachment = $input['attachment'] ?? '';

        // Google Drive sync
        $driveRes = syncToGoogleDrive([
            'seq' => $seq,
            'name' => $name,
            'type' => $input['type'] ?? '',
            'idea' => $input['idea'] ?? '',
            'teamLeader' => $input['teamLeader'] ?? '',
            'affiliation' => $input['affiliation'] ?? '',
            'teamMembers' => $input['teamMembers'] ?? '',
            'specializations' => $input['specializations'] ?? '',
            'attachment' => $finalAttachment,
            'fileBase64' => $input['fileBase64'] ?? '',
            'fileName' => $input['fileName'] ?? '',
            'fileMimeType' => $input['fileMimeType'] ?? ''
        ]);

        if ($driveRes && !empty($driveRes['driveUrl'])) {
            $finalAttachment = $driveRes['driveUrl'];
        }

        $stmt = $db->prepare('INSERT INTO activities (id, seq, name, type, idea, team_leader, affiliation, team_members, specializations, attachment, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)');
        $stmt->execute([
            $id,
            $seq,
            $name,
            $input['type'] ?? '',
            $input['idea'] ?? '',
            $input['teamLeader'] ?? '',
            $input['affiliation'] ?? '',
            $input['teamMembers'] ?? '',
            $input['specializations'] ?? '',
            $finalAttachment
        ]);

        jsonResponse(['success' => true, 'message' => 'تم استلام النشاط بنجاح وإحالته للاعتماد', 'id' => $id], 201);
    }
}

