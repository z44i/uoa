<?php
// api/controllers/FormController.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../middleware/auth.php';

class FormController {
    public static function index() {
        requireAdmin();
        $db = Database::getInstance();

        $stmt = $db->query('SELECT * FROM forms ORDER BY created_at DESC');
        $forms = $stmt->fetchAll();

        $subStmt = $db->query('SELECT form_id, COUNT(*) as cnt FROM form_submissions GROUP BY form_id');
        $subs = $subStmt->fetchAll();
        $subMap = [];
        foreach ($subs as $s) {
            $subMap[$s['form_id']] = (int)$s['cnt'];
        }

        $result = array_map(function($f) use ($subMap) {
            return array_merge($f, [
                'submissionCount' => $subMap[$f['id']] ?? 0
            ]);
        }, $forms);

        jsonResponse(['success' => true, 'forms' => $result]);
    }

    public static function getById($id) {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM forms WHERE id = ?');
        $stmt->execute([$id]);
        $form = $stmt->fetch();

        if (!$form) {
            jsonResponse(['success' => false, 'message' => 'الاستمارة غير موجودة'], 404);
        }

        $qStmt = $db->prepare('SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC');
        $qStmt->execute([$id]);
        $questions = $qStmt->fetchAll();

        jsonResponse(['success' => true, 'form' => $form, 'questions' => $questions]);
    }

    public static function create() {
        requireAdmin();
        $input = getJsonInput();
        $title = trim($input['title'] ?? '');

        if (!$title) {
            jsonResponse(['success' => false, 'message' => 'عنوان الاستمارة مطلوب'], 400);
        }

        $db = Database::getInstance();
        $formId = generateUuid();
        $shortCode = substr(md5(uniqid(mt_rand(), true)), 0, 5);

        $stmt = $db->prepare('INSERT INTO forms (id, title, description, google_webhook_url, short_code, header_color, bg_color, header_image, font_family, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
        $stmt->execute([
            $formId,
            $title,
            $input['description'] ?? '',
            $input['google_webhook_url'] ?? '',
            $shortCode,
            $input['header_color'] ?? '#1e293b',
            $input['bg_color'] ?? '#f1f5f9',
            $input['header_image'] ?? '',
            $input['font_family'] ?? 'ibm'
        ]);

        $questions = $input['questions'] ?? [];
        $order = 1;
        $qStmt = $db->prepare('INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');

        foreach ($questions as $q) {
            $label = trim($q['label'] ?? '');
            if (!$label) continue;
            $qId = generateUuid();
            $qStmt->execute([
                $qId,
                $formId,
                $label,
                $q['question_type'] ?? 'text',
                $q['options'] ?? '',
                !empty($q['is_required']) ? 1 : 0,
                $order++
            ]);
        }

        jsonResponse(['success' => true, 'message' => 'تم إنشاء الاستمارة بنجاح', 'formId' => $formId, 'shortCode' => $shortCode], 201);
    }

    public static function update($id) {
        requireAdmin();
        $input = getJsonInput();
        $title = trim($input['title'] ?? '');

        if (!$title) {
            jsonResponse(['success' => false, 'message' => 'عنوان الاستمارة مطلوب'], 400);
        }

        $db = Database::getInstance();
        $chk = $db->prepare('SELECT short_code FROM forms WHERE id = ?');
        $chk->execute([$id]);
        $row = $chk->fetch();
        $shortCode = ($row && !empty($row['short_code'])) ? $row['short_code'] : substr(md5(uniqid(mt_rand(), true)), 0, 5);

        $stmt = $db->prepare('UPDATE forms SET title = ?, description = ?, google_webhook_url = ?, short_code = ?, is_active = ?, header_color = ?, bg_color = ?, header_image = ?, font_family = ? WHERE id = ?');
        $stmt->execute([
            $title,
            $input['description'] ?? '',
            $input['google_webhook_url'] ?? '',
            $shortCode,
            isset($input['is_active']) ? (int)$input['is_active'] : 1,
            $input['header_color'] ?? '#1e293b',
            $input['bg_color'] ?? '#f1f5f9',
            $input['header_image'] ?? '',
            $input['font_family'] ?? 'ibm',
            $id
        ]);

        // Re-create questions
        $del = $db->prepare('DELETE FROM form_questions WHERE form_id = ?');
        $del->execute([$id]);

        $questions = $input['questions'] ?? [];
        $order = 1;
        $qStmt = $db->prepare('INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');

        foreach ($questions as $q) {
            $label = trim($q['label'] ?? '');
            if (!$label) continue;
            $qId = generateUuid();
            $qStmt->execute([
                $qId,
                $id,
                $label,
                $q['question_type'] ?? 'text',
                $q['options'] ?? '',
                !empty($q['is_required']) ? 1 : 0,
                $order++
            ]);
        }

        jsonResponse(['success' => true, 'message' => 'تم حفظ تعديلات الاستمارة بنجاح']);
    }

    public static function toggleActive($id) {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT is_active FROM forms WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonResponse(['success' => false, 'message' => 'الاستمارة غير موجودة'], 404);

        $next = $row['is_active'] ? 0 : 1;
        $up = $db->prepare('UPDATE forms SET is_active = ? WHERE id = ?');
        $up->execute([$next, $id]);

        jsonResponse(['success' => true, 'is_active' => (bool)$next]);
    }

    public static function duplicate($id) {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM forms WHERE id = ?');
        $stmt->execute([$id]);
        $f = $stmt->fetch();
        if (!$f) jsonResponse(['success' => false, 'message' => 'الاستمارة الأصلية غير موجودة'], 404);

        $newId = generateUuid();
        $newShort = substr(md5(uniqid(mt_rand(), true)), 0, 5);

        $ins = $db->prepare('INSERT INTO forms (id, title, description, google_webhook_url, short_code, header_color, bg_color, header_image, font_family, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
        $ins->execute([
            $newId,
            $f['title'] . ' (نسخة)',
            $f['description'] ?? '',
            $f['google_webhook_url'] ?? '',
            $newShort,
            $f['header_color'] ?? '#1e293b',
            $f['bg_color'] ?? '#f1f5f9',
            $f['header_image'] ?? '',
            $f['font_family'] ?? 'ibm'
        ]);

        $qStmt = $db->prepare('SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC');
        $qStmt->execute([$id]);
        $questions = $qStmt->fetchAll();

        $insQ = $db->prepare('INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)');
        foreach ($questions as $q) {
            $insQ->execute([
                generateUuid(),
                $newId,
                $q['label'],
                $q['question_type'],
                $q['options'],
                $q['is_required'],
                $q['sort_order']
            ]);
        }

        jsonResponse(['success' => true, 'message' => 'تم نسخ الاستمارة بنجاح']);
    }

    public static function delete($id) {
        requireAdmin();
        $db = Database::getInstance();
        $db->prepare('DELETE FROM form_submissions WHERE form_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM form_questions WHERE form_id = ?')->execute([$id]);
        $db->prepare('DELETE FROM forms WHERE id = ?')->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'تم حذف الاستمارة']);
    }

    public static function getSubmissions($id) {
        requireAdmin();
        $db = Database::getInstance();
        $fStmt = $db->prepare('SELECT * FROM forms WHERE id = ?');
        $fStmt->execute([$id]);
        $form = $fStmt->fetch();
        if (!$form) jsonResponse(['success' => false, 'message' => 'الاستمارة غير موجودة'], 404);

        $qStmt = $db->prepare('SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC');
        $qStmt->execute([$id]);
        $questions = $qStmt->fetchAll();

        $sStmt = $db->prepare('SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at DESC');
        $sStmt->execute([$id]);
        $submissions = $sStmt->fetchAll();

        $parsedSubs = array_map(function($s) {
            $ans = json_decode($s['answers_json'], true) ?: [];
            return [
                'id' => $s['id'],
                'full_name' => $s['full_name'] ?? '',
                'email' => $s['email'] ?? '',
                'affiliation' => $s['affiliation'] ?? '',
                'phone' => $s['phone'] ?? '',
                'answers' => $ans,
                'created_at' => $s['created_at']
            ];
        }, $submissions);

        jsonResponse(['success' => true, 'form' => $form, 'questions' => $questions, 'submissions' => $parsedSubs]);
    }

    public static function convertSubmissionToActivity($subId) {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM form_submissions WHERE id = ?');
        $stmt->execute([$subId]);
        $sub = $stmt->fetch();
        if (!$sub) jsonResponse(['success' => false, 'message' => 'الرد غير موجود'], 404);

        $cntStmt = $db->query('SELECT COUNT(*) as cnt FROM activities');
        $cnt = (int)$cntStmt->fetch()['cnt'];

        $answers = json_decode($sub['answers_json'], true) ?: [];
        $id = generateUuid();
        $seq = (string)($cnt + 1);

        $name = $sub['full_name'] ? "نشاط مقدم من: " . $sub['full_name'] : "نشاط رقم " . $seq;
        $affiliation = $sub['affiliation'] ?? '';
        $attachment = '';
        $idea = '';

        foreach ($answers as $lbl => $val) {
            if (is_string($val) && (strpos($val, 'http') === 0 || strpos($val, '/uploads/') === 0)) {
                $attachment = $val;
            } else if (is_string($val) && strlen($val) > 20 && empty($idea)) {
                $idea = $val;
            }
        }

        $ins = $db->prepare('INSERT INTO activities (id, seq, name, type, idea, team_leader, affiliation, team_members, attachment, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $ins->execute([
            $id,
            $seq,
            $name,
            'استمارة إلكترونية',
            $idea,
            $sub['full_name'] ?? '',
            $affiliation,
            $sub['phone'] ? "هاتف: " . $sub['phone'] : '',
            $attachment,
            json_encode($answers, JSON_UNESCAPED_UNICODE)
        ]);

        jsonResponse(['success' => true, 'message' => 'تم ترحيل الرد كنشاط للتصويت بنجاح', 'activityId' => $id]);
    }

    public static function getPublicForm($param) {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM forms WHERE id = ? OR short_code = ?');
        $stmt->execute([$param, $param]);
        $form = $stmt->fetch();

        if (!$form) {
            jsonResponse(['success' => false, 'message' => 'الاستمارة غير موجودة'], 404);
        }

        $qStmt = $db->prepare('SELECT id, label, question_type, options, is_required, sort_order FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC');
        $qStmt->execute([$form['id']]);
        $questions = $qStmt->fetchAll();

        jsonResponse(['success' => true, 'form' => $form, 'questions' => $questions]);
    }

    public static function submitPublicForm($param) {
        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM forms WHERE id = ? OR short_code = ?');
        $stmt->execute([$param, $param]);
        $form = $stmt->fetch();

        if (!$form) {
            jsonResponse(['success' => false, 'message' => 'الاستمارة غير موجودة'], 404);
        }
        if (!$form['is_active']) {
            jsonResponse(['success' => false, 'message' => 'هذه الاستمارة متوقفة حالياً ولا تستقبل ردوداً جديدة'], 403);
        }

        $input = getJsonInput();
        $answers = $input['answers'] ?? [];
        $fullName = trim($input['fullName'] ?? '');
        $email = trim($input['email'] ?? '');
        $affiliation = trim($input['affiliation'] ?? '');
        $phone = trim($input['phone'] ?? '');

        if (!$fullName || !$email) {
            jsonResponse(['success' => false, 'message' => 'الاسم والبريد الإلكتروني حقول أساسية مطلوبة'], 400);
        }

        $subId = generateUuid();
        $ins = $db->prepare('INSERT INTO form_submissions (id, form_id, full_name, email, affiliation, phone, answers_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $ins->execute([
            $subId,
            $form['id'],
            $fullName,
            $email,
            $affiliation,
            $phone,
            json_encode($answers, JSON_UNESCAPED_UNICODE)
        ]);

        // Sync to Webhook if present
        $targetWebhook = !empty($form['google_webhook_url']) ? $form['google_webhook_url'] : null;
        if (!$targetWebhook) {
            $sStmt = $db->query('SELECT google_webhook_url FROM settings WHERE id = 1');
            $sRow = $sStmt->fetch();
            $targetWebhook = $sRow['google_webhook_url'] ?? '';
        }

        if ($targetWebhook && strpos($targetWebhook, 'http') === 0) {
            $payload = [
                'form_title' => $form['title'],
                'fullName' => $fullName,
                'email' => $email,
                'affiliation' => $affiliation,
                'phone' => $phone,
                'answers' => $answers,
                'submitted_at' => date('Y-m-d H:i:s')
            ];
            try {
                $ch = curl_init($targetWebhook);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_exec($ch);
                curl_close($ch);
            } catch (Exception $e) {}
        }

        jsonResponse(['success' => true, 'message' => 'تم إرسال إجابتك بنجاح', 'id' => $subId]);
    }
}

