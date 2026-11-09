// MongoDB implementation of the article repository.
// Returns plain objects; filters arrive in a storage-neutral shape and are turned into
// Mongo queries here, so no other layer knows the query language.
const Article = require('../../models/Article');
const User = require('../../models/User');
const { CATEGORIES, STATUS } = require('../../config/constants');
const { containsText } = require('./queryHelpers');

const REPORTER_FIELDS = 'username displayName';

// _id breaks ties so paging stays stable
const SORTS = {
  latest: { publishedAt: -1, _id: -1 },
  popularity: { totalViews: -1, publishedAt: -1, _id: -1 }
};

// filter: { search, category, onlyIds, excludeIds } - every key optional
function publishedQuery({ search, category, onlyIds, excludeIds } = {}) {
  const query = { isPublished: true };
  const term = String(search || '').trim();
  if (term) query['publishedVersion.title'] = containsText(term);
  if (CATEGORIES.includes(category)) query['publishedVersion.category'] = category;
  if (onlyIds) query._id = { $in: onlyIds };
  else if (excludeIds) query._id = { $nin: excludeIds };
  return query;
}

// The editor queue: by status, category (draft or published), and a search over the
// draft or published headline or the reporter's name
async function queueQuery({ status, category, search } = {}) {
  const query = {};
  if (Object.values(STATUS).includes(status)) query.status = status;

  const conditions = [];
  if (CATEGORIES.includes(category)) {
    conditions.push({ $or: [
      { 'draftVersion.category': category },
      { 'publishedVersion.category': category }
    ] });
  }

  const term = String(search || '').trim();
  if (term) {
    const regex = containsText(term);
    const reporters = await User.find({ $or: [{ displayName: regex }, { username: regex }] })
      .select('_id').lean();
    const or = [{ 'draftVersion.title': regex }, { 'publishedVersion.title': regex }];
    if (reporters.length) or.push({ reporter: { $in: reporters.map(u => u._id) } });
    conditions.push({ $or: or });
  }

  if (conditions.length) query.$and = conditions;
  return query;
}

const groupCounts = grouped => Object.fromEntries(grouped.map(g => [g._id, g.count]));

module.exports = {
  findById: id => Article.findById(id).populate('reporter', REPORTER_FIELDS).lean(),

  findPublishedById: id => Article.findOne({ _id: id, isPublished: true })
    .populate('reporter', REPORTER_FIELDS).lean(),

  listPublished: (filter, { sortBy, skip = 0, limit }) => Article.find(publishedQuery(filter))
    .populate('reporter', REPORTER_FIELDS)
    .sort(SORTS[sortBy] || SORTS.latest)
    .skip(skip)
    .limit(limit)
    .lean(),

  countPublished: filter => Article.countDocuments(publishedQuery(filter)),

  // { [category]: count } - ignores the category filter, so each category shows
  // how many matches it would give
  async countPublishedByCategory(filter = {}) {
    const { category, ...rest } = filter;
    const grouped = await Article.aggregate([
      { $match: publishedQuery(rest) },
      { $group: { _id: '$publishedVersion.category', count: { $sum: 1 } } }
    ]);
    return groupCounts(grouped);
  },

  listByReporter: reporterId => Article.find({ reporter: reporterId }).sort({ updatedAt: -1 }).lean(),

  // At most `limit` rows, plus how many articles the filters actually match
  async listQueue(params, limit) {
    const query = await queueQuery(params);
    const [articles, total] = await Promise.all([
      Article.find(query).populate('reporter', REPORTER_FIELDS).sort({ updatedAt: -1 }).limit(limit).lean(),
      Article.countDocuments(query)
    ]);
    return { articles, total };
  },

  async countByStatus() {
    return groupCounts(await Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]));
  },

  async create(fields) {
    return (await Article.create(fields)).toObject();
  },

  // runValidators keeps the schema rules (enum, maxlength) that save() would apply
  update: (id, changes) => Article.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).lean(),

  delete: id => Article.findByIdAndDelete(id).lean(),

  // timestamps: false - a view is not an edit, so updatedAt (queue order) must not change
  addViews: (id, count) => Article.updateOne({ _id: id }, { $inc: { totalViews: count } }, { timestamps: false }),

  resetViews: id => Article.updateOne({ _id: id }, { $set: { totalViews: 0 } }, { timestamps: false })
};
