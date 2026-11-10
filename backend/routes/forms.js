// backend/routes/forms.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const {
  getForms,
  getFormById,
  createForm,
  updateForm,
  toggleForm,
  deleteForm,
  getSubmissions,
  importSubmissionsToVoting
} = require('../controllers/formController');

router.get('/',               auth, adminOnly, getForms);
router.get('/:id',            auth, adminOnly, getFormById);
router.post('/',              auth, adminOnly, createForm);
router.put('/:id',            auth, adminOnly, updateForm);
router.patch('/:id/toggle',   auth, adminOnly, toggleForm);
router.delete('/:id',         auth, adminOnly, deleteForm);
router.get('/:id/submissions', auth, adminOnly, getSubmissions);
router.post('/:id/import-to-voting', auth, adminOnly, importSubmissionsToVoting);

module.exports = router;
