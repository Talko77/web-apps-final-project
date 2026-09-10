const Analytics = require('../models/Analytics');
const Article = require('../models/Article');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/analytics/article/:articleId - chart data: timeline, views and publish markers
exports.getArticleTimeline = asyncHandler(async (req, res) => {
  const hours = Math.min(720, Math.max(6, parseInt(req.query.hours, 10) || 96));

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
    publishEvents: (article.publishEvents || []).filter(d => new Date(d) >= since)
  });
});

// GET /api/analytics/articles - the list of articles to choose from in the chart menu
exports.listAnalyzableArticles = asyncHandler(async (req, res) => {
  const articles = await Article.find({ isPublished: true })
    .sort({ totalViews: -1 })
    .limit(100)
    .select('publishedVersion.title totalViews publishEvents')
    .lean();

  res.json({
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      totalViews: a.totalViews,
      updateCount: Math.max(0, (a.publishEvents || []).length - 1)
    }))
  });
});
