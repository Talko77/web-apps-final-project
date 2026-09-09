const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

// כל בדיקות ההרשאה מתבצעות בצד השרת על סמך ה-session בלבד,
// ולא על סמך מידע שהלקוח שולח ויכול לשנות בדפדפן.

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/') || req.xhr ||
    (req.headers.accept || '').includes('application/json');
}

function deny(req, res, code, message) {
  logger.warn(`גישה נדחתה ${code} ל-${req.method} ${req.originalUrl}`);
  if (wantsJson(req)) return res.status(code).json({ error: message });
  if (code === 401) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  return res.status(403).render('error', { title: 'אין הרשאה', message });
}

exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return deny(req, res, 401, 'גישה מותנית בהתחברות למערכת');
};

exports.requireRole = (...roles) => (req, res, next) => {
  const user = req.session && req.session.user;
  if (!user) return deny(req, res, 401, 'גישה מותנית בהתחברות למערכת');
  if (!roles.includes(user.role)) return deny(req, res, 403, 'אין לך הרשאה לבצע פעולה זו');
  return next();
};

exports.isReporter = exports.requireRole(ROLES.REPORTER);
exports.isEditor = exports.requireRole(ROLES.EDITOR);
exports.isStaff = exports.requireRole(ROLES.REPORTER, ROLES.EDITOR);
