const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Analytics = require('../models/Analytics');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { formatDateTime, formatViews } = require('../utils/viewMappers');
const { CATEGORIES, STATUS, ROLES, FEED_PAGE_SIZE } = require('../config/constants');

// מנטרל תווים מיוחדים כדי שקלט חופשי לא יתפרש כביטוי רגולרי
const escapeRegex = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sanitizeContent(body) {
  return {
    title: String(body.title || '').slice(0, 200),
    summary: String(body.summary || '').slice(0, 500),
    content: String(body.content || ''),
    category: CATEGORIES.includes(body.category) ? body.category : '',
    imageUrl: String(body.imageUrl || '')
  };
}

// בונה את שאילתת הפיד הציבורי מתוך פרמטרי ה-query
function buildFeedQuery(req) {
  const query = { isPublished: true };

  if (req.query.category && CATEGORIES.includes(req.query.category)) {
    query['publishedVersion.category'] = req.query.category;
  }

  if (req.query.search && String(req.query.search).trim()) {
    query['publishedVersion.title'] = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
  }

  // סינון נצפה / לא נצפה לפי הכתבות שנקראו ב-session הנוכחי
  const seen = (req.session.viewedArticles || []);
  if (req.query.seen === 'seen') query._id = { $in: seen };
  else if (req.query.seen === 'unseen') query._id = { $nin: seen };

  return query;
}

// GET /api/articles/feed - פיד ציבורי לגלילה אינסופית
exports.getFeed = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const query = buildFeedQuery(req);
  const sort = req.query.sortBy === 'popularity'
    ? { totalViews: -1, publishedAt: -1 }
    : { publishedAt: -1 };

  // נשלפים רק השדות שהכרטיס בפיד מציג, ולא גוף הכתבה המלא
  const articles = await Article.find(query)
    .populate('reporter', 'username displayName')
    .sort(sort)
    .skip((page - 1) * FEED_PAGE_SIZE)
    .limit(FEED_PAGE_SIZE)
    .select('publishedVersion.title publishedVersion.summary publishedVersion.category publishedVersion.imageUrl publishedAt totalViews reporter')
    .lean();

  const seen = new Set((req.session.viewedArticles || []).map(String));

  // השדות מוחזרים מעוצבים מראש כדי ש-feed.js יבנה כרטיס זהה
  // ל-views/partials/public/article-card.ejs ללא לוגיקת תצוגה בלקוח
  res.json({
    page,
    hasMore: articles.length === FEED_PAGE_SIZE,
    articles: articles.map(a => ({
      _id: a._id,
      title: a.publishedVersion.title,
      summary: a.publishedVersion.summary,
      category: a.publishedVersion.category,
      imageUrl: a.publishedVersion.imageUrl,
      imageAlt: a.publishedVersion.title,
      dateLabel: formatDateTime(a.publishedAt),
      views: formatViews(a.totalViews),
      reporterName: a.reporter ? (a.reporter.displayName || a.reporter.username) : 'לא ידוע',
      seen: seen.has(String(a._id))
    }))
  });
});

// GET /api/articles/mine - כתבות הכתב המחובר בלבד
exports.getMyArticles = asyncHandler(async (req, res) => {
  const articles = await Article.find({ reporter: req.session.user._id })
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ articles });
});

// GET /api/articles/manage - כלל הכתבות במערכת, לעורך בלבד, עם סינון לפי מצב
exports.getAllForEditor = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status && Object.values(STATUS).includes(req.query.status)) {
    query.status = req.query.status;
  }

  const articles = await Article.find(query)
    .populate('reporter', 'username displayName')
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  res.json({
    articles: articles.map(a => ({
      ...a,
      reporterName: a.reporter ? (a.reporter.displayName || a.reporter.username) : 'לא ידוע',
      hasPendingUpdate: a.isPublished && a.status === STATUS.PENDING
    }))
  });
});

// GET /api/articles/:id - כתבה בודדת לעריכה או לסקירה
exports.getOne = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id)
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return res.status(404).json({ error: 'הכתבה לא נמצאה' });

  const user = req.session.user;
  // כתב רשאי לגשת רק לכתבות שלו; עורך רשאי לגשת לכולן
  if (user.role === ROLES.REPORTER && String(article.reporter._id) !== String(user._id)) {
    return res.status(403).json({ error: 'אין לך הרשאה לצפות בכתבה זו' });
  }

  res.json({ article });
});

// POST /api/articles - יצירת כתבה חדשה במצב "בהכנה"
exports.create = asyncHandler(async (req, res) => {
  const article = await Article.create({
    reporter: req.session.user._id,
    status: STATUS.DRAFT,
    draftVersion: sanitizeContent(req.body || {})
  });
  logger.info(`כתבה חדשה נוצרה ${article._id} על ידי ${req.session.user.username}`);
  res.status(201).json({ success: true, articleId: article._id });
});

// PUT /api/articles/:id - שמירה אוטומטית של הטיוטה, ללא כפתור שמור.
// הטיוטה נשמרת בשרת כך שרענון, סגירת דפדפן או מחשב אחר לא יאבדו את העבודה.
exports.saveDraft = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const article = await Article.findById(req.params.id);

  if (!article) return res.status(404).json({ error: 'הכתבה לא נמצאה' });

  // כתב עורך רק את הכתבות שלו, עורך עורך כל כתבה
  if (user.role === ROLES.REPORTER && String(article.reporter) !== String(user._id)) {
    return res.status(403).json({ error: 'אין לך הרשאה לערוך כתבה זו' });
  }

  // אין לערוך כתבה שממתינה כרגע להחלטת העורך
  if (article.status === STATUS.PENDING && user.role === ROLES.REPORTER) {
    return res.status(409).json({ error: 'הכתבה ממתינה לאישור העורך ולא ניתן לערוך אותה כעת' });
  }

  article.draftVersion = sanitizeContent(req.body || {});

  // עריכת כתבה שפורסמה מחזירה את הטיוטה למצב "בהכנה".
  // הגרסה המאושרת נשארת ב-publishedVersion וממשיכה להיות מוצגת לציבור.
  if (article.status === STATUS.PUBLISHED) article.status = STATUS.DRAFT;

  await article.save();

  res.json({
    success: true,
    articleId: article._id,
    status: article.status,
    savedAt: article.updatedAt
  });
});

// PATCH /api/articles/:id/status - מעברים בין מצבי כתבה
exports.changeStatus = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const { newStatus, editorNote } = req.body || {};
  const article = await Article.findById(req.params.id);

  if (!article) return res.status(404).json({ error: 'הכתבה לא נמצאה' });

  if (user.role === ROLES.REPORTER) {
    if (String(article.reporter) !== String(user._id)) {
      return res.status(403).json({ error: 'אין לך הרשאה לשנות כתבה זו' });
    }
    // המעבר היחיד המותר לכתב: בהכנה / הוחזרה לתיקונים -> ממתינה לאישור
    const allowed = article.status === STATUS.DRAFT || article.status === STATUS.RETURNED;
    if (!allowed || newStatus !== STATUS.PENDING) {
      return res.status(400).json({ error: 'מעבר מצב זה אינו מותר לכתב' });
    }
    if (!article.isDraftComplete()) {
      return res.status(400).json({ error: 'יש למלא כותרת, תקציר, תוכן וקטגוריה לפני ההגשה לאישור' });
    }
    article.status = STATUS.PENDING;
    article.editorNote = '';

  } else {
    // עורך: רק מתוך "ממתינה לאישור"
    if (article.status !== STATUS.PENDING) {
      return res.status(400).json({ error: 'ניתן לאשר או להחזיר רק כתבה שממתינה לאישור' });
    }

    if (newStatus === STATUS.PUBLISHED) {
      // אישור העדכון הופך את הטיוטה לגרסה המוצגת לקוראים
      article.publishedVersion = article.draftVersion.toObject();
      article.status = STATUS.PUBLISHED;
      article.isPublished = true;
      article.publishedAt = article.publishedAt || new Date();
      article.publishEvents.push(new Date()); // נקודת סימון על גרף ה-Analytics
      article.editorNote = '';

    } else if (newStatus === STATUS.RETURNED) {
      article.status = STATUS.RETURNED;
      article.editorNote = String(editorNote || '').slice(0, 1000);

    } else {
      return res.status(400).json({ error: 'מעבר מצב זה אינו מותר לעורך' });
    }
  }

  await article.save();
  logger.info(`כתבה ${article._id} עברה ל-${article.status} על ידי ${user.username}`);
  res.json({ success: true, status: article.status, isPublished: article.isPublished });
});

// DELETE /api/articles/:id - עורך בלבד. מוחק גם את התגובות ונתוני הצפייה
exports.remove = asyncHandler(async (req, res) => {
  const article = await Article.findByIdAndDelete(req.params.id);
  if (!article) return res.status(404).json({ error: 'הכתבה לא נמצאה' });

  await Promise.all([
    Comment.deleteMany({ article: article._id }),
    Analytics.deleteMany({ article: article._id })
  ]);

  logger.info(`כתבה ${article._id} נמחקה על ידי ${req.session.user.username}`);
  res.json({ success: true });
});
