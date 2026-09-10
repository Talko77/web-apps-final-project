const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ROLES } = require('../config/constants');

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Enter a username and password' });
  }

  const user = await User.findOne({ username: String(username).trim() });

  // The same message for a wrong username and a wrong password, so we do not reveal which names exist
  if (!user || !(await user.verifyPassword(String(password)))) {
    logger.warn(`Login failed for "${username}" from ${req.ip}`);
    return res.status(401).json({ error: 'Incorrect username or password' });
  }

  // The role is stored in the server-side session and never taken from the request
  req.session.user = user.toPublic();

  logger.info(`Login succeeded: ${user.username} (${user.role})`);
  res.json({
    success: true,
    user: req.session.user,
    redirect: user.role === ROLES.EDITOR ? '/editor' : '/reporter'
  });
});

// POST /api/auth/logout
exports.logout = (req, res) => {
  const name = req.session.user ? req.session.user.username : 'anonymous';
  req.session.destroy(err => {
    if (err) {
      logger.error('Sign out failed', err);
      return res.status(500).json({ error: 'Sign out failed' });
    }
    logger.info(`Signed out: ${name}`);
    res.clearCookie('connect.sid');
    res.json({ success: true, redirect: '/' });
  });
};

// GET /api/auth/me - lets the client find out who is signed in after a server restart
exports.me = (req, res) => {
  res.json({ user: req.session.user || null });
};
