// View tracking: hourly buckets and the article total must always agree.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const createAnalyticsService = require('../services/analyticsService');
const { createMemoryRepositories } = require('./support/memoryRepositories');
const { hourBucket, parseBucket } = require('../domain/analytics');

const rejectsWith = (promise, status) => assert.rejects(promise, err => err.status === status);
const HOUR = 3600 * 1000;

describe('analyticsService', () => {
  let repos;
  let service;
  let article;
  const total = async () => (await repos.articleRepository.findById(article._id)).totalViews;

  beforeEach(async () => {
    repos = createMemoryRepositories();
    service = createAnalyticsService(repos);
    article = await repos.articleRepository.create({ isPublished: true, draftVersion: { title: 'T' } });
  });

  test('recording views fills one bucket per hour and moves the total', async () => {
    await service.recordView(article._id);
    await service.recordView(article._id);
    assert.equal(repos.analyticsRepository.buckets.length, 1);
    assert.equal(repos.analyticsRepository.buckets[0].viewsCount, 2);
    assert.equal(await total(), 2);
  });

  test('a manual bucket adds to the total, and the same hour twice is a 409', async () => {
    const timestamp = new Date(Date.now() - 5 * HOUR).toISOString();
    await service.createBucket(article._id, { timestamp, viewsCount: 10 });
    assert.equal(await total(), 10);
    await rejectsWith(service.createBucket(article._id, { timestamp, viewsCount: 3 }), 409);
  });

  test('correcting a bucket moves the total by the difference', async () => {
    const timestamp = new Date(Date.now() - 5 * HOUR).toISOString();
    await service.createBucket(article._id, { timestamp, viewsCount: 10 });
    await service.updateBucket(article._id, { timestamp, viewsCount: 4 });
    assert.equal(await total(), 4);
    await rejectsWith(service.updateBucket(article._id, { timestamp: new Date(Date.now() - 9 * HOUR), viewsCount: 1 }), 404);
  });

  test('invalid bucket input and a missing article are rejected', async () => {
    await rejectsWith(service.createBucket(article._id, { timestamp: 'not a date', viewsCount: 1 }), 400);
    await rejectsWith(service.createBucket('nope', { timestamp: new Date(Date.now() - HOUR), viewsCount: 1 }), 404);
  });

  test('reset clears the buckets and the total together', async () => {
    await service.recordView(article._id);
    assert.equal(await service.reset(article._id), 1);
    assert.equal(await total(), 0);
  });

  test('the timeline clamps the hour range and sorts publish events oldest first', async () => {
    await repos.articleRepository.update(article._id, { publishEvents: [new Date(2025, 1, 2), new Date(2025, 0, 1)] });
    const data = await service.timeline(article._id, '1');
    assert.equal(data.title, 'T');
    assert.ok(data.until - data.since >= 6 * HOUR - HOUR, 'at least about 6 hours');
    assert.ok(data.publishEvents[0] < data.publishEvents[1]);
  });
});

describe('domain/analytics', () => {
  test('hourBucket rounds down to the start of the hour', () => {
    const b = hourBucket(new Date(2025, 4, 1, 10, 42, 13, 500));
    assert.deepEqual([b.getHours(), b.getMinutes(), b.getSeconds(), b.getMilliseconds()], [10, 0, 0, 0]);
  });

  test('parseBucket accepts a past hour and a whole non-negative count only', () => {
    const past = new Date(Date.now() - 2 * HOUR);
    assert.deepEqual(parseBucket({ timestamp: past, viewsCount: '7' }), { timestamp: hourBucket(past), viewsCount: 7 });
    assert.equal(parseBucket({ timestamp: new Date(Date.now() + 2 * HOUR), viewsCount: 1 }), null);
    assert.equal(parseBucket({ timestamp: past, viewsCount: -1 }), null);
    assert.equal(parseBucket({ timestamp: past, viewsCount: 1.5 }), null);
    assert.equal(parseBucket({}), null);
  });
});
