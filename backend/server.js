require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const multer  = require('multer');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const pool    = require('./config/db');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ─── Setup Uploads Directory & Static Serving ───
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

// Helper function to sync activity & files to Google Drive / Sheets
async function syncToGoogleDrive(payload) {
  try {
    const [rows] = await pool.query('SELECT google_webhook_url FROM settings WHERE id = 1');
    const webhookUrl = rows && rows[0] && rows[0].google_webhook_url;
    if (!webhookUrl || !webhookUrl.startsWith('http')) {
      return null;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Google Drive Sync Error (silently ignored):', err.message);
    return null;
  }
}

// Upload API Route
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'لم يتم اختيار أي ملف' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    success: true,
    fileUrl,
    filename: req.file.originalname,
    size: req.file.size
  });
});

// ─── Public Submit Activity Route (For the form /submit) ───
app.post('/api/public/submit-activity', async (req, res) => {
  const { name, type, idea, teamLeader, affiliation, teamMembers, specializations, attachment, fileBase64, fileName, fileMimeType } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: 'اسم النشاط حقل مطلوب' });
  }

  try {
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM activities');
    const id = uuidv4();
    const seq = String(count[0].cnt + 1);

    let finalAttachment = attachment || '';

    // Async Google Drive sync
    syncToGoogleDrive({
      seq,
      name: name.trim(),
      type: type || '',
      idea: idea || '',
      teamLeader: teamLeader || '',
      affiliation: affiliation || '',
      teamMembers: teamMembers || '',
      specializations: specializations || '',
      attachment: finalAttachment,
      fileBase64: fileBase64 || '',
      fileName: fileName || '',
      fileMimeType: fileMimeType || ''
    }).then(driveRes => {
      if (driveRes && driveRes.driveUrl) {
        pool.query('UPDATE activities SET attachment = ? WHERE id = ?', [driveRes.driveUrl, id]).catch(()=>{});
      }
    }).catch(()=>{});

    await pool.query(
      `INSERT INTO activities (id, seq, name, type, idea, team_leader, affiliation, team_members, specializations, attachment, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, seq, name.trim(), type || '', idea || '', teamLeader || '', affiliation || '',
       teamMembers || '', specializations || '', finalAttachment, null]
    );

    res.status(201).json({ success: true, message: 'تم استلام النشاط بنجاح وإحالته للاعتماد', id });
  } catch (err) {
    console.error('Submit activity error:', err);
    res.status(500).json({ success: false, message: 'حدث خطأ في السيرفر أثناء تسجيل النشاط' });
  }
});

// ─── Public Forms API (Get public form definition and submit answers) ───
const formCtrl = require('./controllers/formController');
app.get('/api/public/forms/:id', async (req, res) => {
  try {
    const param = req.params.id;
    // Support lookup by UUID or short_code
    const [forms] = await pool.query('SELECT * FROM forms WHERE id = ? OR short_code = ?', [param, param]);
    if (!forms.length) return res.status(404).json({ success: false, message: 'الاستمارة غير موجودة' });
    const form = forms[0];
    const [questions] = await pool.query('SELECT id, label, question_type, options, is_required, sort_order FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC', [form.id]);
    res.json({ success: true, form, questions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
});
app.post('/api/public/forms/:id/submit', formCtrl.submitPublicForm);

// ─── Backup Database Route ───
app.get('/api/backup-db', (req, res) => {
  const dbFile = path.join(__dirname, '../database/voting_system.sqlite');
  if (fs.existsSync(dbFile)) {
    res.download(dbFile, `backup_voting_system_${new Date().toISOString().slice(0, 10)}.sqlite`);
  } else {
    res.status(404).json({ success: false, message: 'ملف قاعدة البيانات غير موجود' });
  }
});

// ─── API Routes ───
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/votes',      require('./routes/votes'));
app.use('/api/forms',      require('./routes/forms'));

// ─── Direct Routes to Public Pages ───
const frontendPath = path.join(__dirname, '../frontend');
app.get('/submit', (req, res) => {
  res.sendFile(path.join(frontendPath, 'submit.html'));
});
app.get('/f/:id', (req, res) => {
  res.sendFile(path.join(frontendPath, 'view-form.html'));
});
app.get('/s/:code', (req, res) => {
  res.sendFile(path.join(frontendPath, 'view-form.html'));
});

// ─── Serve Frontend ───
app.use(express.static(frontendPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ─── Error Handler ───
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏛️  نظام إدارة الأنشطة والتصويت والاستمارات - جامعة الانبار`);
  console.log(`🚀 السيرفر يعمل على: http://localhost:${PORT}`);
  console.log(`📝 استمارة التقديم على: http://localhost:${PORT}/submit`);
  console.log(`📋 منشئ الاستمارات المتعددة: http://localhost:${PORT}/f/:id`);
  console.log(`📁 البيئة: ${process.env.NODE_ENV || 'development'}\n`);
});
