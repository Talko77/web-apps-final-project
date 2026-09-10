const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Analytics = require('../models/Analytics');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { formatDateTime, formatViews } = require('../utils/viewMappers');
const { CATEGORIES, STATUS, ROLES, FEED_PAGE_SIZE } = require('../config/constants');

// Escapes special characters so free-text input is not interpreted as a regular expression
const escapeRegex = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sanitizeContent(body) {
  return {
    title: String(body.title || '').slice(0, 200),
    summary: String(body.summary || '').slice(0, 500),
    content: String(body.content || ''),
    category: CATEGORIES.includes(body.category) ? body.category : '',
    imageUrl: String(body.imageUrl || '')
  };
}

// Builds the public feed query from the request query parameters
function buildFeedQuery(req) {
  const query = { isPublished: true };

  if (req.query.category && CATEGORIES.includes(req.query.category)) {
    query['publishedVersion.category'] = req.query.category;
  }

  if (req.query.search && String(req.query.search).trim()) {
    query['publishedVersion.title'] = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
  }

  // Seen / unseen filtering based on the articles read in the current session
  const seen = (req.session.viewedArticles || []);
  if (req.query.seen === 'seen') query._id = { $in: seen };
  else if (req.query.seen === 'unseen') query._id = { $nin: seen };

  return query;
}

// GET /api/articles/feed - public feed for infinite scrolling
exports.getFeed = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const query = buildFeedQuery(req);
  const sort = req.query.sortBy === 'popularity'
    ? { totalViews: -1, publishedAt: -1 }
    : { publishedAt: -1 };

  // Only the fields the feed card displays are fetched, not the full article body
  const articles = await Article.find(query)
    .populate('reporter', 'username displayName')
    .sort(sort)
    .skip((page - 1) * FEED_PAGE_SIZE)
    .limit(FEED_PAGE_SIZE)
    .select('publishedVersion.title publishedVersion.summary publishedVersion.category publishedVersion.imageUrl publishedAt totalViews reporter')
    .lean();

  const seen = new Set((req.session.viewedArticles || []).map(String));

  // The fields are returned pre-formatted so that feed.js can build a card identical
  // to views/partials/public/article-card.ejs without any display logic on the client
  res.json({
    page,
    hasMore: articles.length === FEED_PAGE_SIZE,
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      summary: a.publishedVersion.summary,
      category: a.publishedVersion.category,
      imageUrl: a.publishedVersion.imageUrl,
      imageAlt: a.publishedVersion.title,
      dateLabel: formatDateTime(a.publishedAt),
      views: formatViews(a.totalViews),
      reporterName: a.reporter ? (a.reporter.displayName || a.reporter.username) : 'Unknown',
      seen: seen.has(String(a._id))
    }))
  });
});

// GET /api/articles/mine - only the articles of the signed-in reporter
exports.getMyArticles = asyncHandler(async (req, res) => {
  const articles = await Article.find({ reporter: req.session.user._id })
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ articles });
});

// GET /api/articles/manage - every article in the system, editors only, with filtering by status
exports.getAllForEditor = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status && Object.values(STATUS).includes(req.query.status)) {
    query.status = req.query.status;
  }

  const articles = await Article.find(query)
    .populate('reporter', 'username displayName')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  res.json({
    articles: articles.map(a => ({
      ...a,
      reporterName: a.reporter ? (a.reporter.displayName || a.reporter.username) : 'Unknown',
      hasPendingUpdate: a.isPublished && a.status === STATUS.PENDING
    }))
  });
});

// GET /api/articles/:id - a single article for editing or review
exports.getOne = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id)
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return res.status(404).json({ error: 'Article not found' });

  const user = req.session.user;
  // A reporter may access only their own articles; an editor may access all of them
  if (user.role === ROLES.REPORTER && String(article.reporter._id) !== String(user._id)) {
    return res.status(403).json({ error: 'You do not have permission to view this article' });
  }

  res.json({ article });
});

// POST /api/articles - creates a new article in "draft" status
exports.create = asyncHandler(async (req, res) => {
  const article = await Article.create({
    reporter: req.session.user._id,
    status: STATUS.DRAFT,
    draftVersion: sanitizeContent(req.body || {})
  });
  logger.info(`New article ${article._id} created by ${req.session.user.username}`);
  res.status(201).json({ success: true, articleId: article._id });
});

// PUT /api/articles/:id - saves the reporter's draft on an explicit Save Draft action.
exports.saveDraft = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const article = await Article.findById(req.params.id);

  if (!article) return res.status(404).json({ error: 'Article not found' });

  // A reporter edits only their own articles, an editor edits any article
  if (user.role === ROLES.REPORTER && String(article.reporter) !== String(user._id)) {
    return res.status(403).json({ error: 'You do not have permission to edit this article' });
  }

  // An article currently awaiting the editor's decision must not be edited
  if (article.status === STATUS.PENDING && user.role === ROLES.REPORTER) {
    return res.status(409).json({ error: 'This article is awaiting editor approval and cannot be edited right now' });
  }

  article.draftVersion = sanitizeContent(req.body || {});

  // Editing a published article returns the draft to "draft" status.
  // The approved version stays in publishedVersion and keeps being shown to the public.
  if (article.status === STATUS.PUBLISHED) article.status = STATUS.DRAFT;

  await article.save();

  res.json({
    success: true,
    articleId: article._id,
    status: article.status,
    savedAt: article.updatedAt
  });
});

// PATCH /api/articles/:id/status - transitions between article statuses
exports.changeStatus = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const { newStatus, editorNote } = req.body || {};
  const article = await Article.findById(req.params.id);

  if (!article) return res.status(404).json({ error: 'Article not found' });

  if (user.role === ROLES.REPORTER) {
    if (String(article.reporter) !== String(user._id)) {
      return res.status(403).json({ error: 'You do not have permission to change this article' });
    }
    // The only transition allowed for a reporter: draft / changes requested -> pending review
    const allowed = article.status === STATUS.DRAFT || article.status === STATUS.RETURNED;
    if (!allowed || newStatus !== STATUS.PENDING) {
      return res.status(400).json({ error: 'This status change is not allowed for a reporter' });
    }
    if (!article.isDraftComplete()) {
      return res.status(400).json({ error: 'Add a title, summary, content and category before submitting for review' });
    }
    article.status = STATUS.PENDING;
    article.editorNote = '';

  } else {
    // Editor: only out of "pending review"
    if (article.status !== STATUS.PENDING) {
      return res.status(400).json({ error: 'Only an article awaiting approval can be approved or returned' });
    }

    if (newStatus === STATUS.PUBLISHED) {
      // Approving the update makes the draft the version shown to readers
      article.publishedVersion = article.draftVersion.toObject();
      article.status = STATUS.PUBLISHED;
      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
      article.publishEvents.push(new Date()); // Marker point on the analytics chart
      article.editorNote = '';

    } else if (newStatus === STATUS.RETURNED) {
      article.status = STATUS.RETURNED;
      article.editorNote = String(editorNote || '').slice(0, 1000);

    } else {
      return res.status(400).json({ error: 'This status change is not allowed for an editor' });
    }
  }

  await article.save();
  logger.info(`Article ${article._id} moved to ${article.status} by ${user.username}`);
  res.json({ success: true, status: article.status, isPublished: article.isPublished });
});

// DELETE /api/articles/:id - editors only. Also deletes the comments and the view data
exports.remove = asyncHandler(async (req, res) => {
  const article = await Article.findByIdAndDelete(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  await Promise.all([
    Comment.deleteMany({ article: article._id }),
    Analytics.deleteMany({ article: article._id })
  ]);

  logger.info(`Article ${article._id} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
