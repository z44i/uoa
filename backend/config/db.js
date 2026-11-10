const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database/voting_system.sqlite');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Initialize tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    seq TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT '',
    team_leader TEXT DEFAULT '',
    affiliation TEXT DEFAULT '',
    team_members TEXT DEFAULT '',
    attachment TEXT DEFAULT '',
    extra TEXT DEFAULT NULL,
    imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    reason TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (activity_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    system_title TEXT DEFAULT 'نظام إدارة الأنشطة',
    system_subtitle TEXT DEFAULT 'وحدة التنمية المستدامة',
    logo_type TEXT DEFAULT 'emoji',
    logo_emoji TEXT DEFAULT '🏛️',
    logo_image TEXT DEFAULT '',
    font_family TEXT DEFAULT 'ibm',
    google_webhook_url TEXT DEFAULT '',
    voting_open INTEGER DEFAULT 1,
    allow_vote_change INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Check and add google_webhook_url column if not exists
try {
  sqlite.prepare('ALTER TABLE settings ADD COLUMN google_webhook_url TEXT DEFAULT ""').run();
} catch (e) {
  // Column already exists
}

// Check and ensure voting_open column exists in settings
try {
  sqlite.prepare('ALTER TABLE settings ADD COLUMN voting_open INTEGER DEFAULT 1').run();
} catch (e) {
  // Column already exists
}

// Add design customization and short_code columns to forms table if not exists
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN short_code TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN header_color TEXT DEFAULT "#1e293b"').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN bg_color TEXT DEFAULT "#f1f5f9"').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN header_image TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN font_family TEXT DEFAULT "ibm"').run();
} catch (e) {}

// Check and ensure voting_open column exists in settings
try {
  sqlite.prepare('ALTER TABLE settings ADD COLUMN voting_open INTEGER DEFAULT 1').run();
} catch (e) {
  // Column already exists
}

// Add design customization and short_code columns to forms table if not exists
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN short_code TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN header_color TEXT DEFAULT "#1e293b"').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN bg_color TEXT DEFAULT "#f1f5f9"').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN header_image TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE forms ADD COLUMN font_family TEXT DEFAULT "ibm"').run();
} catch (e) {}

// Check and add google_webhook_url column if not exists
try {
  sqlite.prepare('ALTER TABLE settings ADD COLUMN google_webhook_url TEXT DEFAULT ""').run();
} catch (e) {
  // Column already exists
}

// Add respondent metadata columns to form_submissions if not exists
try {
  sqlite.prepare('ALTER TABLE form_submissions ADD COLUMN respondent_name TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE form_submissions ADD COLUMN respondent_email TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE form_submissions ADD COLUMN respondent_phone TEXT DEFAULT ""').run();
} catch (e) {}
try {
  sqlite.prepare('ALTER TABLE form_submissions ADD COLUMN respondent_org TEXT DEFAULT ""').run();
} catch (e) {}

// Insert default settings
const checkSettings = sqlite.prepare('SELECT id FROM settings WHERE id = 1').get();
if (!checkSettings) {
  sqlite.prepare(`
    INSERT INTO settings (id, system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family, voting_open, allow_vote_change)
    VALUES (1, 'نظام إدارة الأنشطة', 'وحدة التنمية المستدامة', 'emoji', '🏛️', '', 'ibm', 1, 0)
  `).run();
}

// Seed default admin if not exists
const checkAdmin = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!checkAdmin) {
  const hash = bcrypt.hashSync('admin123', 10);
  sqlite.prepare(`
    INSERT INTO users (id, name, username, password, role, active)
    VALUES (?, ?, ?, ?, 'admin', 1)
  `).run('admin-default-id-000000000001', 'المدير الرئيسي', 'admin', hash);
  console.log('👤 تم إنشاء حساب الأدمن الافتراضي: admin / admin123');
}

// Seed default sample member if not exists
const checkMember = sqlite.prepare('SELECT id FROM users WHERE username = ?').get('member1');
if (!checkMember) {
  const hash = bcrypt.hashSync('member123', 10);
  sqlite.prepare(`
    INSERT INTO users (id, name, username, password, role, active)
    VALUES (?, ?, ?, ?, 'member', 1)
  `).run('member-default-id-000000000001', 'عضو تجريبي', 'member1', hash);
}

// Wrapper to mimic mysql2/promise pool.query() interface: [rows, fields]
const pool = {
  async query(sql, params = []) {
    let cleanSql = sql.trim();
    cleanSql = cleanSql.replace(/CAST\s*\(\s*seq\s+AS\s+UNSIGNED\s*\)/gi, 'CAST(seq AS INTEGER)');
    cleanSql = cleanSql.replace(/"(member|admin|approve|reject)"/gi, "'$1'");

    // Translate MySQL ON DUPLICATE KEY UPDATE to SQLite ON CONFLICT DO UPDATE
    if (/ON\s+DUPLICATE\s+KEY\s+UPDATE/i.test(cleanSql)) {
      if (params.length === 7) {
        // system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family, google_webhook_url
        cleanSql = `
          INSERT INTO settings (id, system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family, google_webhook_url)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            system_title = excluded.system_title,
            system_subtitle = excluded.system_subtitle,
            logo_type = excluded.logo_type,
            logo_emoji = excluded.logo_emoji,
            logo_image = excluded.logo_image,
            font_family = excluded.font_family,
            google_webhook_url = excluded.google_webhook_url
        `;
      } else if (params.length === 6) {
        // system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family
        cleanSql = `
          INSERT INTO settings (id, system_title, system_subtitle, logo_type, logo_emoji, logo_image, font_family)
          VALUES (1, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            system_title = excluded.system_title,
            system_subtitle = excluded.system_subtitle,
            logo_type = excluded.logo_type,
            logo_emoji = excluded.logo_emoji,
            logo_image = excluded.logo_image,
            font_family = excluded.font_family
        `;
      } else {
        cleanSql = `
          INSERT INTO settings (id, system_title, system_subtitle, logo_type, logo_emoji, logo_image)
          VALUES (1, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            system_title = excluded.system_title,
            system_subtitle = excluded.system_subtitle,
            logo_type = excluded.logo_type,
            logo_emoji = excluded.logo_emoji,
            logo_image = excluded.logo_image
        `;
      }
    }

    const isSelect = /^SELECT\b/i.test(cleanSql);

    try {
      const stmt = sqlite.prepare(cleanSql);
      if (isSelect) {
        const rows = stmt.all(...params);
        return [rows, []];
      } else {
        const info = stmt.run(...params);
        return [{ affectedRows: info.changes, insertId: info.lastInsertRowid }, []];
      }
    } catch (err) {
      console.error('SQL Error:', err.message, 'Query:', cleanSql, 'Params:', params);
      throw err;
    }
  }
};

console.log('✅ تم تهيئة وتحديث قاعدة بيانات SQLite بنجاح');

module.exports = pool;
