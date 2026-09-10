// API routes for staff authentication sessions (login, logout, current user).
const router = require('express').Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimit');

router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authController.me);

module.exports = router;
