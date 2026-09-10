// Model representing newsroom staff users (reporters and editors) with password hashing and role verification.
const mongoose = require('mongoose');
// bcryptjs rather than bcrypt: a pure JavaScript implementation with no native
// compilation step, so the same node_modules works on macOS, Windows and Linux
// and on any Node version
const bcrypt = require('bcryptjs');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  password: { type: String, required: true },
  displayName: { type: String, default: '' },
  role: { type: String, enum: Object.values(ROLES), required: true }
}, { timestamps: true });

// The password is one-way hashed and never stored as plain text
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// An object that is safe to return to the client - without the password
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    role: this.role
  };
};

module.exports = mongoose.model('User', userSchema);
