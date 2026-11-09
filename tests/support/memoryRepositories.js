// In-memory repositories with the same methods the services call on the Mongo ones.
// The services run against these in the unit tests, which shows the storage really is
// replaceable without touching business logic.
const { DuplicateKeyError } = require('../../utils/errors');

let nextId = 1;
const newId = () => `id${nextId++}`;
const clone = value => (value === null || value === undefined ? null : structuredClone(value));

function createTable() {
  const rows = new Map();
  return {
    rows,
    insert(fields) {
      const row = { _id: newId(), createdAt: new Date(), updatedAt: new Date(), ...clone(fields) };
      rows.set(row._id, row);
      return clone(row);
    },
    get: id => clone(rows.get(String(id))),
    patch(id, changes) {
      const row = rows.get(String(id));
      if (!row) return null;
      Object.assign(row, clone(changes), { updatedAt: new Date() });
      return clone(row);
    },
    remove(id) {
      const row = rows.get(String(id));
      rows.delete(String(id));
      return clone(row);
    },
    all: () => [...rows.values()].map(clone)
  };
}

function createMemoryRepositories() {
  const articles = createTable();
  const comments = createTable();
  const users = createTable();
  const buckets = [];

  const articleRepository = {
    async findById(id) { return articles.get(id); },
    async findPublishedById(id) {
      const a = articles.get(id);
      return a && a.isPublished ? a : null;
    },
    async listPublished(filter, { limit }) {
      return articles.all().filter(a => a.isPublished)
        .sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0))
        .slice(0, limit);
    },
    async create(fields) {
      return articles.insert({ isPublished: false, publishedVersion: null, publishEvents: [], totalViews: 0, editorNote: '', publishedAt: null, ...fields });
    },
    async update(id, changes) { return articles.patch(id, changes); },
    async delete(id) { return articles.remove(id); },
    async addViews(id, count) {
      const row = articles.rows.get(String(id));
      if (row) row.totalViews = (row.totalViews || 0) + count;
    },
    async resetViews(id) {
      const row = articles.rows.get(String(id));
      if (row) row.totalViews = 0;
    }
  };

  const commentRepository = {
    async findById(id) { return comments.get(id); },
    async listByArticle(articleId, { limit }) {
      return comments.all().filter(c => String(c.article) === String(articleId)).slice(0, limit);
    },
    async create(fields) { return comments.insert(fields); },
    async update(id, changes) { return comments.patch(id, changes); },
    async delete(id) { return comments.remove(id); },
    async deleteByArticle(articleId) {
      comments.all().filter(c => String(c.article) === String(articleId)).forEach(c => comments.remove(c._id));
    }
  };

  const sameHour = (a, b) => new Date(a).getTime() === new Date(b).getTime();
  const analyticsRepository = {
    buckets,
    async timeline(articleId, since) {
      return buckets.filter(b => String(b.article) === String(articleId) && b.timestamp >= since);
    },
    async totalSince(articleId, since) {
      return (await this.timeline(articleId, since)).reduce((sum, b) => sum + b.viewsCount, 0);
    },
    async increment(articleId, hour) {
      const bucket = buckets.find(b => String(b.article) === String(articleId) && sameHour(b.timestamp, hour));
      if (bucket) bucket.viewsCount += 1;
      else buckets.push({ article: articleId, timestamp: hour, viewsCount: 1 });
    },
    async create(fields) {
      if (buckets.some(b => String(b.article) === String(fields.article) && sameHour(b.timestamp, fields.timestamp))) {
        throw new DuplicateKeyError();
      }
      buckets.push({ ...fields });
      return { ...fields };
    },
    async setCount(articleId, timestamp, viewsCount) {
      const bucket = buckets.find(b => String(b.article) === String(articleId) && sameHour(b.timestamp, timestamp));
      if (!bucket) return null;
      const previous = { ...bucket };
      bucket.viewsCount = viewsCount;
      return previous;
    },
    async deleteByArticle(articleId) {
      const before = buckets.length;
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (String(buckets[i].article) === String(articleId)) buckets.splice(i, 1);
      }
      return before - buckets.length;
    }
  };

  // Stores the password as given: hashing is a storage concern of the Mongo implementation
  const toPublic = u => (u ? { _id: u._id, username: u.username, displayName: u.displayName || u.username, role: u.role } : null);
  const usernameTaken = (name, exceptId) => users.all().some(u => u.username === name && u._id !== exceptId);
  const userRepository = {
    users,
    async findById(id) { return toPublic(users.get(id)); },
    async findByCredentials(username, password) {
      const u = users.all().find(x => x.username === username && x.password === password);
      return toPublic(u);
    },
    async list() { return users.all().map(toPublic); },
    async create(fields) {
      if (usernameTaken(fields.username)) throw new DuplicateKeyError();
      return toPublic(users.insert(fields));
    },
    async update(id, changes) {
      if (changes.username && usernameTaken(changes.username, String(id))) throw new DuplicateKeyError();
      return toPublic(users.patch(id, changes));
    },
    async delete(id) { return users.remove(id); },
    async countByRole(role) { return users.all().filter(u => u.role === role).length; }
  };

  return { articleRepository, commentRepository, analyticsRepository, userRepository };
}

module.exports = { createMemoryRepositories };
