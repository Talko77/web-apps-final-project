// The editorial workflow: draft -> pending -> published / returned, plus permissions.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const createArticleService = require('../services/articleService');
const { createMemoryRepositories } = require('./support/memoryRepositories');
const { STATUS, ROLES } = require('../config/constants');

const reporter = { _id: 'rep1', role: ROLES.REPORTER, username: 'reporter1' };
const otherReporter = { _id: 'rep2', role: ROLES.REPORTER, username: 'reporter2' };
const editor = { _id: 'ed1', role: ROLES.EDITOR, username: 'editor1' };
const complete = { title: 'Title', summary: 'Summary', content: 'Body text', category: 'Science' };

// Asserts the promise rejects with the given HTTP-style status
const rejectsWith = (promise, status) => assert.rejects(promise, err => err.status === status);

describe('articleService', () => {
  let repos;
  let service;

  beforeEach(() => {
    repos = createMemoryRepositories();
    service = createArticleService(repos);
  });

  const publish = async () => {
    const a = await service.create(reporter, complete);
    await service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING });
    return service.changeStatus(editor, a._id, { newStatus: STATUS.PUBLISHED });
  };

  test('create starts a draft owned by the reporter with sanitized content', async () => {
    const a = await service.create(reporter, { title: 'x'.repeat(300), category: 'NotACategory', extra: 'ignored' });
    assert.equal(a.status, STATUS.DRAFT);
    assert.equal(a.reporter, reporter._id);
    assert.equal(a.draftVersion.title.length, 200);
    assert.equal(a.draftVersion.category, '');
    assert.equal(a.draftVersion.extra, undefined);
  });

  test('a reporter cannot read or edit another reporter\'s article', async () => {
    const a = await service.create(reporter, complete);
    await rejectsWith(service.getForUser(otherReporter, a._id), 403);
    await rejectsWith(service.saveDraft(otherReporter, a._id, complete), 403);
  });

  test('an editor can read any article', async () => {
    const a = await service.create(reporter, complete);
    assert.equal((await service.getForUser(editor, a._id))._id, a._id);
  });

  test('a missing article is 404', async () => {
    await rejectsWith(service.getForUser(editor, 'nope'), 404);
    await rejectsWith(service.remove('nope'), 404);
  });

  test('a reporter may save a partial draft (autosave)', async () => {
    const a = await service.create(reporter, {});
    const saved = await service.saveDraft(reporter, a._id, { title: 'Only a title' });
    assert.equal(saved.draftVersion.title, 'Only a title');
    assert.equal(saved.status, STATUS.DRAFT);
  });

  test('an incomplete draft cannot be submitted for review', async () => {
    const a = await service.create(reporter, { title: 'Only a title' });
    await rejectsWith(service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING }), 400);
  });

  test('a whitespace-only title does not count as complete', async () => {
    const a = await service.create(reporter, { ...complete, title: '   ' });
    await rejectsWith(service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING }), 400);
  });

  test('a complete draft is submitted and then locked for the reporter', async () => {
    const a = await service.create(reporter, complete);
    const pending = await service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING });
    assert.equal(pending.status, STATUS.PENDING);
    await rejectsWith(service.saveDraft(reporter, a._id, complete), 409);
  });

  test('a reporter can only move to pending', async () => {
    const a = await service.create(reporter, complete);
    await rejectsWith(service.changeStatus(reporter, a._id, { newStatus: STATUS.PUBLISHED }), 400);
  });

  test('approving publishes the draft and records a publish event', async () => {
    const published = await publish();
    assert.equal(published.status, STATUS.PUBLISHED);
    assert.equal(published.isPublished, true);
    assert.deepEqual(published.publishedVersion, published.draftVersion);
    assert.equal(published.publishEvents.length, 1);
    assert.ok(published.publishedAt instanceof Date);
  });

  test('the editor can only decide on a pending article', async () => {
    const a = await service.create(reporter, complete);
    await rejectsWith(service.changeStatus(editor, a._id, { newStatus: STATUS.PUBLISHED }), 400);
  });

  test('returning requires a note, and the reporter can then re-submit', async () => {
    const a = await service.create(reporter, complete);
    await service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING });
    await rejectsWith(service.changeStatus(editor, a._id, { newStatus: STATUS.RETURNED, editorNote: '  ' }), 400);

    const returned = await service.changeStatus(editor, a._id, { newStatus: STATUS.RETURNED, editorNote: 'Add a source' });
    assert.equal(returned.status, STATUS.RETURNED);
    assert.equal(returned.editorNote, 'Add a source');

    const resubmitted = await service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING });
    assert.equal(resubmitted.status, STATUS.PENDING);
    assert.equal(resubmitted.editorNote, '');
  });

  test('an unknown editor transition is rejected', async () => {
    const a = await service.create(reporter, complete);
    await service.changeStatus(reporter, a._id, { newStatus: STATUS.PENDING });
    await rejectsWith(service.changeStatus(editor, a._id, { newStatus: STATUS.DRAFT }), 400);
  });

  test('editing a published article starts a new draft while the live version stays', async () => {
    const published = await publish();
    const edited = await service.saveDraft(reporter, published._id, { ...complete, title: 'New title' });
    assert.equal(edited.status, STATUS.DRAFT);
    assert.equal(edited.isPublished, true);
    assert.equal(edited.publishedVersion.title, 'Title');
  });

  test('saving a published article with no change keeps it published', async () => {
    const published = await publish();
    const saved = await service.saveDraft(reporter, published._id, complete);
    assert.equal(saved.status, STATUS.PUBLISHED);
  });

  test('an editor edit of a published article goes straight to pending, and must be complete', async () => {
    const published = await publish();
    await rejectsWith(service.saveDraft(editor, published._id, { title: 'Partial' }), 400);
    const edited = await service.saveDraft(editor, published._id, { ...complete, title: 'Editor fix' });
    assert.equal(edited.status, STATUS.PENDING);
  });

  test('a published article with no changes cannot be re-submitted', async () => {
    const published = await publish();
    await rejectsWith(service.changeStatus(reporter, published._id, { newStatus: STATUS.PENDING }), 400);
  });

  test('approving an update adds a second publish event and keeps the first publish date', async () => {
    const first = await publish();
    await service.saveDraft(reporter, first._id, { ...complete, title: 'Update' });
    await service.changeStatus(reporter, first._id, { newStatus: STATUS.PENDING });
    const second = await service.changeStatus(editor, first._id, { newStatus: STATUS.PUBLISHED });
    assert.equal(second.publishEvents.length, 2);
    assert.equal(second.publishedVersion.title, 'Update');
    assert.equal(second.publishedAt.getTime(), first.publishedAt.getTime());
  });

  test('deleting an article removes its comments and view data', async () => {
    const a = await publish();
    await repos.commentRepository.create({ article: a._id, content: 'hi' });
    await repos.analyticsRepository.increment(a._id, new Date());
    await service.remove(a._id);
    assert.equal(await repos.articleRepository.findById(a._id), null);
    assert.equal((await repos.commentRepository.listByArticle(a._id, { limit: 10 })).length, 0);
    assert.equal(repos.analyticsRepository.buckets.length, 0);
  });
});
