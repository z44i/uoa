// backend/routes/auth.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const { login, getMe, changePassword } = require('../controllers/authController');

router.post('/login',           login);
router.get('/me',               auth, getMe);
router.post('/change-password', auth, changePassword);

module.exports = router;
