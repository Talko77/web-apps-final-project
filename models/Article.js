const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String, default: 'https://via.placeholder.com/600x400' }
}, { _id: false });

const articleSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['draft', 'pending', 'published', 'returned'], // בהכנה, ממתינה לאישור, פורסמה, הוחזרה לתיקונים
    default: 'draft' 
  },
  draftVersion: contentSchema,
  publishedVersion: contentSchema,
  editorNote: { type: String, default: '' },
  publishedAt: { type: Date },
  publishEvents: [{ type: Date }] // תיעוד נקודות זמן של אישור עדכונים לצורך ניתוח בגרף
}, { timestamps: true });

articleSchema.index({ 'publishedVersion.title': 'text', 'publishedVersion.category': 1 });

module.exports = mongoose.model('Article', articleSchema);