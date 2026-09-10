// Page controller: prepares view-models and renders server-side HTML pages for public, staff auth, reporter, and editor views.
const Article = require('../models/Article');
const Comment = require('../models/Comment');
const Analytics = require('../models/Analytics');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const m = require('../utils/viewMappers');
const { CATEGORIES, STATUS, STATUS_LABELS, ROLES, FEED_PAGE_SIZE } = require('../config/constants');

const MAX_TRACKED_VIEWS = 500;
const PUBLISHED = { isPublished: true };

// The locals that the mastheads and top headers in the templates expect on every public page
const publicChrome = (overrides = {}) => ({
  editionLabel: new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }),
  showBreaking: true,
  breakingText: 'Demo edition — all content on this site is sample data for the course project',
  searchQuery: '',
  categories: CATEGORIES,
  ...overrides
});

// An article card in the public feed
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
    reads: `${m.formatViews(article.totalViews)} views`,
    readLabel: m.readingLabel(v.content),
    author: article.reporter ? (article.reporter.displayName || article.reporter.username) : 'Unknown',
    initials: m.initials(article.reporter ? (article.reporter.displayName || article.reporter.username) : ''),
    role: v.category ? `${v.category} Reporter` : 'Reporter'
  };
}

// ---------- Public pages ----------

// GET / - the home screen. The top headlines are rendered on the server,
// and the feed below them loads and updates over Ajax without a full refresh.
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
    pageTitle: 'The Daily Web — News',
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
// Fully server-rendered: the headline, the article body and the comments are in the initial HTML,
// so the page is reachable by search engines even without running JavaScript in the browser.
exports.articlePage = asyncHandler(async (req, res, next) => {
  const article = await Article.findOne({ _id: req.params.id, isPublished: true })
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return next();

  const v = article.publishedVersion;
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'Unknown';

  const [comments, related] = await Promise.all([
    Comment.find({ article: article._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Article.find({
      ...PUBLISHED,
      _id: { $ne: article._id },
      'publishedVersion.category': v.category
    }).sort({ publishedAt: -1 }).limit(3).lean()
  ]);

  // Recording a view: an atomic $inc on the hour bucket and on the cumulative counter.
  // We do not await the result so rendering is not delayed, and a failure here does not break the page.
  Promise.all([
    Analytics.updateOne(
      { article: article._id, timestamp: Analytics.hourBucket() },
      { $inc: { viewsCount: 1 } },
      { upsert: true }
    ),
    Article.updateOne({ _id: article._id }, { $inc: { totalViews: 1 } })
  ]).catch(err => logger.error(`Recording a view failed for article ${article._id}`, err));

  // Marking the article as seen, for the "seen / unseen" filter in the feed
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
      // Paragraphs instead of raw HTML - the template escapes each paragraph and prevents tag injection
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

// GET /search - server-rendered search. The filtering on the page itself updates over Ajax.
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
    // Bounded by FEED_PAGE_SIZE: without a limit this renders every published
    // article into one page, which does not stay usable on a large database.
    Article.find(query).sort(sort).limit(FEED_PAGE_SIZE)
      .populate('reporter', 'username displayName').lean(),
    Article.countDocuments(query),
    // A grouped count in a single query instead of a separate query per category
    Article.aggregate([
      { $match: PUBLISHED },
      { $group: { _id: '$publishedVersion.category', count: { $sum: 1 } } }
    ])
  ]);

  const counts = Object.fromEntries(categoryCounts.map(c => [c._id, c.count]));

  res.render('pages/public/search-results', publicChrome({
    pageTitle: q ? `Search results: ${q}` : 'Search Articles',
    searchQuery: q,
    resultCount,
    hasMore: results.length === FEED_PAGE_SIZE,
    sort: req.query.sort === 'popularity' ? 'popularity' : 'publishedAt',
    categories: [
      { label: 'All Categories', value: '', count: Object.values(counts).reduce((a, b) => a + b, 0), checked: !category },
      ...CATEGORIES.map(c => ({ label: c, value: c, count: counts[c] || 0, checked: c === category }))
    ],
    results: results.map(toCard)
  }));
});

const CATEGORY_DESCRIPTIONS = {
  World: 'International coverage, global diplomacy, and dispatches from correspondents around the world.',
  Business: 'Markets, finance, corporate strategy, and economic analysis.',
  Technology: 'In-depth reporting on artificial intelligence, computing, cybersecurity, and digital policy.',
  Science: 'Discoveries, space exploration, environment, and scientific research.',
  Culture: 'Arts, literature, entertainment, society, and cultural commentary.',
  Sports: 'Coverage, scores, profiles, and reporting across global sports.',
  Opinion: 'Columns, perspectives, and editorial commentary from our writers and contributors.'
};

// GET /category/:category - server-rendered category page
exports.category = asyncHandler(async (req, res, next) => {
  const rawCategory = String(req.params.category || '').trim();
  const matchedCategory = CATEGORIES.find(
    c => c.toLowerCase() === rawCategory.toLowerCase()
  );

  if (!matchedCategory) return next();

  const categoryQuery = { ...PUBLISHED, 'publishedVersion.category': matchedCategory };

  // Bounded for the same reason as the search page: a category can hold
  // thousands of articles and they must not all be rendered at once.
  // The first page is server-rendered; feed.js loads the rest on scroll.
  const [articles, articleCount] = await Promise.all([
    Article.find(categoryQuery)
      .sort({ publishedAt: -1 })
      .limit(FEED_PAGE_SIZE)
      .populate('reporter', 'username displayName')
      .lean(),
    Article.countDocuments(categoryQuery)
  ]);

  const viewedIds = new Set(req.session.viewedArticles || []);
  const cards = articles.map(a => ({
    ...toCard(a),
    seen: viewedIds.has(String(a._id))
  }));

  res.render('pages/public/category', publicChrome({
    pageTitle: `${matchedCategory} — The Daily Web`,
    category: matchedCategory,
    categoryDescription: CATEGORY_DESCRIPTIONS[matchedCategory] || `Latest reporting, analysis, and dispatches in ${matchedCategory}.`,
    articles: cards,
    // The true total for the whole category, not just the rendered first page
    articleCount,
    hasMore: articles.length === FEED_PAGE_SIZE
  }));
});

// ---------- Reporter area ----------

// GET /reporter/articles
exports.reporterArticles = asyncHandler(async (req, res) => {
  const user = req.session.user;
  const articles = await Article.find({ reporter: user._id }).sort({ updatedAt: -1 }).lean();

  // A count per status, used by the filter bars
  const counts = articles.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  res.render('pages/reporter/articles', {
    pageTitle: 'My Articles',
    newsroomRole: 'Reporter',
    reporter: {
      name: user.displayName || user.username,
      desk: 'Newsroom',
      initials: m.initials(user.displayName || user.username)
    },
    statusFilters: [
      { label: 'All', count: articles.length },
      ...Object.values(STATUS).map(s => ({ label: STATUS_LABELS[s], count: counts[s] || 0 }))
    ],
    categories: ['All', ...CATEGORIES],
    articles: articles.map(m.toReporterRow),
    totalArticles: articles.length
  });
});

// GET /reporter/articles/new/edit and /reporter/articles/:id/edit
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
    pageTitle: isNew ? 'New Article' : 'Edit Article',
    newsroomRole: 'Reporter',
    article: {
      id: article ? String(article._id) : '',
      isNew,
      status: article ? article.status : STATUS.DRAFT,
      statusLabel: article ? STATUS_LABELS[article.status] : STATUS_LABELS[STATUS.DRAFT],
      // Editing is locked while the article is under editor review
      locked: Boolean(article && article.status === STATUS.PENDING),
      isPublished: Boolean(article && article.isPublished),
      liveVersion: approved ? `v${approved}.0 published` : 'Not yet published',
      draftVersion: m.versionLabel(article || { publishEvents: [] }),
      savedAt: article ? m.formatDateTime(article.updatedAt) : 'Not saved yet',
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

// ---------- Editor area ----------

// GET /editor/reviews - the review queue, with filtering by status, category and search
exports.editorQueue = asyncHandler(async (req, res) => {
  const status = Object.values(STATUS).includes(req.query.status) ? req.query.status : '';
  const query = status ? { status } : {};

  if (req.query.category && CATEGORIES.includes(req.query.category)) {
    query.$or = [
      { 'draftVersion.category': req.query.category },
      { 'publishedVersion.category': req.query.category }
    ];
  }

  if (req.query.search && String(req.query.search).trim()) {
    const term = String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: term, $options: 'i' };
    const matchingUsers = await User.find({
      $or: [{ displayName: regex }, { username: regex }]
    }).select('_id').lean();
    const reporterIds = matchingUsers.map(u => u._id);

    const searchCondition = [
      { 'draftVersion.title': regex },
      { 'publishedVersion.title': regex }
    ];
    if (reporterIds.length > 0) {
      searchCondition.push({ reporter: { $in: reporterIds } });
    }

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchCondition }];
      delete query.$or;
    } else {
      query.$or = searchCondition;
    }
  }

  const [articles, grouped] = await Promise.all([
    Article.find(query).sort({ updatedAt: -1 })
      .populate('reporter', 'username displayName').lean(),
    Article.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);

  const counts = Object.fromEntries(grouped.map(g => [g._id, g.count]));
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  res.render('pages/editor/review-queue', {
    pageTitle: 'Review Queue',
    newsroomRole: 'Editor',
    page: {
      activeStatus: status,
      activeCategory: req.query.category || '',
      searchQuery: req.query.search || '',
      totalCount: status ? (counts[status] || 0) : totalCount,
      articles: articles.map(m.toQueueRow),
      statusFilters: [
        { label: 'All', value: '', count: totalCount },
        ...Object.values(STATUS).map(s => ({ label: STATUS_LABELS[s], value: s, count: counts[s] || 0 }))
      ],
      categories: CATEGORIES
    }
  });
});

// GET /editor/reviews/:id
// Shows the published version and the version awaiting approval side by side,
// so the editor sees exactly what the public can see right now and what is about to replace it.
exports.editorReview = asyncHandler(async (req, res, next) => {
  const article = await Article.findById(req.params.id)
    .populate('reporter', 'username displayName')
    .lean();

  if (!article) return next();

  const pub = article.publishedVersion;
  const draft = article.draftVersion || {};
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'Unknown';

  const asPane = (v, label) => v ? {
    label,
    title: v.title || '(Untitled article)',
    summary: v.summary || '',
    paragraphs: String(v.content || '').split(/\n\s*\n/).filter(Boolean),
    // The raw body as well, so the editor can edit the pending version in place
    content: String(v.content || ''),
    category: v.category || 'Uncategorised',
    imageUrl: v.imageUrl || '',
    imageAlt: v.title || ''
  } : null;

  const approved = (article.publishEvents || []).length;
  const formatPubDate = d => {
    if (!d) return null;
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const pubDate = article.publishedAt || (article.publishEvents && article.publishEvents[0]);
  const submittedFormatted = m.formatDateTime(article.updatedAt);
  const submittedLabelLower = submittedFormatted
    ? (submittedFormatted.charAt(0).toLowerCase() + submittedFormatted.slice(1))
    : '';

  res.render('pages/editor/review-article', {
    pageTitle: `Review: ${draft.title || pub && pub.title || 'Article'}`,
    newsroomRole: 'Editor',
    categories: CATEGORIES,
    page: {
      categories: CATEGORIES,
      article: {
        id: String(article._id),
        status: article.status,
        statusLabel: STATUS_LABELS[article.status],
        statusClass: m.STATUS_STYLE[article.status],
        reporter: reporterName,
        initials: m.initials(reporterName),
        desk: draft.category || (pub && pub.category) || 'Uncategorised',
        category: draft.category || (pub && pub.category) || 'Uncategorised',
        submittedLabel: submittedFormatted,
        submittedLabelLower,
        views: m.formatViews(article.totalViews),
        editorNote: article.editorNote || '',
        // Whether this is an update to a published article or a brand new one
        isUpdate: Boolean(article.isPublished && article.status === STATUS.PENDING),
        canDecide: article.status === STATUS.PENDING,
        liveVersion: approved ? `v${approved}.0` : (article.isPublished ? 'v1.0' : null),
        proposedVersion: article.isPublished ? `v${approved + 1}.0` : 'v1.0',
        publishedDateLabel: formatPubDate(pubDate),
        published: asPane(pub, approved ? `v${approved}.0 — currently live` : 'Not yet published'),
        draft: asPane(draft, article.isPublished ? `v${approved + 1}.0 — pending approval` : 'New version')
      }
    }
  });
});

// GET /editor/staff - the staff directory. The first page is server-rendered and
// staffDirectory.js handles create, search, rename and delete over Ajax.
exports.staffDirectory = asyncHandler(async (req, res) => {
  const users = await User.find({}).sort({ role: 1, username: 1 });

  res.render('pages/editor/staff', {
    pageTitle: 'Staff Directory',
    newsroomRole: 'Editor',
    page: {
      currentUserId: String(req.session.user._id),
      roles: Object.values(ROLES),
      users: users.map(u => ({ ...u.toPublic(), _id: String(u._id) }))
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
    : 'Unknown';

  const events = article.publishEvents || [];
  const since = Analytics.hourBucket(Date.now() - 7 * 24 * 3600 * 1000);
  const weekViews = await Analytics.aggregate([
    { $match: { article: article._id, timestamp: { $gte: since } } },
    { $group: { _id: null, total: { $sum: '$viewsCount' } } }
  ]);

  // The list of articles to choose from in the menu
  const options = await Article.find({ isPublished: true })
    .sort({ totalViews: -1 }).limit(50)
    .select('publishedVersion.title totalViews').lean();

  res.render('pages/editor/analytics', {
    pageTitle: `Analytics: ${v.title || 'Article'}`,
    newsroomRole: 'Editor',
    page: {
      article: {
        id: String(article._id),
        title: v.title || '(Untitled article)',
        reporter: reporterName,
        imageUrl: v.imageUrl || '',
        category: v.category || 'Uncategorised'
      },
      // The template receives the id and analyticsChart.js fetches the data from the API
      articleId: String(article._id),
      articleOptions: options.map(a => ({
        id: String(a._id), title: a.publishedVersion.title, selected: String(a._id) === String(article._id)
      })),
      metrics: [
        { label: 'Total Views', value: m.formatViews(article.totalViews), comparison: 'Since publication', icon: 'visibility' },
        { label: 'Views This Week', value: m.formatViews(weekViews.length ? weekViews[0].total : 0), comparison: 'Last 7 days', icon: 'trending_up' },
        { label: 'Approved Updates', value: String(Math.max(0, events.length - 1)), comparison: 'After initial publication', icon: 'update' },
        { label: 'First Published', value: m.formatRelative(article.publishedAt), comparison: m.formatDateTime(article.publishedAt), icon: 'schedule' }
      ]
    }
  });
});

// GET /editor/analytics - redirects to the most viewed article by default
exports.editorAnalyticsIndex = asyncHandler(async (req, res, next) => {
  const top = await Article.findOne({ isPublished: true }).sort({ totalViews: -1 }).select('_id').lean();
  if (!top) return next();
  res.redirect(`/editor/articles/${top._id}/analytics`);
});

// ---------- Sign in ----------

// GET /staff/login
exports.staffLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === ROLES.EDITOR ? '/editor/reviews' : '/reporter/articles');
  }

  res.render('pages/auth/staff-login', {
    pageTitle: 'Staff Login',
    page: {
      title: 'Staff Login',
      publicationName: 'The Daily Web',
      publicWebsiteHref: '/',
      heading: 'Staff Login',
      intro: 'Sign in for reporters and editors.',
      next: req.query.next || '',
      form: {
        usernameLabel: 'Username',
        usernamePlaceholder: 'e.g. reporter1',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password',
        submitLabel: 'Sign In'
      },
      returnLabel: 'Back to public site'
    }
  });
};
