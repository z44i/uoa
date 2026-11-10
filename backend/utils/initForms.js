const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../database/voting_system.sqlite');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    google_webhook_url TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS form_questions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    label TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'text',
    options TEXT DEFAULT '',
    is_required INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS form_submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
  );
`);

console.log('✅ تم إنشاء جداول منشئ الاستمارات (Forms Builder) بنجاح');

