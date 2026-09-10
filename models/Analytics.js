const mongoose = require('mongoose');

// Pre-aggregate into hourly buckets instead of writing one row per view.
// This way thousands of concurrent views translate into a single atomic $inc on one
// document, and the chart is fetched with a light query instead of a heavy aggregation.
const analyticsSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  timestamp: { type: Date, required: true }, // always rounded down to the start of the hour
  viewsCount: { type: Number, default: 0 }
});

analyticsSchema.index({ article: 1, timestamp: 1 }, { unique: true });

// Rounds a date down to the start of the hour - the bucket key
analyticsSchema.statics.hourBucket = function (date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
