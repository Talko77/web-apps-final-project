// Handles public comment submissions, comment listings, and editor comment moderation.
const Comment = require('../models/Comment');
const Article = require('../models/Article');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// GET /api/comments/article/:articleId - the list of comments on an article
exports.listByArticle = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ article: req.params.articleId })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.json({ comments });
});

// POST /api/comments/article/:articleId - adds a comment, open to guests as well
exports.create = asyncHandler(async (req, res) => {
  const content = String((req.body && req.body.content) || '').trim();

  if (!content) return res.status(400).json({ error: 'Comment cannot be empty' });
  if (content.length > 1000) return res.status(400).json({ error: 'Comment is too long (1000 characters maximum)' });

  // Comments are only allowed on an article that is actually published
  const article = await Article.findOne({ _id: req.params.articleId, isPublished: true }).select('_id');
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const rawName = String((req.body && req.body.authorName) || '').trim();
  const authorName = rawName ? rawName.slice(0, 40)
    : (req.session.user ? req.session.user.displayName : 'Guest');

  const comment = await Comment.create({ article: article._id, authorName, content });

  // Only the single new comment is returned, so the client can append it to the list without a reload
  res.status(201).json({ success: true, comment });
});

// DELETE /api/comments/:id - editors only
exports.remove = asyncHandler(async (req, res) => {
  const comment = await Comment.findByIdAndDelete(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  logger.info(`Comment ${comment._id} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
