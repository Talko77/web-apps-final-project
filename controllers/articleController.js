// HTTP layer for articles: reads the request, calls the article service, shapes the JSON.
const { articleService, articleRepository } = require('../container');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { formatDateTime, formatViews, readingLabel, reporterName, toQueueRow } = require('../utils/viewMappers');
const { FEED_PAGE_SIZE, QUEUE_PAGE_SIZE } = require('../config/constants');

// The public feed filter from the query string, with seen / unseen based on the session
function feedFilter(req) {
  const filter = { search: req.query.search, category: req.query.category };
  const seen = req.session.viewedArticles || [];
  if (req.query.seen === 'seen') filter.onlyIds = seen;
  else if (req.query.seen === 'unseen') filter.excludeIds = seen;
  return filter;
}

// GET /api/articles/feed - public feed for infinite scrolling
exports.getFeed = asyncHandler(async (req, res) => {
  const page = Math.min(10000, Math.max(1, parseInt(req.query.page, 10) || 1));
  const filter = feedFilter(req);

  // The search page asks for result counts along with the first page, so its header and
  // category counts follow the filters without a reload
  const withCounts = page === 1 && req.query.counts === '1';

  const [articles, total, counts] = await Promise.all([
    articleRepository.listPublished(filter, {
      sortBy: req.query.sortBy, skip: (page - 1) * FEED_PAGE_SIZE, limit: FEED_PAGE_SIZE
    }),
    withCounts ? articleRepository.countPublished(filter) : null,
    withCounts ? articleRepository.countPublishedByCategory(filter) : null
  ]);

  const seen = new Set((req.session.viewedArticles || []).map(String));

  // The fields are returned pre-formatted so that feed.js can build a card identical
  // to views/partials/public/article-card.ejs without any display logic on the client
  res.json({
    page,
    hasMore: articles.length === FEED_PAGE_SIZE,
    ...(withCounts && { total, categoryCounts: counts }),
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
  res.json({ articles: await articleRepository.listByReporter(req.session.user._id) });
});

// GET /api/articles/manage - every article, editors only, filtered by status, category and search
exports.getAllForEditor = asyncHandler(async (req, res) => {
  const { articles, total } = await articleRepository.listQueue(req.query, QUEUE_PAGE_SIZE);
  res.json({ total, hasMore: total > articles.length, articles: articles.map(toQueueRow) });
});

// GET /api/articles/:id - a single article for editing or review
exports.getOne = asyncHandler(async (req, res) => {
  res.json({ article: await articleService.getForUser(req.session.user, req.params.id) });
});

// POST /api/articles - creates a new article in "draft" status
exports.create = asyncHandler(async (req, res) => {
  const article = await articleService.create(req.session.user, req.body || {});
  logger.info(`New article ${article._id} created by ${req.session.user.username}`);
  res.status(201).json({ success: true, articleId: article._id });
});

// PUT /api/articles/:id - saves the draft (explicit Save Draft and background autosave)
exports.saveDraft = asyncHandler(async (req, res) => {
  const article = await articleService.saveDraft(req.session.user, req.params.id, req.body || {});
  res.json({ success: true, articleId: article._id, status: article.status, savedAt: article.updatedAt });
});

// PATCH /api/articles/:id/status - transitions between article statuses
exports.changeStatus = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const article = await articleService.changeStatus(user, req.params.id, req.body || {});
  logger.info(`Article ${article._id} moved to ${article.status} by ${user.username}`);
  res.json({ success: true, status: article.status, isPublished: article.isPublished });
});

// DELETE /api/articles/:id - editors only. Also deletes the comments and the view data
exports.remove = asyncHandler(async (req, res) => {
  const article = await articleService.remove(req.params.id);
  logger.info(`Article ${article._id} deleted by ${req.session.user.username}`);
  res.json({ success: true });
});
