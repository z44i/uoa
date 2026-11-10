// backend/controllers/formController.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

// GET /api/forms (List all forms for admin)
async function getForms(req, res) {
  try {
    const [forms] = await pool.query('SELECT * FROM forms ORDER BY created_at DESC');
    const [subs] = await pool.query('SELECT form_id, COUNT(*) as cnt FROM form_submissions GROUP BY form_id');
    const subMap = {};
    subs.forEach(s => subMap[s.form_id] = s.cnt);

    const result = forms.map(f => ({
      ...f,
      submissionCount: subMap[f.id] || 0
    }));

    res.json({ success: true, forms: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الاستمارات' });
  }
}

// GET /api/forms/:id (Get form details with questions)
async function getFormById(req, res) {
  const { id } = req.params;
  try {
    const [forms] = await pool.query('SELECT * FROM forms WHERE id = ?', [id]);
    if (!forms.length) {
      return res.status(404).json({ success: false, message: 'الاستمارة غير موجودة' });
    }
    const [questions] = await pool.query('SELECT * FROM form_questions WHERE form_id = ? ORDER BY sort_order ASC', [id]);
    res.json({ success: true, form: forms[0], questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في جلب بيانات الاستمارة' });
  }
}

// POST /api/forms (Create new form)
async function createForm(req, res) {
  const { title, description, google_webhook_url, header_color, bg_color, header_image, font_family, questions = [] } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الاستمارة مطلوب' });
  }

  try {
    const formId = uuidv4();
    // Generate a sleek short code for the form: 5 alphanumeric chars
    const shortCode = Math.random().toString(36).substring(2, 7);

    await pool.query(
      `INSERT INTO forms (id, title, description, google_webhook_url, short_code, header_color, bg_color, header_image, font_family, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        formId,
        title.trim(),
        description || '',
        google_webhook_url || '',
        shortCode,
        header_color || '#1e293b',
        bg_color || '#f1f5f9',
        header_image || '',
        font_family || 'ibm'
      ]
    );

    let order = 1;
    for (const q of questions) {
      if (!q.label || !q.label.trim()) continue;
      const qId = uuidv4();
      await pool.query(
        `INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [qId, formId, q.label.trim(), q.question_type || 'text', q.options || '', q.is_required ? 1 : 0, order++]
      );
    }

    res.status(201).json({ success: true, message: 'تم إنشاء الاستمارة بنجاح', formId, shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ أثناء إنشاء الاستمارة' });
  }
}

// PUT /api/forms/:id (Update form & questions)
async function updateForm(req, res) {
  const { id } = req.params;
  const { title, description, google_webhook_url, is_active, header_color, bg_color, header_image, font_family, questions = [] } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'عنوان الاستمارة مطلوب' });
  }

  try {
    // Get existing to preserve short_code
    const [exist] = await pool.query('SELECT short_code FROM forms WHERE id = ?', [id]);
    let shortCode = (exist.length && exist[0].short_code) ? exist[0].short_code : Math.random().toString(36).substring(2, 7);

    await pool.query(
      `UPDATE forms SET title = ?, description = ?, google_webhook_url = ?, is_active = ?, short_code = ?, header_color = ?, bg_color = ?, header_image = ?, font_family = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title.trim(),
        description || '',
        google_webhook_url || '',
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        shortCode,
        header_color || '#1e293b',
        bg_color || '#f1f5f9',
        header_image !== undefined ? header_image : '',
        font_family || 'ibm',
        id
      ]
    );

    // Recreate questions
    await pool.query('DELETE FROM form_questions WHERE form_id = ?', [id]);
    let order = 1;
    for (const q of questions) {
      if (!q.label || !q.label.trim()) continue;
      const qId = uuidv4();
      await pool.query(
        `INSERT INTO form_questions (id, form_id, label, question_type, options, is_required, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [qId, id, q.label.trim(), q.question_type || 'text', q.options || '', q.is_required ? 1 : 0, order++]
      );
    }

    res.json({ success: true, message: 'تم تحديث الاستمارة والأسئلة بنجاح', shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ أثناء تحديث الاستمارة' });
  }
}

// PATCH /api/forms/:id/toggle (Toggle accepting responses)
async function toggleForm(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT is_active FROM forms WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'الاستمارة غير موجودة' });
    const newStatus = rows[0].is_active ? 0 : 1;
    await pool.query('UPDATE forms SET is_active = ? WHERE id = ?', [newStatus, id]);
    res.json({ success: true, is_active: newStatus, message: newStatus ? 'تم فتح استقبال الردود' : 'تم إيقاف استقبال الردود' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في تغيير حالة الاستمارة' });
  }
}

// DELETE /api/forms/:id
async function deleteForm(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM forms WHERE id = ?', [id]);
    res.json({ success: true, message: 'تم حذف الاستمارة' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الاستمارة' });
  }
}

// GET /api/forms/:id/submissions (Admin view submissions)
async function getSubmissions(req, res) {
  const { id } = req.params;
  try {
    const [subs] = await pool.query('SELECT * FROM form_submissions WHERE form_id = ? ORDER BY created_at DESC', [id]);
    const parsed = subs.map(s => ({
      ...s,
      answers: JSON.parse(s.answers_json || '{}')
    }));
    res.json({ success: true, submissions: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإجابات' });
  }
}

// POST /api/forms/:id/import-to-voting (Import submissions directly to activities table for voting)
async function importSubmissionsToVoting(req, res) {
  const { id } = req.params;
  const { submissionIds = [], replaceCurrent = false } = req.body;

  try {
    let query = 'SELECT * FROM form_submissions WHERE form_id = ?';
    let params = [id];
    if (submissionIds.length > 0) {
      query += ` AND id IN (${submissionIds.map(() => '?').join(',')})`;
      params = [id, ...submissionIds];
    }
    const [subs] = await pool.query(query, params);
    if (!subs.length) {
      return res.status(400).json({ success: false, message: 'لا توجد ردود للاستيراد' });
    }

    if (replaceCurrent) {
      // Clear active voting queue safely (submissions table remains 100% saved)
      await pool.query('DELETE FROM votes');
      await pool.query('DELETE FROM activities');
    }

    const [countRes] = await pool.query('SELECT COUNT(*) as cnt FROM activities');
    let offset = countRes[0].cnt;
    let added = 0;

    // Fetch form title for activity tagging
    const [formRows] = await pool.query('SELECT title FROM forms WHERE id = ?', [id]);
    const formTitle = (formRows.length && formRows[0].title) ? formRows[0].title : 'استمارة إلكترونية';

    for (const s of subs) {
      const a = JSON.parse(s.answers_json || '{}');
      const actId = uuidv4();
      const keys = Object.keys(a);

      const findKey = (...terms) => {
        for (const t of terms) {
          const match = keys.find(k => k.includes(t));
          if (match && a[match]) return a[match];
        }
        return '';
      };

      const name = findKey('اسم النشاط', 'عنوان النشاط', 'عنوان', 'النشاط', 'المقترح') || ('نشاط استمارة رقم ' + (offset + added + 1));
      const type = findKey('نوع النشاط', 'نوع الفعالية', 'نوع', 'الفعالية') || formTitle;
      const idea = findKey('فكرة النشاط', 'الفكرة', 'أهداف النشاط', 'أهداف', 'الهدف', 'ملخص');
      const leader = findKey('اسم صاحب النشاط', 'رئيس الفريق', 'صاحب النشاط', 'المسؤول', 'مقدم الطلب', 'الاسم') || s.respondent_name || '';
      const affiliation = findKey('الجهة / التشكيل', 'جهة الانتساب', 'الجهة', 'التشكيل', 'الكلية', 'القسم', 'الانتساب') || s.respondent_org || '';
      const members = findKey('الأعضاء المشاركون', 'أعضاء الفريق', 'الأعضاء', 'المشاركون');
      const specializations = findKey('تخصصاتهم', 'التخصص', 'التخصصات');
      const attachment = findKey('الملف المرفق', 'الملف', 'المرفق', 'الأوليات', 'رابط');

      // Preserve all form answers dynamically in extra so any custom field/question is displayed!
      const extra = {};
      extra['📋 مصدر الاستمارة'] = formTitle;
      if (s.respondent_name) extra['اسم مقدم الطلب'] = s.respondent_name;
      if (s.respondent_email) extra['البريد الإلكتروني'] = s.respondent_email;
      if (s.respondent_phone) extra['رقم الهاتف'] = s.respondent_phone;
      if (s.respondent_org) extra['الجهة / التشكيل'] = s.respondent_org;
      for (const k of keys) {
        extra[k] = a[k];
      }

      await pool.query(
        `INSERT INTO activities (id, seq, name, type, idea, team_leader, affiliation, team_members, specializations, attachment, extra)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [actId, String(offset + added + 1), name, type, idea, leader, affiliation, members, specializations, attachment, JSON.stringify(extra)]
      );
      added++;
    }

    res.json({ success: true, message: `تم سحب وتحويل ${added} رد بنجاح إلى جدول الأنشطة والتصويت`, added });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ أثناء سحب الردود إلى جدول التصويت' });
  }
}

// POST /api/public/forms/:id/submit (Public submit answers)
async function submitPublicForm(req, res) {
  const { id } = req.params;
  const { answers = {}, respondent = {}, fileData = null } = req.body;

  try {
    const [forms] = await pool.query('SELECT * FROM forms WHERE id = ? OR short_code = ?', [id, id]);
    if (!forms.length) return res.status(404).json({ success: false, message: 'الاستمارة غير موجودة' });
    if (!forms[0].is_active) return res.status(400).json({ success: false, message: 'عذراً، استقبال الردود لهذه الاستمارة متوقف حالياً من قِبل الإدارة' });

    const form = forms[0];
    const subId = uuidv4();

    // Determine webhook URL: Form-specific URL takes priority, otherwise fallback to system global settings
    let targetWebhookUrl = form.google_webhook_url;
    if (!targetWebhookUrl || !targetWebhookUrl.startsWith('http')) {
      const [settings] = await pool.query('SELECT google_webhook_url FROM settings WHERE id = 1');
      if (settings && settings[0] && settings[0].google_webhook_url) {
        targetWebhookUrl = settings[0].google_webhook_url;
      }
    }

    // Sync to Google Drive / Sheets if webhook URL provided
    if (targetWebhookUrl && targetWebhookUrl.startsWith('http')) {
      fetch(targetWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formTitle: form.title,
          submittedAt: new Date().toISOString(),
          respondent: respondent,
          answers: answers,
          ...fileData
        })
      })
      .then(r => r.json())
      .then(async (driveRes) => {
        // If Google Drive returned a public file URL, update the answer field to use the Drive URL directly!
        if (driveRes && driveRes.driveUrl) {
          let updated = false;
          for (const k of Object.keys(answers)) {
            if (answers[k] && typeof answers[k] === 'string' && answers[k].startsWith('/uploads/')) {
              answers[k] = driveRes.driveUrl;
              updated = true;
            }
          }
          if (updated) {
            await pool.query('UPDATE form_submissions SET answers_json = ? WHERE id = ?', [JSON.stringify(answers), subId]);
          }
        }
      })
      .catch(e => console.error('Form drive sync error:', e.message));
    }

    await pool.query(
      `INSERT INTO form_submissions (id, form_id, answers_json, respondent_name, respondent_email, respondent_phone, respondent_org)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subId,
        form.id,
        JSON.stringify(answers),
        respondent.name || '',
        respondent.email || '',
        respondent.phone || '',
        respondent.org || ''
      ]
    );

    res.status(201).json({ success: true, message: 'تم إرسال إجابتك بنجاح وحفظها' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ أثناء حفظ الإجابة' });
  }
}

module.exports = {
  getForms,
  getFormById,
  createForm,
  updateForm,
  toggleForm,
  deleteForm,
  getSubmissions,
  importSubmissionsToVoting,
  submitPublicForm
};
