// MongoDB implementation of the comment repository. Returns plain objects.
const Comment = require('../../models/Comment');
const { containsText } = require('./queryHelpers');

function byArticle(articleId, search) {
  const query = { article: articleId };
  const term = String(search || '').trim();
  if (term) query.content = containsText(term);
  return query;
}

module.exports = {
  findById: id => Comment.findById(id).lean(),

  listByArticle: (articleId, { search, limit }) => Comment.find(byArticle(articleId, search))
    .sort({ createdAt: -1 }).limit(limit).lean(),

  countByArticle: articleId => Comment.countDocuments({ article: articleId }),

  async create(fields) {
    return (await Comment.create(fields)).toObject();
  },

  update: (id, changes) => Comment.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).lean(),

  delete: id => Comment.findByIdAndDelete(id).lean(),

  deleteByArticle: articleId => Comment.deleteMany({ article: articleId })
};
