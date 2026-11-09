// HTTP layer for Impact Analytics: the view timeline and manual bucket management.
const { analyticsService } = require('../container');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

// GET /api/analytics/article/:articleId - chart data: timeline, views and publish markers
exports.getArticleTimeline = asyncHandler(async (req, res) => {
  res.json(await analyticsService.timeline(req.params.articleId, req.query.hours));
});

// POST /api/analytics/article/:articleId - records the view count of one hour manually
exports.createBucket = asyncHandler(async (req, res) => {
  const bucket = await analyticsService.createBucket(req.params.articleId, req.body);
  logger.info(`View data for article ${req.params.articleId} at ${bucket.timestamp.toISOString()} created by ${req.session.user.username}`);
  res.status(201).json({ success: true, bucket });
});

// PUT /api/analytics/article/:articleId - corrects the view count of an existing hour
exports.updateBucket = asyncHandler(async (req, res) => {
  const bucket = await analyticsService.updateBucket(req.params.articleId, req.body);
  logger.info(`View data for article ${req.params.articleId} at ${bucket.timestamp.toISOString()} updated by ${req.session.user.username}`);
  res.json({ success: true, bucket });
});

// DELETE /api/analytics/article/:articleId - clears the recorded view data for one article
exports.resetArticleViews = asyncHandler(async (req, res) => {
  const deletedBuckets = await analyticsService.reset(req.params.articleId);
  logger.info(`View data for article ${req.params.articleId} reset by ${req.session.user.username}`);
  res.json({ success: true, deletedBuckets });
});

// GET /api/analytics/articles - the list of articles to choose from in the chart menu
exports.listAnalyzableArticles = asyncHandler(async (req, res) => {
  const articles = await analyticsService.analyzableArticles();
  res.json({
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      totalViews: a.totalViews,
      updateCount: Math.max(0, (a.publishEvents || []).length - 1)
    }))
  });
});
