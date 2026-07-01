const router = require('express').Router();
const u      = require('../controllers/userController');
const { protect } = require('../middleware/jwtAuth');

router.use(protect);
router.get   ('/search',        u.searchUsers);
router.get   ('/:id/profile',   u.getProfile);
router.post  ('/:id/follow',    u.followUser);
router.post  ('/:id/unfollow',  u.unfollowUser);

module.exports = router;
