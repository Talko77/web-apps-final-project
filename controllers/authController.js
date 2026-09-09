const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ROLES } = require('../config/constants');

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'יש להזין שם משתמש וסיסמה' });
  }

  const user = await User.findOne({ username: String(username).trim() });

  // אותה הודעה לשם משתמש שגוי ולסיסמה שגויה, כדי לא לחשוף אילו שמות קיימים
  if (!user || !(await user.verifyPassword(String(password)))) {
    logger.warn(`התחברות נכשלה עבור "${username}" מ-${req.ip}`);
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }

  // התפקיד נשמר ב-session בצד השרת ולא נלקח מהבקשה
  req.session.user = user.toPublic();

  logger.info(`התחברות מוצלחת: ${user.username} (${user.role})`);
  res.json({
    success: true,
    user: req.session.user,
    redirect: user.role === ROLES.EDITOR ? '/editor' : '/reporter'
  });
});

// POST /api/auth/logout
exports.logout = (req, res) => {
  const name = req.session.user ? req.session.user.username : 'אנונימי';
  req.session.destroy(err => {
    if (err) {
      logger.error('התנתקות נכשלה', err);
      return res.status(500).json({ error: 'ההתנתקות נכשלה' });
    }
    logger.info(`התנתקות: ${name}`);
    res.clearCookie('connect.sid');
    res.json({ success: true, redirect: '/' });
  });
};

// GET /api/auth/me - מאפשר ללקוח לדעת מי מחובר לאחר Restart של השרת
exports.me = (req, res) => {
  res.json({ user: req.session.user || null });
};
