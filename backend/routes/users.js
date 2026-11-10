// backend/routes/users.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const {
  getUsers, createUser, updateUser, toggleUser, deleteUser
} = require('../controllers/userController');

router.get('/',           auth, adminOnly, getUsers);
router.post('/',          auth, adminOnly, createUser);
router.put('/:id',        auth, adminOnly, updateUser);
router.patch('/:id/toggle', auth, adminOnly, toggleUser);
router.delete('/:id',     auth, adminOnly, deleteUser);

module.exports = router;
