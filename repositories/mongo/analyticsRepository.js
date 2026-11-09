// MongoDB implementation of the hourly view-bucket repository. Returns plain objects.
const mongoose = require('mongoose');
const Analytics = require('../../models/Analytics');
const { translateDuplicate } = require('./queryHelpers');

module.exports = {
  timeline: (articleId, since) => Analytics.find({ article: articleId, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .select('timestamp viewsCount -_id')
    .lean(),

  async totalSince(articleId, since) {
    const [row] = await Analytics.aggregate([
      // aggregate() does not cast, so the id is converted here
      { $match: { article: new mongoose.Types.ObjectId(String(articleId)), timestamp: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$viewsCount' } } }
    ]);
    return row ? row.total : 0;
  },

  // Two readers can create the same hour bucket at once; the unique index rejects the
  // second upsert (E11000), and a retry then finds the bucket and increments it
  async increment(articleId, hour) {
    const bump = () => Analytics.updateOne(
      { article: articleId, timestamp: hour },
      { $inc: { viewsCount: 1 } },
      { upsert: true }
    );
    try {
      await bump();
    } catch (err) {
      if (err.code !== 11000) throw err;
      await bump();
    }
  },

  create: fields => translateDuplicate(async () => (await Analytics.create(fields)).toObject()),

  // Sets the count of an existing bucket and returns the bucket as it was before; null when missing
  setCount: (articleId, timestamp, viewsCount) => Analytics.findOneAndUpdate(
    { article: articleId, timestamp },
    { $set: { viewsCount } }
  ).lean(),

  async deleteByArticle(articleId) {
    return (await Analytics.deleteMany({ article: articleId })).deletedCount;
  }
};
