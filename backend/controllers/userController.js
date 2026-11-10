// backend/controllers/userController.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool   = require('../config/db');

// GET /api/users  — admin only
async function getUsers(req, res) {
  try {
    const [users] = await pool.query(
      'SELECT id, name, username, role, active, created_at FROM users ORDER BY role DESC, created_at ASC'
    );
    // Attach vote counts
    const [votes] = await pool.query('SELECT user_id, COUNT(*) as cnt FROM votes GROUP BY user_id');
    const [total]  = await pool.query('SELECT COUNT(*) as cnt FROM activities');
    const voteMap  = {};
    votes.forEach(v => voteMap[v.user_id] = v.cnt);

    const result = users.map(u => ({
      ...u,
      voteCount:      voteMap[u.id] || 0,
      totalActivities: total[0].cnt
    }));

    res.json({ success: true, users: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// POST /api/users  — admin only
async function createUser(req, res) {
  const { name, username, password, role = 'member' } = req.body;

  if (!name || !username || !password) {
    return res.status(400).json({ success: false, message: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (exists.length) {
      return res.status(409).json({ success: false, message: 'اسم المستخدم مستخدم مسبقاً' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const id     = uuidv4();

    await pool.query(
      'INSERT INTO users (id, name, username, password, role, active) VALUES (?, ?, ?, ?, ?, 1)',
      [id, name.trim(), username.trim(), hashed, role]
    );

    res.status(201).json({ success: true, message: 'تم إنشاء الحساب بنجاح', id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// PUT /api/users/:id  — admin only
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, username, password } = req.body;

  if (!name || !username) {
    return res.status(400).json({ success: false, message: 'الاسم واسم المستخدم مطلوبان' });
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, id]);
    if (exists.length) {
      return res.status(409).json({ success: false, message: 'اسم المستخدم مستخدم من قِبل مستخدم آخر' });
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
      }
      const hashed = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name = ?, username = ?, password = ? WHERE id = ?',
        [name.trim(), username.trim(), hashed, id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, username = ? WHERE id = ?',
        [name.trim(), username.trim(), id]
      );
    }

    res.json({ success: true, message: 'تم التعديل بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// PATCH /api/users/:id/toggle  — admin only
async function toggleUser(req, res) {
  const { id } = req.params;
  if (id === 'admin-default-id-000000000001') {
    return res.status(403).json({ success: false, message: 'لا يمكن تعطيل المدير الرئيسي' });
  }
  try {
    await pool.query('UPDATE users SET active = NOT active WHERE id = ?', [id]);
    const [rows] = await pool.query('SELECT active FROM users WHERE id = ?', [id]);
    res.json({ success: true, active: !!rows[0].active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

// DELETE /api/users/:id  — admin only
async function deleteUser(req, res) {
  const { id } = req.params;
  if (id === 'admin-default-id-000000000001') {
    return res.status(403).json({ success: false, message: 'لا يمكن حذف المدير الرئيسي' });
  }
  try {
    await pool.query('DELETE FROM votes WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'خطأ في السيرفر' });
  }
}

module.exports = { getUsers, createUser, updateUser, toggleUser, deleteUser };
