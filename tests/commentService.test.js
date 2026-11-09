// Comment rules: only on published articles, bounded text, author name fallback.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const createCommentService = require('../services/commentService');
const { createMemoryRepositories } = require('./support/memoryRepositories');

const rejectsWith = (promise, status) => assert.rejects(promise, err => err.status === status);

describe('commentService', () => {
  let repos;
  let service;
  let published;
  let draft;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = createCommentService(repos);
    published = await repos.articleRepository.create({ isPublished: true });
    draft = await repos.articleRepository.create({ isPublished: false });
  });

  test('a guest comment is stored trimmed under "Guest"', async () => {
    const c = await service.create(published._id, { content: '  Great piece  ' }, null);
    assert.equal(c.content, 'Great piece');
    assert.equal(c.authorName, 'Guest');
  });

  test('the name falls back to the signed-in user, and a typed name is capped at 40', async () => {
    assert.equal((await service.create(published._id, { content: 'x' }, { displayName: 'Ed' })).authorName, 'Ed');
    assert.equal((await service.create(published._id, { content: 'x', authorName: 'n'.repeat(60) })).authorName.length, 40);
  });

  test('empty and over-long comments are rejected', async () => {
    await rejectsWith(service.create(published._id, { content: '   ' }), 400);
    await rejectsWith(service.create(published._id, { content: 'x'.repeat(1001) }), 400);
  });

  test('an unpublished or missing article has no comments', async () => {
    await rejectsWith(service.create(draft._id, { content: 'hi' }), 404);
    await rejectsWith(service.listForArticle(draft._id), 404);
    await rejectsWith(service.listForArticle('nope'), 404);
  });

  test('editor moderation edits and deletes, with 404 for a missing comment', async () => {
    const c = await service.create(published._id, { content: 'typo' });
    assert.equal((await service.update(c._id, { content: 'fixed' })).content, 'fixed');
    await rejectsWith(service.update(c._id, { content: '' }), 400);
    await service.remove(c._id);
    await rejectsWith(service.remove(c._id), 404);
    await rejectsWith(service.update(c._id, { content: 'again' }), 404);
  });
});
