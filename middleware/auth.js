// Authentication and role-authorization middleware enforcing server-side session permissions.
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');

// All permission checks run on the server based on the session only,
// never on data the client sends and could tamper with in the browser.

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/') || req.xhr ||
    (req.headers.accept || '').includes('application/json');
}

function deny(req, res, code, message) {
  logger.warn(`Access denied ${code} for ${req.method} ${req.originalUrl}`);
  if (wantsJson(req)) return res.status(code).json({ error: message });
  if (code === 401) return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  return res.status(403).render('error', { title: 'Access Denied', message });
}

// Ensures the user has an active authenticated session; rejects with 401 otherwise.
exports.isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) return next();
  return deny(req, res, 401, 'You must be signed in to access this area');
};

// Enforces that the session user holds one of the required roles (Reporter, Editor).
exports.requireRole = (...roles) => (req, res, next) => {
  const user = req.session && req.session.user;
  if (!user) return deny(req, res, 401, 'You must be signed in to access this area');
  if (!roles.includes(user.role)) return deny(req, res, 403, 'You do not have permission to perform this action');
  return next();
};

exports.isReporter = exports.requireRole(ROLES.REPORTER);
exports.isEditor = exports.requireRole(ROLES.EDITOR);
exports.isStaff = exports.requireRole(ROLES.REPORTER, ROLES.EDITOR);
