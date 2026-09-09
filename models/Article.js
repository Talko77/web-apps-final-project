const mongoose = require('mongoose');
const { CATEGORIES, STATUS } = require('../config/constants');

// שדות התוכן אינם required כדי שהשמירה האוטומטית תעבוד גם על טיוטה חלקית.
// בדיקת השלמות מתבצעת בעת ההגשה לאישור (articleController.changeStatus)
const contentSchema = new mongoose.Schema({
  title: { type: String, default: '', trim: true, maxlength: 200 },
  summary: { type: String, default: '', trim: true, maxlength: 500 },
  content: { type: String, default: '' },
  category: { type: String, default: '' },
  imageUrl: { type: String, default: '' }
}, { _id: false });

const articleSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // status = המצב העריכתי של הטיוטה
  status: {
    type: String,
    enum: Object.values(STATUS),
    default: STATUS.DRAFT
  },

  // isPublished = האם קיימת גרסה מאושרת שמוצגת לציבור.
  // מופרד מ-status כדי שכתבה שפורסמה תמשיך להיות גלויה לקוראים
  // גם כאשר עדכון שלה ממתין לאישור העורך.
  isPublished: { type: Boolean, default: false },

  draftVersion: { type: contentSchema, default: () => ({}) },
  publishedVersion: { type: contentSchema, default: null },

  editorNote: { type: String, default: '' },
  publishedAt: { type: Date, default: null },

  // נקודות הזמן שבהן העורך אישר פרסום או עדכון - מסומנות על גרף ה-Impact Analytics
  publishEvents: [{ type: Date }],

  // מצטבר בכל צפייה, מאפשר מיון לפי פופולריות בשאילתה אחת ללא aggregation
  totalViews: { type: Number, default: 0 }
}, { timestamps: true });

// אינדקסים לתמיכה בפיד מהיר גם על אלפי כתבות
articleSchema.index({ isPublished: 1, publishedAt: -1 });
articleSchema.index({ isPublished: 1, totalViews: -1 });
articleSchema.index({ isPublished: 1, 'publishedVersion.category': 1, publishedAt: -1 });
articleSchema.index({ reporter: 1, updatedAt: -1 });
articleSchema.index({ status: 1, updatedAt: -1 });

// האם התוכן שלם ומותר להגיש אותו לאישור
articleSchema.methods.isDraftComplete = function () {
  const d = this.draftVersion || {};
  return Boolean(d.title && d.summary && d.content && CATEGORIES.includes(d.category));
};

// האם קיים עדכון שממתין לאישור על כתבה שכבר מפורסמת
articleSchema.methods.hasPendingUpdate = function () {
  return this.isPublished && this.status === STATUS.PENDING;
};

module.exports = mongoose.model('Article', articleSchema);
