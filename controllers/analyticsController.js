// Handles analytics API requests: aggregated view timeline and analyzable article listings.
const Analytics = require('../models/Analytics');
const Article = require('../models/Article');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { analyzableArticles } = require('../utils/queries');

// GET /api/analytics/article/:articleId - chart data: timeline, views and publish markers
exports.getArticleTimeline = asyncHandler(async (req, res) => {
  // Three weeks by default, matching the selected option on the analytics page
  const hours = Math.min(720, Math.max(6, parseInt(req.query.hours, 10) || 504));

  const article = await Article.findById(req.params.articleId)
    .select('publishedVersion draftVersion publishEvents totalViews')
    .lean();
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const since = Analytics.hourBucket(Date.now() - hours * 3600 * 1000);

  // The data is already aggregated by hour, so this is a light indexed lookup rather than an aggregation
  const timeline = await Analytics.find({ article: article._id, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .select('timestamp viewsCount -_id')
    .lean();

  res.json({
    title: (article.publishedVersion && article.publishedVersion.title) || article.draftVersion.title,
    totalViews: article.totalViews,
    timeline,
    // Every approval, oldest first, so the client can number them even when the range cuts some off
    publishEvents: [...(article.publishEvents || [])].sort((a, b) => new Date(a) - new Date(b)),
    since,
    until: new Date()
  });
});

// Reads { timestamp, viewsCount } from the body; null when either value is invalid
function parseBucket(body) {
  const time = new Date(body.timestamp);
  const views = Number(body.viewsCount);
  if (Number.isNaN(time.getTime()) || time > new Date() || !Number.isInteger(views) || views < 0) return null;
  return { timestamp: Analytics.hourBucket(time), viewsCount: views };
}

// POST /api/analytics/article/:articleId - records the view count of one hour manually.
// The article counter moves by the same amount, so popularity sorting matches the chart.
exports.createBucket = asyncHandler(async (req, res) => {
  const bucket = parseBucket(req.body);
  if (!bucket) return res.status(400).json({ error: 'A past timestamp and a non-negative whole viewsCount are required' });

  const article = await Article.findById(req.params.articleId).select('_id');
  if (!article) return res.status(404).json({ error: 'Article not found' });

  try {
    await Analytics.create({ article: article._id, ...bucket });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'That hour already has data; update it instead' });
    throw err;
  }
  await Article.updateOne({ _id: article._id }, { $inc: { totalViews: bucket.viewsCount } }, { timestamps: false });

  logger.info(`View data for article ${article._id} at ${bucket.timestamp.toISOString()} created by ${req.session.user.username}`);
  res.status(201).json({ success: true, bucket });
});

// PUT /api/analytics/article/:articleId - corrects the view count of an existing hour
exports.updateBucket = asyncHandler(async (req, res) => {
  const bucket = parseBucket(req.body);
  if (!bucket) return res.status(400).json({ error: 'A past timestamp and a non-negative whole viewsCount are required' });

  const previous = await Analytics.findOneAndUpdate(
    { article: req.params.articleId, timestamp: bucket.timestamp },
    { $set: { viewsCount: bucket.viewsCount } }
  );
  if (!previous) return res.status(404).json({ error: 'No view data for that article and hour' });

  await Article.updateOne(
    { _id: previous.article },
    { $inc: { totalViews: bucket.viewsCount - previous.viewsCount } },
    { timestamps: false }
  );

  logger.info(`View data for article ${previous.article} at ${bucket.timestamp.toISOString()} updated by ${req.session.user.username}`);
  res.json({ success: true, bucket });
});

// DELETE /api/analytics/article/:articleId - clears the recorded view data for one article.
// The cumulative counter on the article is reset together with the hourly buckets,
// otherwise sorting by popularity would disagree with the chart.
exports.resetArticleViews = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.articleId).select('_id');
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const [removed] = await Promise.all([
    Analytics.deleteMany({ article: article._id }),
    Article.updateOne({ _id: article._id }, { $set: { totalViews: 0 } }, { timestamps: false })
  ]);

  logger.info(`View data for article ${article._id} reset by ${req.session.user.username}`);
  res.json({ success: true, deletedBuckets: removed.deletedCount });
});

// GET /api/analytics/articles - the list of articles to choose from in the chart menu
exports.listAnalyzableArticles = asyncHandler(async (req, res) => {
  const articles = await analyzableArticles();

  res.json({
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      totalViews: a.totalViews,
      updateCount: Math.max(0, (a.publishEvents || []).length - 1)
    }))
  });
});
