<?php
// api/middleware/auth.php
require_once __DIR__ . '/../utils/jwt.php';
require_once __DIR__ . '/../config/db.php';

function getAuthUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (!$authHeader && isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    }

    if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        return null;
    }

    $token = $matches[1];
    $decoded = JWT::decode($token);
    if (!$decoded || !isset($decoded['id'])) {
        return null;
    }

    $db = Database::getInstance();
    $stmt = $db->prepare('SELECT id, name, username, role, active FROM users WHERE id = ? AND active = 1');
    $stmt->execute([$decoded['id']]);
    $user = $stmt->fetch();

    return $user ?: null;
}

function requireAuth() {
    $user = getAuthUser();
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'جلسة الدخول منتهية أو غير صالحة']);
        exit;
    }
    return $user;
}

function requireAdmin() {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'غير مصرح - صلاحيات المدير مطلوبة']);
        exit;
    }
    return $user;
}

