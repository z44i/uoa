// backend/routes/votes.js
const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const { getVotes, castVote, updateVote } = require('../controllers/voteController');

router.get('/',    auth, getVotes);
router.post('/',   auth, castVote);
router.put('/:id', auth, updateVote);

module.exports = router;
