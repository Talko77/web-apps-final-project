// Query builders shared by the page controller and the JSON API, so both apply the same filters.
const User = require('../models/User');
const Article = require('../models/Article');
const { CATEGORIES, STATUS } = require('../config/constants');

// Escapes special characters so free-text input is not interpreted as a regular expression
const escapeRegex = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Builds the editor review queue query from the status, category and search parameters.
// The search matches the draft or published headline, or the reporter's name.
async function buildQueueQuery(params) {
  const query = {};
  if (Object.values(STATUS).includes(params.status)) query.status = params.status;

  const conditions = [];
  if (CATEGORIES.includes(params.category)) {
    conditions.push({ $or: [
      { 'draftVersion.category': params.category },
      { 'publishedVersion.category': params.category }
    ] });
  }

  const term = String(params.search || '').trim();
  if (term) {
    const regex = { $regex: escapeRegex(term), $options: 'i' };
    const reporters = await User.find({ $or: [{ displayName: regex }, { username: regex }] })
      .select('_id').lean();
    const search = [{ 'draftVersion.title': regex }, { 'publishedVersion.title': regex }];
    if (reporters.length) search.push({ reporter: { $in: reporters.map(u => u._id) } });
    conditions.push({ $or: search });
  }

  if (conditions.length) query.$and = conditions;
  return query;
}

// The most viewed published articles, offered in the Impact Analytics article menu
const analyzableArticles = () => Article.find({ isPublished: true })
  .sort({ totalViews: -1 })
  .limit(100)
  .select('publishedVersion.title totalViews publishEvents')
  .lean();

module.exports = { escapeRegex, buildQueueQuery, analyzableArticles };
