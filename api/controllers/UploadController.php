<?php
// api/controllers/UploadController.php
require_once __DIR__ . '/../utils/helpers.php';

class UploadController {
    public static function handle() {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['success' => false, 'message' => 'لم يتم اختيار أي ملف أو حدث خطأ أثناء الرفع'], 400);
        }

        $file = $_FILES['file'];
        $maxBytes = 35 * 1024 * 1024; // 35MB
        if ($file['size'] > $maxBytes) {
            jsonResponse(['success' => false, 'message' => 'حجم الملف يتجاوز الحد المسموح به (35MB)'], 400);
        }

        $uploadsDir = __DIR__ . '/../../uploads';
        if (!is_dir($uploadsDir)) {
            mkdir($uploadsDir, 0777, true);
        }

        $origName = basename($file['name']);
        $ext = pathinfo($origName, PATHINFO_EXTENSION);
        $uniqueName = 'file-' . time() . '-' . mt_rand(100000, 999999) . ($ext ? '.' . $ext : '');
        $destPath = $uploadsDir . '/' . $uniqueName;

        if (move_uploaded_file($file['tmp_name'], $destPath)) {
            jsonResponse([
                'success' => true,
                'fileUrl' => '/uploads/' . $uniqueName,
                'filename' => $origName,
                'size' => $file['size']
            ]);
        } else {
            jsonResponse(['success' => false, 'message' => 'فشل حفظ الملف على السيرفر'], 500);
        }
    }
}

