<?php
// api/controllers/AuthController.php
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../utils/jwt.php';
require_once __DIR__ . '/../utils/helpers.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController {
    public static function login() {
        $input = getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';

        if (!$username || !$password) {
            jsonResponse(['success' => false, 'message' => 'اسم المستخدم وكلمة المرور مطلوبان'], 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT * FROM users WHERE username = ? AND active = 1');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['success' => false, 'message' => 'بيانات خاطئة أو الحساب موقوف'], 401);
        }

        // Support standard PHP password_verify (compatible with bcryptjs)
        $valid = password_verify($password, $user['password']);
        // If legacy bcrypt hash with $2b$, PHP password_verify supports it in PHP 7.4+ or replace prefix
        if (!$valid && strpos($user['password'], '$2b$') === 0) {
            $compatHash = '$2y$' . substr($user['password'], 4);
            $valid = password_verify($password, $compatHash);
        }

        if (!$valid) {
            jsonResponse(['success' => false, 'message' => 'بيانات خاطئة أو الحساب موقوف'], 401);
        }

        $token = JWT::encode(['id' => $user['id'], 'role' => $user['role']]);

        jsonResponse([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'username' => $user['username'],
                'role' => $user['role']
            ]
        ]);
    }

    public static function me() {
        $user = requireAuth();
        jsonResponse(['success' => true, 'user' => $user]);
    }

    public static function changePassword() {
        $user = requireAuth();
        $input = getJsonInput();
        $oldPass = $input['oldPassword'] ?? '';
        $newPass = $input['newPassword'] ?? '';

        if (!$oldPass || !$newPass) {
            jsonResponse(['success' => false, 'message' => 'جميع الحقول مطلوبة'], 400);
        }
        if (strlen($newPass) < 6) {
            jsonResponse(['success' => false, 'message' => 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'], 400);
        }

        $db = Database::getInstance();
        $stmt = $db->prepare('SELECT password FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $row = $stmt->fetch();

        $valid = password_verify($oldPass, $row['password']);
        if (!$valid && strpos($row['password'], '$2b$') === 0) {
            $compatHash = '$2y$' . substr($row['password'], 4);
            $valid = password_verify($oldPass, $compatHash);
        }

        if (!$valid) {
            jsonResponse(['success' => false, 'message' => 'كلمة المرور الحالية غير صحيحة'], 400);
        }

        $hashed = password_hash($newPass, PASSWORD_BCRYPT);
        $up = $db->prepare('UPDATE users SET password = ? WHERE id = ?');
        $up->execute([$hashed, $user['id']]);

        jsonResponse(['success' => true, 'message' => 'تم تغيير كلمة المرور بنجاح']);
    }
}

