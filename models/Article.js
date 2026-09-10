// Model representing articles with separate draft and published revisions, workflow statuses, and view metrics.
const mongoose = require('mongoose');
const { CATEGORIES, STATUS } = require('../config/constants');

// The content fields are not required so reporters can explicitly save a partial draft.
// The completeness check happens when the draft is submitted for review
// (articleController.changeStatus)
const contentSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true, maxlength: 200 },
  summary: { type: String, default: '', trim: true, maxlength: 500 },
  content: { type: String, default: '' },
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' }
}, { _id: false });

const articleSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // status = the editorial state of the draft
  status: {
    type: String,
    enum: Object.values(STATUS),
    default: STATUS.DRAFT
  },

  // isPublished = whether an approved version exists that is shown to the public.
  // Kept separate from status so that a published article stays visible to readers
  // even while an update to it is waiting for the editor's approval.
  isPublished: { type: Boolean, default: false },

  draftVersion: { type: contentSchema, default: () => ({}) },
  publishedVersion: { type: contentSchema, default: null },

  editorNote: { type: String, default: '' },
  publishedAt: { type: Date, default: null },

  // The points in time when the editor approved a publish or an update - marked on the
  // Impact Analytics chart
  publishEvents: [{ type: Date }],

  // Incremented on every view, which allows sorting by popularity in a single query
  // without an aggregation
  totalViews: { type: Number, default: 0 }
}, { timestamps: true });

// Indexes that keep the feed fast even across thousands of articles
articleSchema.index({ isPublished: 1, publishedAt: -1 });
articleSchema.index({ isPublished: 1, totalViews: -1 });
articleSchema.index({ isPublished: 1, 'publishedVersion.category': 1, publishedAt: -1 });
articleSchema.index({ reporter: 1, updatedAt: -1 });
articleSchema.index({ status: 1, updatedAt: -1 });

// Whether the content is complete and may be submitted for approval
articleSchema.methods.isDraftComplete = function () {
  const d = this.draftVersion || {};
  return Boolean(d.title && d.summary && d.content && CATEGORIES.includes(d.category));
};

// Whether an update is waiting for approval on an article that is already published
articleSchema.methods.hasPendingUpdate = function () {
  return this.isPublished && this.status === STATUS.PENDING;
};

module.exports = mongoose.model('Article', articleSchema);
