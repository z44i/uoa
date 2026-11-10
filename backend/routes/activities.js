// backend/routes/activities.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const {
  getActivities, createActivity, bulkImport,
  updateActivity, deleteActivity, resetActivities,
  resetVotes, getSettings, updateSettings, toggleVoting
} = require('../controllers/activityController');

router.get('/settings',         getSettings);              // public - للبراندينج في صفحة اللوغن
router.put('/settings',         auth, adminOnly, updateSettings);
router.post('/toggle-voting',   auth, adminOnly, toggleVoting);
router.get('/',                 auth, getActivities);
router.post('/',              auth, adminOnly, createActivity);
router.post('/bulk',          auth, adminOnly, bulkImport);
router.delete('/reset-all',   auth, adminOnly, resetActivities);
router.delete('/reset-votes', auth, adminOnly, resetVotes);
router.put('/:id',            auth, adminOnly, updateActivity);
router.delete('/:id',         auth, adminOnly, deleteActivity);

module.exports = router;
