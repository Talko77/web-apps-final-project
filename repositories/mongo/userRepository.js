// MongoDB implementation of the staff user repository.
// Returns public user objects only - the password hash never leaves this file.
// Hashing happens in the model's pre('save') hook, so writes go through save().
const User = require('../../models/User');
const { containsText, translateDuplicate } = require('./queryHelpers');

const toPublic = doc => (doc ? { ...doc.toPublic(), _id: doc._id } : null);

module.exports = {
  async findById(id) {
    return toPublic(await User.findById(id));
  },

  // The user when the username and password match, otherwise null
  async findByCredentials(username, password) {
    const user = await User.findOne({ username: String(username).trim() });
    if (!user || !(await user.verifyPassword(String(password)))) return null;
    return toPublic(user);
  },

  async list({ search, limit } = {}) {
    const term = String(search || '').trim();
    const query = term ? { $or: [{ username: containsText(term) }, { displayName: containsText(term) }] } : {};
    let cursor = User.find(query).sort({ role: 1, username: 1 });
    if (limit) cursor = cursor.limit(limit);
    return (await cursor).map(toPublic);
  },

  // create() rather than insertMany() so the password hashing hook runs
  create: fields => translateDuplicate(async () => toPublic(await User.create(fields))),

  // save() rather than findByIdAndUpdate(): the hashing hook only runs on save,
  // so an update through the query API would store the password as plain text
  update: (id, changes) => translateDuplicate(async () => {
    const user = await User.findById(id);
    if (!user) return null;
    user.set(changes);
    await user.save();
    return toPublic(user);
  }),

  delete: id => User.findByIdAndDelete(id),

  countByRole: role => User.countDocuments({ role })
};
