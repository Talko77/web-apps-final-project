// Authentication and role-authorization middleware enforcing server-side session permissions.
const User = require('../models/User');
const { ROLES } = require('../config/constants');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { wantsJson } = require('./errorHandler');

// All permission checks run on the server based on the session only,
// never on data the client sends and could tamper with in the browser.

function deny(req, res, code, message) {
  logger.warn(`Access denied ${code} for ${req.method} ${req.originalUrl}`);
  if (wantsJson(req)) return res.status(code).json({ error: message });
  // The staff sign-in page is /staff/login; /login does not exist and would 404
  if (code === 401) return res.redirect('/staff/login?next=' + encodeURIComponent(req.originalUrl));
  return res.status(403).render('error', { title: 'Access Denied', message });
}

// Enforces that the session user holds one of the required roles (Reporter, Editor).
// The role is re-read from the database on every request, so a demoted or deleted
// account loses its access at once instead of keeping the role stored at sign-in.
exports.requireRole = (...roles) => asyncHandler(async (req, res, next) => {
  const sessionUser = req.session && req.session.user;
  if (!sessionUser) return deny(req, res, 401, 'You must be signed in to access this area');

  const user = await User.findById(sessionUser._id).select('role').lean();
  if (!user) {
    req.session.destroy(() => {});
    return deny(req, res, 401, 'Your account no longer exists');
  }
  if (!roles.includes(user.role)) return deny(req, res, 403, 'You do not have permission to perform this action');

  req.session.user.role = user.role;
  return next();
});

exports.isReporter = exports.requireRole(ROLES.REPORTER);
exports.isEditor = exports.requireRole(ROLES.EDITOR);
exports.isStaff = exports.requireRole(ROLES.REPORTER, ROLES.EDITOR);
