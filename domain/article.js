// Article business rules that depend on no framework or database.
const { CATEGORIES } = require('../config/constants');

// Keeps only the known content fields, cut to the lengths the schema allows
function sanitizeContent(body = {}) {
  return {
    title: String(body.title || '').slice(0, 200),
    summary: String(body.summary || '').slice(0, 500),
    content: String(body.content || ''),
    category: CATEGORIES.includes(body.category) ? body.category : '',
    imageUrl: String(body.imageUrl || '')
  };
}

// Whether the content is complete and may be submitted for approval or published
function isDraftComplete(draft) {
  const d = draft || {};
  return Boolean(
    String(d.title || '').trim() &&
    String(d.summary || '').trim() &&
    String(d.content || '').trim() &&
    CATEGORIES.includes(d.category)
  );
}

// The reporter's id whether or not the reporter field was populated with the user
function ownerId(article) {
  const r = article && article.reporter;
  return r ? String(r._id || r) : null;
}

module.exports = { sanitizeContent, isDraftComplete, ownerId };
