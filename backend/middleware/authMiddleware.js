// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user still exists and is active
    const [rows] = await pool.query(
      'SELECT id, name, username, role, active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length || !rows[0].active) {
      return res.status(401).json({ success: false, message: 'الحساب غير موجود أو موقوف' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'الجلسة منتهية، يرجى تسجيل الدخول مجدداً' });
  }
}

module.exports = authMiddleware;
