-- ==============================================================
-- نظام إدارة الأنشطة والتصويت والاستمارات - جامعة الانبار
-- Database Schema for MySQL / MariaDB (cPanel & Data Center)
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `voting_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `voting_system`;

-- ─── 1. جدول المستخدمين (Users) ───
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'member') NOT NULL DEFAULT 'member',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. جدول الأنشطة (Activities) ───
CREATE TABLE IF NOT EXISTS `activities` (
  `id` VARCHAR(36) PRIMARY KEY,
  `seq` VARCHAR(20) NOT NULL,
  `name` VARCHAR(500) NOT NULL,
  `type` VARCHAR(200) DEFAULT '',
  `idea` TEXT DEFAULT NULL,
  `team_leader` VARCHAR(300) DEFAULT '',
  `affiliation` VARCHAR(300) DEFAULT '',
  `team_members` TEXT DEFAULT NULL,
  `specializations` TEXT DEFAULT NULL,
  `attachment` TEXT DEFAULT NULL,
  `extra` JSON DEFAULT NULL,
  `imported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. جدول التصويتات (Votes) ───
CREATE TABLE IF NOT EXISTS `votes` (
  `id` VARCHAR(36) PRIMARY KEY,
  `activity_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `vote` ENUM('approve', 'reject') NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_vote` (`activity_id`, `user_id`),
  FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. جدول الاستمارات (Forms) ───
CREATE TABLE IF NOT EXISTS `forms` (
  `id` VARCHAR(36) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `google_webhook_url` TEXT DEFAULT NULL,
  `short_code` VARCHAR(20) DEFAULT NULL,
  `header_color` VARCHAR(50) DEFAULT '#1e293b',
  `bg_color` VARCHAR(50) DEFAULT '#f1f5f9',
  `header_image` LONGTEXT DEFAULT NULL,
  `font_family` VARCHAR(50) DEFAULT 'ibm',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. أسئلة الاستمارات (Form Questions) ───
CREATE TABLE IF NOT EXISTS `form_questions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `form_id` VARCHAR(36) NOT NULL,
  `label` TEXT NOT NULL,
  `question_type` VARCHAR(50) NOT NULL DEFAULT 'text',
  `options` TEXT DEFAULT NULL,
  `is_required` TINYINT(1) DEFAULT 0,
  `sort_order` INT DEFAULT 0,
  FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. الردود والمشاركات (Form Submissions) ───
CREATE TABLE IF NOT EXISTS `form_submissions` (
  `id` VARCHAR(36) PRIMARY KEY,
  `form_id` VARCHAR(36) NOT NULL,
  `full_name` VARCHAR(255) DEFAULT '',
  `email` VARCHAR(255) DEFAULT '',
  `affiliation` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(100) DEFAULT '',
  `answers_json` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`form_id`) REFERENCES `forms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. جدول الإعدادات العامة (Settings) ───
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT PRIMARY KEY DEFAULT 1,
  `system_title` VARCHAR(300) DEFAULT 'نظام إدارة الأنشطة',
  `system_subtitle` VARCHAR(500) DEFAULT 'وحدة التنمية المستدامة',
  `logo_type` ENUM('emoji', 'image') DEFAULT 'emoji',
  `logo_emoji` VARCHAR(10) DEFAULT '🏛️',
  `logo_image` LONGTEXT DEFAULT NULL,
  `google_webhook_url` TEXT DEFAULT NULL,
  `voting_open` TINYINT(1) DEFAULT 1,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── البيانات الأولية الافتراضية ───
INSERT INTO `settings` (`id`, `system_title`, `system_subtitle`, `logo_type`, `logo_emoji`, `voting_open`)
VALUES (1, 'نظام إدارة الأنشطة', 'وحدة التنمية المستدامة', 'emoji', '🏛️', 1)
ON DUPLICATE KEY UPDATE `system_title` = VALUES(`system_title`);

-- المدير الافتراضي (اسم المستخدم: admin | كلمة المرور: admin123)
INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `active`)
VALUES (
  'admin-default-id-000000000001',
  'المدير الرئيسي',
  'admin',
  '$2y$10$YKp9H/VqI6WvJGy2YX3aDuB8zRTJvxJwXlP7k5mNcfP2iKnA3JlOO',
  'admin',
  1
)
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);
