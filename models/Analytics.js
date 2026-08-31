const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  timestamp: { type: Date, required: true }, // מעוגל לפי שעה
  viewsCount: { type: Number, default: 0 }
});

analyticsSchema.index({ article: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Analytics', analyticsSchema);