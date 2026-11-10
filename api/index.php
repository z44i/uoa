<?php
// api/index.php
// Main API Router for PHP Backend

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/utils/helpers.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ActivityController.php';
require_once __DIR__ . '/controllers/VoteController.php';
require_once __DIR__ . '/controllers/UserController.php';
require_once __DIR__ . '/controllers/FormController.php';
require_once __DIR__ . '/controllers/UploadController.php';

// Parse Request URI
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$basePath = parse_url($requestUri, PHP_URL_PATH);

// Normalize path: strip prefix if nested under subfolder like /voting-system
if (preg_match('#(?:/api)?/(.*)$#', $basePath, $matches) && strpos($basePath, '/api') !== false) {
    $path = '/' . $matches[1];
} else {
    $path = $basePath;
}
$path = rtrim($path, '/');
if (empty($path)) $path = '/';

$method = $_SERVER['REQUEST_METHOD'];

// ─── Routing ───

// Auth
if ($method === 'POST' && $path === '/auth/login') {
    AuthController::login();
}
if ($method === 'GET' && $path === '/auth/me') {
    AuthController::me();
}
if ($method === 'POST' && $path === '/auth/change-password') {
    AuthController::changePassword();
}

// Upload
if ($method === 'POST' && $path === '/upload') {
    UploadController::handle();
}

// Public Form & Submit
if ($method === 'POST' && $path === '/public/submit-activity') {
    ActivityController::submitPublicActivity();
}
if ($method === 'GET' && preg_match('#^/public/forms/([^/]+)$#', $path, $m)) {
    FormController::getPublicForm($m[1]);
}
if ($method === 'POST' && preg_match('#^/public/forms/([^/]+)/submit$#', $path, $m)) {
    FormController::submitPublicForm($m[1]);
}

// Activities
if ($path === '/activities') {
    if ($method === 'GET') ActivityController::index();
    if ($method === 'POST') ActivityController::create();
}
if ($method === 'POST' && $path === '/activities/bulk') {
    ActivityController::bulkImport();
}
if ($method === 'DELETE' && $path === '/activities/reset-all') {
    ActivityController::resetAll();
}
if ($method === 'DELETE' && $path === '/activities/reset-votes') {
    ActivityController::resetVotesOnly();
}
if ($method === 'POST' && $path === '/activities/toggle-voting') {
    ActivityController::toggleVoting();
}
if ($path === '/activities/settings') {
    if ($method === 'GET') ActivityController::getSettings();
    if ($method === 'PUT') ActivityController::saveSettings();
}
if (preg_match('#^/activities/([^/]+)$#', $path, $m)) {
    if ($method === 'PUT') ActivityController::update($m[1]);
    if ($method === 'DELETE') ActivityController::delete($m[1]);
}

// Votes
if ($path === '/votes') {
    if ($method === 'GET') VoteController::index();
    if ($method === 'POST') VoteController::cast();
}
if ($method === 'PUT' && preg_match('#^/votes/([^/]+)$#', $path, $m)) {
    VoteController::update($m[1]);
}

// Users
if ($path === '/users') {
    if ($method === 'GET') UserController::index();
    if ($method === 'POST') UserController::create();
}
if (preg_match('#^/users/([^/]+)/toggle$#', $path, $m)) {
    if ($method === 'PATCH' || $method === 'POST') UserController::toggle($m[1]);
}
if (preg_match('#^/users/([^/]+)$#', $path, $m)) {
    if ($method === 'PUT') UserController::update($m[1]);
    if ($method === 'DELETE') UserController::delete($m[1]);
}

// Forms Builder
if ($path === '/forms') {
    if ($method === 'GET') FormController::index();
    if ($method === 'POST') FormController::create();
}
if (preg_match('#^/forms/([^/]+)/toggle$#', $path, $m)) {
    if ($method === 'PATCH' || $method === 'POST') FormController::toggleActive($m[1]);
}
if ($method === 'POST' && preg_match('#^/forms/([^/]+)/duplicate$#', $path, $m)) {
    FormController::duplicate($m[1]);
}
if ($method === 'GET' && preg_match('#^/forms/([^/]+)/submissions$#', $path, $m)) {
    FormController::getSubmissions($m[1]);
}
if ($method === 'POST' && preg_match('#^/forms/submissions/([^/]+)/to-activity$#', $path, $m)) {
    FormController::convertSubmissionToActivity($m[1]);
}
if (preg_match('#^/forms/([^/]+)$#', $path, $m)) {
    if ($method === 'GET') FormController::getById($m[1]);
    if ($method === 'PUT') FormController::update($m[1]);
    if ($method === 'DELETE') FormController::delete($m[1]);
}

// Backup DB
if ($method === 'GET' && $path === '/backup-db') {
    $dbFile = __DIR__ . '/../database/voting_system.sqlite';
    if (file_exists($dbFile)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="backup_' . date('Y-m-d') . '.sqlite"');
        readfile($dbFile);
        exit;
    }
}

// 404 Fallback
jsonResponse(['success' => false, 'message' => 'المسار البرمجي غير موجود', 'path' => $path], 404);

