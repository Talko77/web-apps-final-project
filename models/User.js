const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ROLES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  password: { type: String, required: true },
  displayName: { type: String, default: '' },
  role: { type: String, enum: Object.values(ROLES), required: true }
}, { timestamps: true });

// הסיסמה עוברת גיבוב חד-כיווני ולא נשמרת כטקסט גלוי
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// אובייקט בטוח להחזרה ללקוח - ללא הסיסמה
userSchema.methods.toPublic = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    role: this.role
  };
};

module.exports = mongoose.model('User', userSchema);
