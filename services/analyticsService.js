// View tracking and Impact Analytics. The hourly buckets and the article's cumulative
// counter always move together, so popularity sorting agrees with the chart.
const { AppError, DuplicateKeyError } = require('../utils/errors');
const { hourBucket, parseBucket } = require('../domain/analytics');

const HOUR = 3600 * 1000;
const BAD_BUCKET = 'A past timestamp and a non-negative whole viewsCount are required';

module.exports = function createAnalyticsService({ analyticsRepository, articleRepository }) {
  async function requireArticle(id) {
    const article = await articleRepository.findById(id);
    if (!article) throw new AppError(404, 'Article not found');
    return article;
  }

  function requireBucket(body) {
    const bucket = parseBucket(body);
    if (!bucket) throw new AppError(400, BAD_BUCKET);
    return bucket;
  }

  return {
    // A reader opened the article: one more view in this hour and in the total
    recordView: articleId => Promise.all([
      analyticsRepository.increment(articleId, hourBucket()),
      articleRepository.addViews(articleId, 1)
    ]),

    viewsSince: (articleId, since) => analyticsRepository.totalSince(articleId, hourBucket(since)),

    // Chart data for the last `hours` hours: three weeks by default, between 6 hours and 30 days
    async timeline(articleId, hoursParam) {
      const hours = Math.min(720, Math.max(6, parseInt(hoursParam, 10) || 504));
      const article = await requireArticle(articleId);
      const since = hourBucket(Date.now() - hours * HOUR);
      const timeline = await analyticsRepository.timeline(article._id, since);

      return {
        title: (article.publishedVersion && article.publishedVersion.title) || article.draftVersion.title,
        totalViews: article.totalViews,
        timeline,
        // Every approval, oldest first, so the client can number them even when the range cuts some off
        publishEvents: [...(article.publishEvents || [])].sort((a, b) => new Date(a) - new Date(b)),
        since,
        until: new Date()
      };
    },

    // Records the view count of one past hour manually
    async createBucket(articleId, body) {
      const bucket = requireBucket(body);
      const article = await requireArticle(articleId);
      try {
        await analyticsRepository.create({ article: article._id, ...bucket });
      } catch (err) {
        if (err instanceof DuplicateKeyError) throw new AppError(409, 'That hour already has data; update it instead');
        throw err;
      }
      await articleRepository.addViews(article._id, bucket.viewsCount);
      return bucket;
    },

    // Corrects the view count of an existing hour; the total moves by the difference
    async updateBucket(articleId, body) {
      const bucket = requireBucket(body);
      const previous = await analyticsRepository.setCount(articleId, bucket.timestamp, bucket.viewsCount);
      if (!previous) throw new AppError(404, 'No view data for that article and hour');
      await articleRepository.addViews(previous.article, bucket.viewsCount - previous.viewsCount);
      return bucket;
    },

    // Clears all view data of one article; returns how many hourly buckets were removed
    async reset(articleId) {
      const article = await requireArticle(articleId);
      const [deleted] = await Promise.all([
        analyticsRepository.deleteByArticle(article._id),
        articleRepository.resetViews(article._id)
      ]);
      return deleted;
    },

    // The most viewed published articles, offered in the Impact Analytics menu
    analyzableArticles: () => articleRepository.listPublished({}, { sortBy: 'popularity', limit: 100 })
  };
};
