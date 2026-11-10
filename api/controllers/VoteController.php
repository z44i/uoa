<?php
// api/controllers/VoteController.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../middleware/auth.php';

class VoteController {
    public static function index() {
        $user = requireAuth();
        $db = Database::getInstance();

        if ($user['role'] === 'admin') {
            $stmt = $db->query('SELECT v.*, u.name as user_name FROM votes v JOIN users u ON v.user_id = u.id');
        } else {
            $stmt = $db->prepare('SELECT * FROM votes WHERE user_id = ?');
            $stmt->execute([$user['id']]);
        }
        $votes = $stmt->fetchAll();

        jsonResponse(['success' => true, 'votes' => $votes]);
    }

    public static function cast() {
        $user = requireAuth();
        if ($user['role'] === 'admin') {
            jsonResponse(['success' => false, 'message' => 'مدير النظام ليس لديه صلاحية التصويت، التصويت مخصص للأعضاء فقط'], 403);
        }

        $input = getJsonInput();
        $actId = $input['activityId'] ?? '';
        $vote = $input['vote'] ?? '';
        $reason = trim($input['reason'] ?? '');

        if (!$actId || !$vote) {
            jsonResponse(['success' => false, 'message' => 'النشاط ونوع التصويت مطلوبان'], 400);
        }
        if (!in_array($vote, ['approve', 'reject'])) {
            jsonResponse(['success' => false, 'message' => 'نوع التصويت غير صحيح'], 400);
        }
        if ($vote === 'reject' && !$reason) {
            jsonResponse(['success' => false, 'message' => 'سبب الرفض مطلوب'], 400);
        }

        $db = Database::getInstance();
        // Check activity
        $actStmt = $db->prepare('SELECT id FROM activities WHERE id = ?');
        $actStmt->execute([$actId]);
        if (!$actStmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'النشاط غير موجود'], 404);
        }

        // Check not already voted
        $vStmt = $db->prepare('SELECT id FROM votes WHERE activity_id = ? AND user_id = ?');
        $vStmt->execute([$actId, $user['id']]);
        if ($vStmt->fetch()) {
            jsonResponse(['success' => false, 'message' => 'صوّتت على هذا النشاط مسبقاً'], 409);
        }

        $id = generateUuid();
        $ins = $db->prepare('INSERT INTO votes (id, activity_id, user_id, vote, reason) VALUES (?, ?, ?, ?, ?)');
        $ins->execute([$id, $actId, $user['id'], $vote, $reason]);

        jsonResponse(['success' => true, 'message' => 'تم تسجيل تصويتك', 'id' => $id], 201);
    }

    public static function update($id) {
        $user = requireAuth();
        $input = getJsonInput();
        $vote = $input['vote'] ?? '';
        $reason = trim($input['reason'] ?? '');

        if (!in_array($vote, ['approve', 'reject'])) {
            jsonResponse(['success' => false, 'message' => 'نوع التصويت غير صحيح'], 400);
        }
        if ($vote === 'reject' && !$reason) {
            jsonResponse(['success' => false, 'message' => 'سبب الرفض مطلوب'], 400);
        }

        $db = Database::getInstance();
        $vStmt = $db->prepare('SELECT * FROM votes WHERE id = ?');
        $vStmt->execute([$id]);
        $row = $vStmt->fetch();

        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'التصويت غير موجود'], 404);
        }
        if ($row['user_id'] !== $user['id'] && $user['role'] !== 'admin') {
            jsonResponse(['success' => false, 'message' => 'لا يمكنك تعديل تصويت شخص آخر'], 403);
        }

        $up = $db->prepare('UPDATE votes SET vote = ?, reason = ? WHERE id = ?');
        $up->execute([$vote, ($vote === 'reject' ? $reason : ''), $id]);

        jsonResponse(['success' => true, 'message' => 'تم تعديل التصويت']);
    }
}

