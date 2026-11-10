// backend/middleware/roleMiddleware.js

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'هذه العملية مخصصة للمدير فقط' });
}

function memberOrAdmin(req, res, next) {
  if (req.user && (req.user.role === 'member' || req.user.role === 'admin')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'غير مصرح' });
}

module.exports = { adminOnly, memberOrAdmin };
