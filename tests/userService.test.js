// Staff account rules: validation, unique usernames, and keeping at least one editor.
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const createUserService = require('../services/userService');
const { createMemoryRepositories } = require('./support/memoryRepositories');
const { ROLES } = require('../config/constants');

const rejectsWith = (promise, status, message) => assert.rejects(promise, err =>
  err.status === status && (!message || err.message.includes(message)));

describe('userService', () => {
  let service;
  let editor;

  beforeEach(async () => {
    service = createUserService(createMemoryRepositories());
    editor = await service.create({ username: 'editor1', password: '123456', role: ROLES.EDITOR });
  });

  test('creates a user and never returns the password', async () => {
    const user = await service.create({ username: '  reporter1 ', password: '123456', displayName: 'Rita', role: ROLES.REPORTER });
    assert.equal(user.username, 'reporter1');
    assert.equal(user.displayName, 'Rita');
    assert.equal(user.password, undefined);
  });

  test('rejects a short username, a short password and an unknown role', async () => {
    await rejectsWith(service.create({ username: 'ab', password: '123456', role: ROLES.REPORTER }), 400, 'Username');
    await rejectsWith(service.create({ username: 'abc', password: '12345', role: ROLES.REPORTER }), 400, 'Password');
    await rejectsWith(service.create({ username: 'abc', password: '123456', role: 'Admin' }), 400, 'Role');
  });

  test('a taken username is a 400, on create and on rename', async () => {
    await rejectsWith(service.create({ username: 'editor1', password: '123456', role: ROLES.REPORTER }), 400, 'taken');
    const other = await service.create({ username: 'reporter1', password: '123456', role: ROLES.REPORTER });
    await rejectsWith(service.update(other._id, { username: 'editor1' }), 400, 'taken');
  });

  test('the last editor cannot be demoted or deleted', async () => {
    const reporter = await service.create({ username: 'reporter1', password: '123456', role: ROLES.REPORTER });
    await rejectsWith(service.update(editor._id, { role: ROLES.REPORTER }), 409, 'demoted');
    await rejectsWith(service.remove(reporter._id, editor._id), 409, 'deleted');
  });

  test('an editor can be demoted when another editor exists', async () => {
    await service.create({ username: 'editor2', password: '123456', role: ROLES.EDITOR });
    const demoted = await service.update(editor._id, { role: ROLES.REPORTER });
    assert.equal(demoted.role, ROLES.REPORTER);
  });

  test('an empty password on update leaves the password unchanged', async () => {
    const updated = await service.update(editor._id, { displayName: 'Ed', password: '' });
    assert.equal(updated.displayName, 'Ed');
    await rejectsWith(service.update(editor._id, { password: '123' }), 400, 'Password');
  });

  test('a user cannot delete their own account', async () => {
    await rejectsWith(service.remove(editor._id, editor._id), 409, 'own account');
  });

  test('a missing user is 404', async () => {
    await rejectsWith(service.update('nope', { displayName: 'x' }), 404);
    await rejectsWith(service.remove(editor._id, 'nope'), 404);
  });
});
