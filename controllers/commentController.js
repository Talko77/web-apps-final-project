// HTTP layer for comments: public posting and listing, editor moderation.
const { commentService } = require('../container');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// GET /api/comments/article/:articleId?search= - the comments on an article, optionally by text
exports.listByArticle = asyncHandler(async (req, res) => {
  res.json({ comments: await commentService.listForArticle(req.params.articleId, req.query.search) });
});

// POST /api/comments/article/:articleId - adds a comment, open to guests as well.
// Only the new comment is returned, so the client can append it without a reload
exports.create = asyncHandler(async (req, res) => {
  const comment = await commentService.create(req.params.articleId, req.body, req.session.user);
  res.status(201).json({ success: true, comment });
});

// PUT /api/comments/:id - editors only
exports.update = asyncHandler(async (req, res) => {
  const comment = await commentService.update(req.params.id, req.body);
  logger.info(`Comment ${comment._id} edited by ${req.session.user.username}`);
  res.json({ success: true, comment });
});

// DELETE /api/comments/:id - editors only
exports.remove = asyncHandler(async (req, res) => {
  const comment = await commentService.remove(req.params.id);
  logger.info(`Comment ${comment._id} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
