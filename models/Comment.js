const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  authorName: { type: String, default: 'אורח' },
  content: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);