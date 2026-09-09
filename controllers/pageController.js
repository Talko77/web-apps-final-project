const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Analytics = require('../models/Analytics');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const m = require('../utils/viewMappers');
const { CATEGORIES, STATUS, STATUS_LABELS, ROLES, FEED_PAGE_SIZE } = require('../config/constants');

const MAX_TRACKED_VIEWS = 500;
const PUBLISHED = { isPublished: true };

// locals שהכותרות והכותרים העליונים בתבניות מצפים להם בכל עמוד ציבורי
const publicChrome = (overrides = {}) => ({
  editionLabel: new Date().toLocaleDateString('he-IL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }),
  showBreaking: true,
  breakingText: 'מהדורת הדגמה - כל התכנים באתר זה הם נתוני דמה לצורכי הפרויקט',
  searchQuery: '',
  categories: CATEGORIES,
  ...overrides
});

// כרטיס כתבה בפיד הציבורי
function toCard(article) {
  const v = article.publishedVersion || {};
  return {
    id: String(article._id),
    url: `/articles/${article._id}`,
    title: v.title,
    summary: v.summary,
    category: v.category,
    imageUrl: v.imageUrl || '',
    imageAlt: v.title || '',
    dateLabel: m.formatDateTime(article.publishedAt),
    datetime: article.publishedAt ? new Date(article.publishedAt).toISOString() : '',
    views: m.formatViews(article.totalViews),
    reads: `${m.formatViews(article.totalViews)} צפיות`,
    readLabel: m.readingLabel(v.content),
    author: article.reporter ? (article.reporter.displayName || article.reporter.username) : 'לא ידוע',
    initials: m.initials(article.reporter ? (article.reporter.displayName || article.reporter.username) : ''),
    role: v.category ? `כתב ${v.category}` : 'כתב'
  };
}

// ---------- עמודים ציבוריים ----------

// GET / - מסך הבית. הכותרות העליונות מרונדרות בשרת,
// והפיד שמתחתן נטען ומתעדכן ב-Ajex ללא רענון מלא.
exports.home = asyncHandler(async (req, res) => {
  const [top, feed, mostRead] = await Promise.all([
    Article.find(PUBLISHED).sort({ publishedAt: -1 }).limit(11)
      .populate('reporter', 'username displayName').lean(),
    Article.find(PUBLISHED).sort({ publishedAt: -1 }).limit(FEED_PAGE_SIZE)
      .populate('reporter', 'username displayName').lean(),
    Article.find(PUBLISHED).sort({ totalViews: -1 }).limit(5)
      .select('publishedVersion.title publishedVersion.category totalViews').lean()
  ]);

  const cards = top.map(toCard);

  res.render('pages/public/home', publicChrome({
    pageTitle: 'The Daily Web - חדשות',
    featured: cards.slice(0, 3),
    dispatches: cards.slice(3, 11).map(c => ({
      time: c.dateLabel, category: c.category, readTime: c.readLabel, title: c.title, url: c.url
    })),
    mostRead: mostRead.map(a => ({
      url: `/articles/${a._id}`,
      title: a.publishedVersion.title,
      category: a.publishedVersion.category,
      views: m.formatViews(a.totalViews)
    })),
    feed: feed.map(toCard),
    hasMore: feed.length === FEED_PAGE_SIZE
  }));
});

// GET /articles/:id
// רינדור מלא בשרת: הכותרת, גוף הכתבה והתגובות נמצאים ב-HTML הראשוני,
// כדי שהעמוד יהיה נגיש למנועי חיפוש גם ללא הרצת JavaScript בדפדפן.
exports.articlePage = asyncHandler(async (req, res, next) => {
  const article = await Article.findOne({ _id: req.params.id, isPublished: true })
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return next();

  const v = article.publishedVersion;
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'לא ידוע';

  const [comments, related] = await Promise.all([
    Comment.find({ article: article._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Article.find({
      ...PUBLISHED,
      _id: { $ne: article._id },
      'publishedVersion.category': v.category
    }).sort({ publishedAt: -1 }).limit(3).lean()
  ]);

  // רישום צפייה: $inc אטומי על דלי השעה ועל המונה המצטבר.
  // לא ממתינים לתוצאה כדי לא לעכב את הרינדור, ותקלה כאן לא מפילה את העמוד.
  Promise.all([
    Analytics.updateOne(
      { article: article._id, timestamp: Analytics.hourBucket() },
      { $inc: { viewsCount: 1 } },
      { upsert: true }
    ),
    Article.updateOne({ _id: article._id }, { $inc: { totalViews: 1 } })
  ]).catch(err => logger.error(`רישום צפייה נכשל לכתבה ${article._id}`, err));

  // סימון הכתבה כנצפית, לצורך סינון "נצפה / לא נצפה" בפיד
  if (!req.session.viewedArticles) req.session.viewedArticles = [];
  const id = String(article._id);
  if (!req.session.viewedArticles.includes(id)) {
    req.session.viewedArticles.push(id);
    if (req.session.viewedArticles.length > MAX_TRACKED_VIEWS) req.session.viewedArticles.shift();
  }

  res.render('pages/public/article', publicChrome({
    pageTitle: v.title,
    article: {
      id,
      title: v.title,
      summary: v.summary,
      // פסקאות במקום HTML גולמי - התבנית מקודדת כל פסקה ומונעת הזרקת תגיות
      paragraphs: String(v.content || '').split(/\n\s*\n/).filter(Boolean),
      category: v.category,
      imageUrl: v.imageUrl || '',
      imageAlt: v.title,
      reporterName,
      initials: m.initials(reporterName),
      dateLabel: m.formatDateTime(article.publishedAt),
      datetime: new Date(article.publishedAt).toISOString(),
      readLabel: m.readingLabel(v.content),
      views: m.formatViews(article.totalViews),
      updateCount: Math.max(0, (article.publishEvents || []).length - 1)
    },
    tags: [v.category].filter(Boolean),
    related: related.map(toCard),
    commentsCount: comments.length,
    comments: comments.map(c => ({
      id: String(c._id),
      initials: m.initials(c.authorName),
      author: c.authorName,
      datetime: new Date(c.createdAt).toISOString(),
      dateLabel: m.formatRelative(c.createdAt),
      text: c.content
    }))
  }));
});

// GET /search - חיפוש עם רינדור בשרת. הסינון בעמוד עצמו מתעדכן ב-Ajax.
exports.search = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const category = CATEGORIES.includes(req.query.category) ? req.query.category : '';
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const query = { ...PUBLISHED };
  if (q) query['publishedVersion.title'] = { $regex: escaped, $options: 'i' };
  if (category) query['publishedVersion.category'] = category;

  const sort = req.query.sort === 'popularity'
    ? { totalViews: -1, publishedAt: -1 }
    : { publishedAt: -1 };

  const [results, resultCount, categoryCounts] = await Promise.all([
    Article.find(query).sort(sort).limit(FEED_PAGE_SIZE)
      .populate('reporter', 'username displayName').lean(),
    Article.countDocuments(query),
    // ספירה מקובצת בשאילתה אחת במקום שאילתה נפרדת לכל קטגוריה
    Article.aggregate([
      { $match: PUBLISHED },
      { $group: { _id: '$publishedVersion.category', count: { $sum: 1 } } }
    ])
  ]);

  const counts = Object.fromEntries(categoryCounts.map(c => [c._id, c.count]));

  res.render('pages/public/search-results', publicChrome({
    pageTitle: q ? `תוצאות חיפוש: ${q}` : 'חיפוש כתבות',
    searchQuery: q,
    resultCount,
    sort: req.query.sort === 'popularity' ? 'popularity' : 'publishedAt',
    categories: [
      { label: 'כל הקטגוריות', value: '', count: Object.values(counts).reduce((a, b) => a + b, 0), checked: !category },
      ...CATEGORIES.map(c => ({ label: c, value: c, count: counts[c] || 0, checked: c === category }))
    ],
    results: results.map(toCard)
  }));
});

// ---------- אזור הכתב ----------

// GET /reporter/articles
exports.reporterArticles = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const articles = await Article.find({ reporter: user._id }).sort({ updatedAt: -1 }).lean();

  // מונה לכל מצב, לשימוש פסי הסינון
  const counts = articles.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  res.render('pages/reporter/articles', {
    pageTitle: 'הכתבות שלי',
    newsroomRole: 'כתב',
    reporter: {
      name: user.displayName || user.username,
      desk: 'דסק חדשות',
      initials: m.initials(user.displayName || user.username)
    },
    statusFilters: [
      { label: 'הכול', count: articles.length },
      ...Object.values(STATUS).map(s => ({ label: STATUS_LABELS[s], count: counts[s] || 0 }))
    ],
    categories: ['הכול', ...CATEGORIES],
    articles: articles.map(m.toReporterRow),
    totalArticles: articles.length
  });
});

// GET /reporter/articles/new/edit ו-/reporter/articles/:id/edit
exports.reporterEdit = asyncHandler(async (req, res, next) => {
  const user = req.session.user;
  const isNew = !req.params.id || req.params.id === 'new';

  let article = null;
  if (!isNew) {
    article = await Article.findOne({ _id: req.params.id, reporter: user._id }).lean();
    if (!article) return next();
  }

  const d = article ? (article.draftVersion || {}) : {};
  const approved = article ? (article.publishEvents || []).length : 0;

  res.render('pages/reporter/edit-article', {
    pageTitle: isNew ? 'כתבה חדשה' : 'עריכת כתבה',
    newsroomRole: 'כתב',
    article: {
      id: article ? String(article._id) : '',
      isNew,
      status: article ? article.status : STATUS.DRAFT,
      statusLabel: article ? STATUS_LABELS[article.status] : STATUS_LABELS[STATUS.DRAFT],
      // מצב עריכה נעול כשהכתבה בבדיקת העורך
      locked: Boolean(article && article.status === STATUS.PENDING),
      isPublished: Boolean(article && article.isPublished),
      liveVersion: approved ? `גרסה ${approved} מפורסמת` : 'טרם פורסמה',
      draftVersion: m.versionLabel(article || { publishEvents: [] }),
      savedAt: article ? m.formatDateTime(article.updatedAt) : 'טרם נשמר',
      title: d.title || '',
      subtitle: d.summary || '',
      body: d.content || '',
      image: d.imageUrl || '',
      imageAlt: d.title || '',
      category: d.category || '',
      categories: CATEGORIES.map(c => ({ value: c, label: c })),
      deskNotes: article ? (article.editorNote || '') : '',
      author: user.displayName || user.username
    }
  });
});

// ---------- אזור העורך ----------

// GET /editor/reviews - תור הסקירה, עם סינון לפי מצב
exports.editorQueue = asyncHandler(async (req, res) => {
  const status = Object.values(STATUS).includes(req.query.status) ? req.query.status : '';
  const query = status ? { status } : {};

  const [articles, grouped] = await Promise.all([
    Article.find(query).sort({ updatedAt: -1 }).limit(200)
      .populate('reporter', 'username displayName').lean(),
    Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);

  const counts = Object.fromEntries(grouped.map(g => [g._id, g.count]));

  res.render('pages/editor/review-queue', {
    pageTitle: 'תור הסקירה',
    newsroomRole: 'עורך',
    page: {
      activeStatus: status,
      articles: articles.map(m.toQueueRow),
      statusFilters: [
        { label: 'הכול', value: '', count: Object.values(counts).reduce((a, b) => a + b, 0) },
        ...Object.values(STATUS).map(s => ({ label: STATUS_LABELS[s], value: s, count: counts[s] || 0 }))
      ],
      categories: CATEGORIES
    }
  });
});

// GET /editor/reviews/:id
// מציג במקביל את הגרסה המפורסמת ואת הגרסה הממתינה לאישור,
// כדי שהעורך יבין בדיוק מה גלוי לציבור כרגע ומה עומד להחליף אותו.
exports.editorReview = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id)
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return next();

  const pub = article.publishedVersion;
  const draft = article.draftVersion || {};
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'לא ידוע';

  const asPane = (v, label) => v ? {
    label,
    title: v.title || '(ללא כותרת)',
    summary: v.summary || '',
    paragraphs: String(v.content || '').split(/\n\s*\n/).filter(Boolean),
    category: v.category || 'ללא קטגוריה',
    imageUrl: v.imageUrl || '',
    imageAlt: v.title || ''
  } : null;

  const approved = (article.publishEvents || []).length;

  res.render('pages/editor/review-article', {
    pageTitle: `סקירה: ${draft.title || pub && pub.title || 'כתבה'}`,
    newsroomRole: 'עורך',
    page: {
      article: {
        id: String(article._id),
        status: article.status,
        statusLabel: STATUS_LABELS[article.status],
        statusClass: m.STATUS_STYLE[article.status],
        reporter: reporterName,
        initials: m.initials(reporterName),
        desk: draft.category || (pub && pub.category) || 'ללא קטגוריה',
        submittedLabel: m.formatDateTime(article.updatedAt),
        views: m.formatViews(article.totalViews),
        editorNote: article.editorNote || '',
        // האם זה עדכון לכתבה מפורסמת או כתבה חדשה
        isUpdate: Boolean(article.isPublished && article.status === STATUS.PENDING),
        canDecide: article.status === STATUS.PENDING,
        published: asPane(pub, approved ? `גרסה ${approved} - מוצגת לציבור כרגע` : 'טרם פורסמה'),
        draft: asPane(draft, article.isPublished ? `גרסה ${approved + 1} - ממתינה לאישור` : 'גרסה חדשה')
      }
    }
  });
});

// GET /editor/articles/:id/analytics - Impact Analytics
exports.editorAnalytics = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id)
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return next();

  const v = article.publishedVersion || article.draftVersion || {};
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'לא ידוע';

  const events = article.publishEvents || [];
  const since = Analytics.hourBucket(Date.now() - 7 * 24 * 3600 * 1000);
  const weekViews = await Analytics.aggregate([
    { $match: { article: article._id, timestamp: { $gte: since } } },
    { $group: { _id: null, total: { $sum: '$viewsCount' } } }
  ]);

  // רשימת הכתבות לבחירה בתפריט
  const options = await Article.find({ isPublished: true })
    .sort({ totalViews: -1 }).limit(50)
    .select('publishedVersion.title totalViews').lean();

  res.render('pages/editor/analytics', {
    pageTitle: `סטטיסטיקות: ${v.title || 'כתבה'}`,
    newsroomRole: 'עורך',
    page: {
      article: {
        id: String(article._id),
        title: v.title || '(ללא כותרת)',
        reporter: reporterName,
        imageUrl: v.imageUrl || '',
        category: v.category || 'ללא קטגוריה'
      },
      // התבנית מקבלת את המזהה ו-analyticsChart.js שולף את הנתונים מה-API
      articleId: String(article._id),
      articleOptions: options.map(a => ({
        id: String(a._id), title: a.publishedVersion.title, selected: String(a._id) === String(article._id)
      })),
      metrics: [
        { label: 'סך הצפיות', value: m.formatViews(article.totalViews), comparison: 'מאז הפרסום', icon: 'visibility' },
        { label: 'צפיות בשבוע האחרון', value: m.formatViews(weekViews.length ? weekViews[0].total : 0), comparison: '7 ימים', icon: 'trending_up' },
        { label: 'עדכונים שאושרו', value: String(Math.max(0, events.length - 1)), comparison: 'לאחר הפרסום הראשוני', icon: 'update' },
        { label: 'פורסם לראשונה', value: m.formatRelative(article.publishedAt), comparison: m.formatDateTime(article.publishedAt), icon: 'schedule' }
      ]
    }
  });
});

// GET /editor/analytics - מפנה לכתבה הנצפית ביותר כברירת מחדל
exports.editorAnalyticsIndex = asyncHandler(async (req, res, next) => {
  const top = await Article.findOne({ isPublished: true }).sort({ totalViews: -1 }).select('_id').lean();
  if (!top) return next();
  res.redirect(`/editor/articles/${top._id}/analytics`);
});

// ---------- התחברות ----------

// GET /staff/login
exports.staffLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === ROLES.EDITOR ? '/editor/reviews' : '/reporter/articles');
  }

  res.render('pages/auth/staff-login', {
    pageTitle: 'התחברות לצוות המערכת',
    page: {
      title: 'התחברות לצוות המערכת',
      publicationName: 'The Daily Web',
      publicWebsiteHref: '/',
      heading: 'התחברות לצוות',
      intro: 'הזדהות עבור כתבים ועורכים בלבד.',
      next: req.query.next || '',
      form: {
        usernameLabel: 'שם משתמש',
        usernamePlaceholder: 'לדוגמה reporter1',
        passwordLabel: 'סיסמה',
        passwordPlaceholder: 'הזינו סיסמה',
        submitLabel: 'התחברות'
      },
      returnLabel: 'חזרה לאתר הציבורי'
    }
  });
};
