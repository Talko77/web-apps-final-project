// HTTP layer for staff account management (editors only).
const { userService } = require('../container');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// GET /api/users - the staff directory, with optional free-text search
exports.list = asyncHandler(async (req, res) => {
  res.json({ users: await userService.list(req.query.search) });
});

// POST /api/users - creates a reporter or an editor
exports.create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  logger.info(`User ${user.username} (${user.role}) created by ${req.session.user.username}`);
  res.status(201).json({ success: true, user });
});

// PUT /api/users/:id - updates the username, display name, role, and optionally the password
exports.update = asyncHandler(async (req, res) => {
  const user = await userService.update(req.params.id, req.body);
  logger.info(`User ${user.username} updated by ${req.session.user.username}`);
  res.json({ success: true, user });
});

// DELETE /api/users/:id
exports.remove = asyncHandler(async (req, res) => {
  const user = await userService.remove(req.session.user._id, req.params.id);
  logger.info(`User ${user.username} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
