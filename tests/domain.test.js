// Pure rules and formatting with no storage involved.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeContent, isDraftComplete, ownerId } = require('../domain/article');
const m = require('../utils/viewMappers');
const { STATUS } = require('../config/constants');

describe('domain/article', () => {
  test('isDraftComplete needs every field and a known category', () => {
    const ok = { title: 'T', summary: 'S', content: 'C', category: 'World' };
    assert.equal(isDraftComplete(ok), true);
    for (const missing of ['title', 'summary', 'content']) {
      assert.equal(isDraftComplete({ ...ok, [missing]: ' ' }), false, missing);
    }
    assert.equal(isDraftComplete({ ...ok, category: 'Gossip' }), false);
    assert.equal(isDraftComplete(null), false);
  });

  test('sanitizeContent keeps known fields only, as strings', () => {
    assert.deepEqual(sanitizeContent({ title: 5, hack: 'x' }),
      { title: '5', summary: '', content: '', category: '', imageUrl: '' });
  });

  test('ownerId reads a populated or a plain reporter', () => {
    assert.equal(ownerId({ reporter: { _id: 'u1' } }), 'u1');
    assert.equal(ownerId({ reporter: 'u2' }), 'u2');
    assert.equal(ownerId({ reporter: null }), null);
  });
});

describe('utils/viewMappers', () => {
  test('formatViews', () => {
    assert.equal(m.formatViews(0), '0');
    assert.equal(m.formatViews(999), '999');
    assert.equal(m.formatViews(14200), '14.2k');
  });

  test('readingLabel is at least one minute at about 200 words per minute', () => {
    assert.equal(m.readingLabel(''), '1 min read');
    assert.equal(m.readingLabel('word '.repeat(600)), '3 min read');
  });

  test('initials', () => {
    assert.equal(m.initials('Elena Vasquez'), 'EV');
    assert.equal(m.initials('  plato '), 'P');
  });

  test('versionLabel tells a first draft, a live version and a pending update apart', () => {
    assert.equal(m.versionLabel({ publishEvents: [] }), 'v1.0 Draft');
    assert.equal(m.versionLabel({ publishEvents: [1], isPublished: true, status: STATUS.PUBLISHED }), 'v1.0');
    assert.equal(m.versionLabel({ publishEvents: [1], isPublished: true, status: STATUS.PENDING }), 'v2.0 Draft (Update)');
  });
});
