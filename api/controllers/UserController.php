<?php
// api/controllers/UserController.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../middleware/auth.php';

class UserController {
    public static function index() {
        requireAdmin();
        $db = Database::getInstance();

        $stmt = $db->query('SELECT id, name, username, role, active, created_at FROM users ORDER BY role DESC, created_at ASC');
        $users = $stmt->fetchAll();

        // Vote counts
        $vStmt = $db->query('SELECT user_id, COUNT(*) as cnt FROM votes GROUP BY user_id');
        $votes = $vStmt->fetchAll();
        $voteMap = [];
        foreach ($votes as $v) {
            $voteMap[$v['user_id']] = (int)$v['cnt'];
        }

        $cntStmt = $db->query('SELECT COUNT(*) as cnt FROM activities');
        $totalActs = (int)$cntStmt->fetch()['cnt'];

        $result = array_map(function($u) use ($voteMap, $totalActs) {
            return array_merge($u, [
                'voteCount' => $voteMap[$u['id']] ?? 0,
                'totalActivities' => $totalActs
            ]);
        }, $users);

        jsonResponse(['success' => true, 'users' => $result]);
    }

    public static function create() {
        requireAdmin();
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'member';

        if (!$name || !$username || !$password) {
            jsonResponse(['success' => false, 'message' => 'الاسم واسم المستخدم وكلمة المرور مطلوبة'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'], 400);
        }

        $db = Database::getInstance();
        $chk = $db->prepare('SELECT id FROM users WHERE username = ?');
        $chk->execute([$username]);
        if ($chk->fetch()) {
            jsonResponse(['success' => false, 'message' => 'اسم المستخدم مستخدم مسبقاً'], 409);
        }

        $hashed = password_hash($password, PASSWORD_BCRYPT);
        $id = generateUuid();

        $stmt = $db->prepare('INSERT INTO users (id, name, username, password, role, active) VALUES (?, ?, ?, ?, ?, 1)');
        $stmt->execute([$id, $name, $username, $hashed, $role]);

        jsonResponse(['success' => true, 'message' => 'تم إنشاء الحساب بنجاح', 'id' => $id], 201);
    }

    public static function update($id) {
        requireAdmin();
        $input = getJsonInput();
        $name = trim($input['name'] ?? '');
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$name || !$username) {
            jsonResponse(['success' => false, 'message' => 'الاسم واسم المستخدم مطلوبان'], 400);
        }

        $db = Database::getInstance();
        $chk = $db->prepare('SELECT id FROM users WHERE username = ? AND id != ?');
        $chk->execute([$username, $id]);
        if ($chk->fetch()) {
            jsonResponse(['success' => false, 'message' => 'اسم المستخدم مستخدم من قِبل مستخدم آخر'], 409);
        }

        if ($password) {
            if (strlen($password) < 6) {
                jsonResponse(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'], 400);
            }
            $hashed = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $db->prepare('UPDATE users SET name = ?, username = ?, password = ? WHERE id = ?');
            $stmt->execute([$name, $username, $hashed, $id]);
        } else {
            $stmt = $db->prepare('UPDATE users SET name = ?, username = ? WHERE id = ?');
            $stmt->execute([$name, $username, $id]);
        }

        jsonResponse(['success' => true, 'message' => 'تم التعديل بنجاح']);
    }

    public static function toggle($id) {
        requireAdmin();
        $db = Database::getInstance();

        $stmt = $db->prepare('SELECT active FROM users WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            jsonResponse(['success' => false, 'message' => 'المستخدم غير موجود'], 404);
        }

        $next = $row['active'] ? 0 : 1;
        $up = $db->prepare('UPDATE users SET active = ? WHERE id = ?');
        $up->execute([$next, $id]);

        jsonResponse(['success' => true, 'message' => $next ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب', 'active' => (bool)$next]);
    }

    public static function delete($id) {
        requireAdmin();
        $db = Database::getInstance();
        $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute([$id]);
        jsonResponse(['success' => true, 'message' => 'تم حذف المستخدم']);
    }
}

