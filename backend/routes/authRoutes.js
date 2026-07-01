const router = require('express').Router();
const auth   = require('../controllers/authController');
const { protect } = require('../middleware/jwtAuth');

router.post('/register', auth.register);
router.post('/login',    auth.login);
router.get ('/me',       protect, auth.getMe);

module.exports = router;
