const mongoose = require('mongoose');

// צבירה מוקדמת לפי דלי של שעה במקום שורה לכל צפייה.
// כך אלפי צפיות במקביל מתורגמות ל-$inc אטומי בודד על מסמך אחד,
// והגרף נשלף בשאילתה קלה ללא aggregation כבד.
const analyticsSchema = new mongoose.Schema({
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  timestamp: { type: Date, required: true }, // תמיד מעוגל לתחילת השעה
  viewsCount: { type: Number, default: 0 }
});

analyticsSchema.index({ article: 1, timestamp: 1 }, { unique: true });

// מעגל תאריך לתחילת השעה - מפתח הדלי
analyticsSchema.statics.hourBucket = function (date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
