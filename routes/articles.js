const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const Analytics = require('../models/Analytics');
const { isAuthenticated, requireRole } = require('../middleware/auth');

// פיד חדשות מרושת בגלילה אינסופית - 20 כתבות בעמוד
router.get('/feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const category = req.query.category;
    const search = req.query.search;
    const sortBy = req.query.sortBy === 'popularity' ? 'popularity' : 'publishedAt';

    let query = { status: 'published' };
    if (category) query['publishedVersion.category'] = category;
    if (search) query['publishedVersion.title'] = { $regex: search, $options: 'i' };

    let articles = await Article.find(query)
      .populate('reporter', 'username')
      .sort(sortBy === 'publishedAt' ? { publishedAt: -1 } : {})
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: 'שגיאה שטעינת הפיד' });
  }
});

// SSR של עמוד כתבה נגיש למנועי חיפוש (SEO) + רישום צפייה[cite: 1]
router.get('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id).populate('reporter', 'username');
    if (!article || article.status === 'draft') return res.status(404).send('הכתבה לא נמצאה');

    // רישום צפייה במערכת הסטטיסטיקות (מעוגל לפי שעה)[cite: 1]
    const now = new Date();
    now.setMinutes(0, 0, 0);
    await Analytics.findOneAndUpdate(
      { article: article._id, timestamp: now },
      { $inc: { viewsCount: 1 } },
      { upsert: true }
    );

    res.render('article', { article });
  } catch (err) {
    res.status(500).send('שגיאת שרת');
  }
});

// שמירה אוטומטית ברקע עבור הכתב (Autosave) ללא כפתור שמירה[cite: 1]
router.post('/autosave/:id?', isAuthenticated, requireRole('Reporter'), async (req, res) => {
  try {
    const { title, summary, content, category, imageUrl } = req.body;
    let article;

    if (req.params.id) {
      article = await Article.findOne({ _id: req.params.id, reporter: req.session.user._id });
      if (!article) return res.status(404).json({ error: 'כתבה לא נמצאה' });
    } else {
      article = new Article({ reporter: req.session.user._id, status: 'draft' });
    }

    article.draftVersion = { title, summary, content, category, imageUrl };
    await article.save();

    res.json({ success: true, articleId: article._id, updatedAt: article.updatedAt });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בשמירה האוטומטית' });
  }
});

// שינוי מצבי כתבה (העברה לאישור / אישור עורך / החזרה לתיקונים)[cite: 1]
router.post('/:id/status', isAuthenticated, async (req, res) => {
  try {
    const { newStatus, editorNote } = req.body;
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: 'כתבה לא נמצאה' });

    // מעברי מצבים מורשים בלבד[cite: 1]
    if (req.session.user.role === 'Reporter') {
      if ((article.status === 'draft' || article.status === 'returned') && newStatus === 'pending') {
        article.status = 'pending';
      } else {
        return res.status(400).json({ error: 'מעבר מצב בלתי חוקי לכתב' });
      }
    } else if (req.session.user.role === 'Editor') {
      if (article.status === 'pending' && newStatus === 'published') {
        article.status = 'published';
        article.publishedVersion = { ...article.draftVersion }; // העברת הטיוטה לגרסה הציבורית[cite: 1]
        article.publishedAt = article.publishedAt || new Date();
        article.publishEvents.push(new Date()); // תיעוד נקודת העדכון בגרף[cite: 1]
      } else if (article.status === 'pending' && newStatus === 'returned') {
        article.status = 'returned';
        article.editorNote = editorNote || '';
      } else {
        return res.status(400).json({ error: 'מעבר מצב בלתי חוקי לעורך' });
      }
    }

    await article.save();
    res.json({ success: true, status: article.status });
  } catch (err) {
    res.status(500).json({ error: 'שגיאה בדיון בכתבה' });
  }
});

module.exports = router;