// Rate limiting middleware to prevent guest comment spam and staff login brute-force attacks.
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Spam prevention: a guest may post up to 3 comments per minute from the same device.
// The limit is enforced on the server, not on the client.
exports.commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Comment rate limit exceeded from ${req.ip}`);
    res.status(429).json({
      error: 'You have exceeded the comment limit. You can post up to 3 comments per minute. Try again shortly.'
    });
  }
});

// Protects the sign-in screen against password guessing
exports.loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sign-in rate limit exceeded from ${req.ip}`);
    res.status(429).json({ error: 'Too many sign-in attempts. Try again in a few minutes.' });
  }
});
