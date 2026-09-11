// Handles staff account management for editors: listing, searching, creating, updating and deleting users.
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { ROLES } = require('../config/constants');

// Escapes special characters so free-text input is not interpreted as a regular expression
const escapeRegex = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isRole = value => Object.values(ROLES).includes(value);

// Counts the remaining editors, so the last one cannot be removed or demoted
// and leave the system without anyone able to administer it.
const countEditors = () => User.countDocuments({ role: ROLES.EDITOR });

// GET /api/users - the staff directory, with optional free-text search
exports.list = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const query = {};

  if (search) {
    const pattern = { $regex: escapeRegex(search), $options: 'i' };
    query.$or = [{ username: pattern }, { displayName: pattern }];
  }

  const users = await User.find(query).sort({ role: 1, username: 1 }).limit(200);

  // toPublic() keeps the password hash on the server
  res.json({ users: users.map(u => u.toPublic()) });
});

// POST /api/users - creates a reporter or an editor
exports.create = asyncHandler(async (req, res) => {
  const { username, password, displayName, role } = req.body || {};
  const name = String(username || '').trim();

  if (name.length < 3 || name.length > 30) {
    return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
  }
  if (String(password || '').length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!isRole(role)) {
    return res.status(400).json({ error: 'Role must be Reporter or Editor' });
  }

  try {
    // create() rather than insertMany() so the password hashing hook runs
    const user = await User.create({
      username: name,
      password: String(password),
      displayName: String(displayName || '').trim().slice(0, 60),
      role
    });
    logger.info(`User ${user.username} (${user.role}) created by ${req.session.user.username}`);
    res.status(201).json({ success: true, user: user.toPublic() });
  } catch (err) {
    // The unique index on username is a bad request, not a server error
    if (err.code === 11000) return res.status(400).json({ error: 'That username is already taken' });
    throw err;
  }
});

// PUT /api/users/:id - updates the display name, role, and optionally the password
exports.update = asyncHandler(async (req, res) => {
  const { username, password, displayName, role } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (username !== undefined) {
    const name = String(username).trim();
    if (name.length < 3 || name.length > 30) {
      return res.status(400).json({ error: 'Username must be between 3 and 30 characters' });
    }
    user.username = name;
  }

  if (displayName !== undefined) user.displayName = String(displayName).trim().slice(0, 60);

  if (role !== undefined) {
    if (!isRole(role)) return res.status(400).json({ error: 'Role must be Reporter or Editor' });
    if (user.role === ROLES.EDITOR && role !== ROLES.EDITOR && (await countEditors()) <= 1) {
      return res.status(409).json({ error: 'This is the last editor and cannot be demoted' });
    }
    user.role = role;
  }

  // The password is optional on update. It is assigned only when a new one was
  // typed, because the pre('save') hook hashes it whenever the field is modified.
  if (password !== undefined && String(password) !== '') {
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    user.password = String(password);
  }

  try {
    // save() rather than findByIdAndUpdate(): the hashing hook only runs on save,
    // so an update through the query API would store the password as plain text.
    await user.save();
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'That username is already taken' });
    throw err;
  }

  logger.info(`User ${user.username} updated by ${req.session.user.username}`);
  res.json({ success: true, user: user.toPublic() });
});

// DELETE /api/users/:id - editors only
exports.remove = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.session.user._id)) {
    return res.status(409).json({ error: 'You cannot delete your own account' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === ROLES.EDITOR && (await countEditors()) <= 1) {
    return res.status(409).json({ error: 'This is the last editor and cannot be deleted' });
  }

  await user.deleteOne();
  logger.info(`User ${user.username} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
