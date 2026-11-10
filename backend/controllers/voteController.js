// backend/controllers/voteController.js
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');

// GET /api/votes  — all votes (admin) or own votes (member)
async function getVotes(req, res) {
  try {
    let query, params;
    if (req.user.role === 'admin') {
      query  = 'SELECT v.*, u.name as user_name FROM votes v JOIN users u ON v.user_id = u.id';
      params = [];
    } else {
      query  = 'SELECT * FROM votes WHERE user_id = ?';
      params = [req.user.id];
    }
    const [votes] = await pool.query(query, params);
    res.json({ success: true, votes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// POST /api/votes  — cast a vote
async function castVote(req, res) {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'مدير النظام ليس لديه صلاحية التصويت، التصويت مخصص للأعضاء فقط' });
  }

  const { activityId, vote, reason } = req.body;

  if (!activityId || !vote) {
    return res.status(400).json({ success: false, message: 'النشاط ونوع التصويت مطلوبان' });
  }
  if (!['approve', 'reject'].includes(vote)) {
    return res.status(400).json({ success: false, message: 'نوع التصويت غير صحيح' });
  }
  if (vote === 'reject' && !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });
  }

  try {
    // Check activity exists
    const [acts] = await pool.query('SELECT id FROM activities WHERE id = ?', [activityId]);
    if (!acts.length) {
      return res.status(404).json({ success: false, message: 'النشاط غير موجود' });
    }

    // Check not already voted
    const [existing] = await pool.query(
      'SELECT id FROM votes WHERE activity_id = ? AND user_id = ?',
      [activityId, req.user.id]
    );
    if (existing.length) {
      return res.status(409).json({ success: false, message: 'صوّتت على هذا النشاط مسبقاً' });
    }

    const id = uuidv4();
    await pool.query(
      'INSERT INTO votes (id, activity_id, user_id, vote, reason) VALUES (?, ?, ?, ?, ?)',
      [id, activityId, req.user.id, vote, reason?.trim() || '']
    );

    res.status(201).json({ success: true, message: 'تم تسجيل تصويتك', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// PUT /api/votes/:id  — edit own vote
async function updateVote(req, res) {
  const { id } = req.params;
  const { vote, reason } = req.body;

  if (!['approve', 'reject'].includes(vote)) {
    return res.status(400).json({ success: false, message: 'نوع التصويت غير صحيح' });
  }
  if (vote === 'reject' && !reason?.trim()) {
    return res.status(400).json({ success: false, message: 'سبب الرفض مطلوب' });
  }

  try {
    // Only the vote owner can edit (unless admin)
    const [rows] = await pool.query('SELECT * FROM votes WHERE id = ?', [id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'التصويت غير موجود' });
    }
    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعديل تصويت شخص آخر' });
    }

    await pool.query(
      'UPDATE votes SET vote = ?, reason = ? WHERE id = ?',
      [vote, vote === 'reject' ? reason.trim() : '', id]
    );

    res.json({ success: true, message: 'تم تعديل التصويت' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

module.exports = { getVotes, castVote, updateVote };
