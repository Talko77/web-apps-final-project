// Handles article operations: feed pagination, reporter draft management, status transitions, and editor deletion.
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Analytics = require('../models/Analytics');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { formatDateTime, formatViews, readingLabel, reporterName, toQueueRow } = require('../utils/viewMappers');
const { escapeRegex, buildQueueQuery } = require('../utils/queries');
const { CATEGORIES, STATUS, ROLES, FEED_PAGE_SIZE, QUEUE_PAGE_SIZE } = require('../config/constants');

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

  if (CATEGORIES.includes(req.query.category)) {
    query['publishedVersion.category'] = req.query.category;
  }

  const search = String(req.query.search || '').trim();
  if (search) {
    query['publishedVersion.title'] = { $regex: escapeRegex(search), $options: 'i' };
  }

  // Seen / unseen filtering based on the articles read in the current session
  const seen = (req.session.viewedArticles || []);
  if (req.query.seen === 'seen') query._id = { $in: seen };
  else if (req.query.seen === 'unseen') query._id = { $nin: seen };

  return query;
}

// GET /api/articles/feed - public feed for infinite scrolling
exports.getFeed = asyncHandler(async (req, res) => {
  const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const query = buildFeedQuery(req);
  const sort = req.query.sortBy === 'popularity'
    ? { totalViews: -1, publishedAt: -1, _id: -1 }
    : { publishedAt: -1, _id: -1 };

  // The search page asks for result counts along with the first page, so its header and
  // category counts follow the filters without a reload. They ignore the category filter,
  // so each category shows how many matches it would give.
  const withCounts = page === 1 && req.query.counts === '1';
  const countQuery = { ...query };
  delete countQuery['publishedVersion.category'];

  // Only the fields the feed card displays are fetched; the body is used for the reading time
  const [articles, total, grouped] = await Promise.all([
    Article.find(query)
      .populate('reporter', 'username displayName')
      .sort(sort)
      .skip((page - 1) * FEED_PAGE_SIZE)
      .limit(FEED_PAGE_SIZE)
      .select('publishedVersion.title publishedVersion.summary publishedVersion.category publishedVersion.imageUrl publishedVersion.content publishedAt totalViews reporter')
      .lean(),
    withCounts ? Article.countDocuments(query) : null,
    withCounts
      ? Article.aggregate([{ $match: countQuery }, { $group: { _id: '$publishedVersion.category', count: { $sum: 1 } } }])
      : null
  ]);

  const seen = new Set((req.session.viewedArticles || []).map(String));

  // The fields are returned pre-formatted so that feed.js can build a card identical
  // to views/partials/public/article-card.ejs without any display logic on the client
  res.json({
    page,
    hasMore: articles.length === FEED_PAGE_SIZE,
    ...(withCounts && { total, categoryCounts: Object.fromEntries(grouped.map(g => [g._id, g.count])) }),
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      summary: a.publishedVersion.summary,
      category: a.publishedVersion.category,
      imageUrl: a.publishedVersion.imageUrl,
      imageAlt: a.publishedVersion.title,
      dateLabel: formatDateTime(a.publishedAt),
      // Machine-readable form for the <time datetime="..."> attribute on the card
      datetime: a.publishedAt ? new Date(a.publishedAt).toISOString() : '',
      views: formatViews(a.totalViews),
      readLabel: readingLabel(a.publishedVersion.content),
      reporterName: reporterName(a),
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

// GET /api/articles/manage - every article in the system, editors only, with filtering by status, category and search
exports.getAllForEditor = asyncHandler(async (req, res) => {
  const query = await buildQueueQuery(req.query);

  // The rows are capped so the queue stays responsive with thousands of articles,
  // while matchingCount reports how many articles the filters actually match.
  const [articles, matchingCount] = await Promise.all([
    Article.find(query)
      .populate('reporter', 'username displayName')
      .sort({ updatedAt: -1 })
      .limit(QUEUE_PAGE_SIZE)
      .lean(),
    Article.countDocuments(query)
  ]);

  res.json({
    total: matchingCount,
    hasMore: matchingCount > articles.length,
    articles: articles.map(toQueueRow)
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
  if (user.role === ROLES.REPORTER && String(article.reporter && article.reporter._id) !== String(user._id)) {
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

// PUT /api/articles/:id - saves the reporter's draft.
// Called both by the explicit Save Draft action and by the background autosave,
// so a refresh, closing the browser or switching computers does not lose work.
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

  const incoming = sanitizeContent(req.body || {});
  const current = article.draftVersion || {};
  // Compared trimmed, because the schema trims title and summary on save
  const changed = Object.keys(incoming).some(k => incoming[k].trim() !== String(current[k] || '').trim());
  article.draftVersion = incoming;

  // A reporter's draft may be partial (autosave), but an editor's edit goes straight to review
  // and can be approved, so it has to be complete
  if (user.role === ROLES.EDITOR && !article.isDraftComplete()) {
    return res.status(400).json({ error: 'A title, summary, content and category are all required' });
  }

  // Editing a published article starts a new draft; the approved version stays in
  // publishedVersion and keeps being shown to the public. An editor's own edit goes
  // straight to "pending review" so the editor can approve it, instead of leaving it
  // as a draft only the reporter could submit.
  // A save with nothing changed (for example from a stale tab) leaves a published article as it is
  if (article.status === STATUS.PUBLISHED && changed) {
    article.status = user.role === ROLES.EDITOR ? STATUS.PENDING : STATUS.DRAFT;
  }

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
      if (!article.isDraftComplete()) {
        return res.status(400).json({ error: 'The article needs a title, summary, content and category before it can be published' });
      }
      // Approving the update makes the draft the version shown to readers
      article.publishedVersion = article.draftVersion.toObject();
      article.status = STATUS.PUBLISHED;
      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
      article.publishEvents.push(new Date()); // Marker point on the analytics chart
      article.editorNote = '';

    } else if (newStatus === STATUS.RETURNED) {
      // The note is required by the workflow, so it is enforced here and not only in the form
      const note = String(editorNote || '').trim();
      if (!note) return res.status(400).json({ error: 'Add a note explaining what changes are needed' });
      article.status = STATUS.RETURNED;
      article.editorNote = note.slice(0, 1000);

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
