// Staff account rules: valid usernames, passwords and roles, unique usernames, and
// never leaving the newsroom without an editor.
const { AppError, DuplicateKeyError } = require('../utils/errors');
const { ROLES } = require('../config/constants');

const LIST_LIMIT = 200;

function validUsername(username) {
  const name = String(username || '').trim();
  if (name.length < 3 || name.length > 30) throw new AppError(400, 'Username must be between 3 and 30 characters');
  return name;
}

function validPassword(password) {
  if (String(password || '').length < 6) throw new AppError(400, 'Password must be at least 6 characters');
  return String(password);
}

function validRole(role) {
  if (!Object.values(ROLES).includes(role)) throw new AppError(400, 'Role must be Reporter or Editor');
  return role;
}

const cleanDisplayName = value => String(value || '').trim().slice(0, 60);

// The unique username is a bad request, not a server error
async function rejectDuplicate(work) {
  try {
    return await work();
  } catch (err) {
    if (err instanceof DuplicateKeyError) throw new AppError(400, 'That username is already taken');
    throw err;
  }
}

module.exports = function createUserService({ userRepository }) {
  const isLastEditor = async user => user.role === ROLES.EDITOR &&
    (await userRepository.countByRole(ROLES.EDITOR)) <= 1;

  return {
    list: search => userRepository.list({ search, limit: LIST_LIMIT }),

    async create({ username, password, displayName, role } = {}) {
      const fields = {
        username: validUsername(username),
        password: validPassword(password),
        displayName: cleanDisplayName(displayName),
        role: validRole(role)
      };
      return rejectDuplicate(() => userRepository.create(fields));
    },

    // Every field is optional; the password changes only when a new one was typed
    async update(id, { username, password, displayName, role } = {}) {
      const user = await userRepository.findById(id);
      if (!user) throw new AppError(404, 'User not found');

      const changes = {};
      if (username !== undefined) changes.username = validUsername(username);
      if (displayName !== undefined) changes.displayName = cleanDisplayName(displayName);
      if (role !== undefined) {
        changes.role = validRole(role);
        if (role !== ROLES.EDITOR && (await isLastEditor(user))) {
          throw new AppError(409, 'This is the last editor and cannot be demoted');
        }
      }
      if (password !== undefined && String(password) !== '') changes.password = validPassword(password);

      return rejectDuplicate(() => userRepository.update(id, changes));
    },

    async remove(actingUserId, id) {
      if (String(id) === String(actingUserId)) throw new AppError(409, 'You cannot delete your own account');
      const user = await userRepository.findById(id);
      if (!user) throw new AppError(404, 'User not found');
      if (await isLastEditor(user)) throw new AppError(409, 'This is the last editor and cannot be deleted');
      await userRepository.delete(id);
      return user;
    }
  };
};
