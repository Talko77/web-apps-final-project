// Server-rendered page routes mapping public, auth, reporter, and editor views.
const router = require('express').Router();
const p = require('../controllers/pageController');
const { isReporter, isEditor } = require('../middleware/auth');

// Public
router.get('/', p.home);
router.get('/search', p.search);
router.get('/articles/:id', p.articlePage);
router.get('/category/:category', p.category);
router.get('/staff/login', p.staffLogin);

// Paths kept from the early prototypes, now redirecting to the real data-driven views
// so any existing link or bookmark still lands somewhere useful.
router.get('/editorial', (req, res) => res.redirect('/'));
router.get('/technology', (req, res) => res.redirect('/category/technology'));

// Reporter area
router.get('/reporter/articles', isReporter, p.reporterArticles);
router.get('/reporter/articles/new/edit', isReporter, p.reporterEdit);
router.get('/reporter/articles/:id/edit', isReporter, p.reporterEdit);

// Editor area
router.get('/editor/reviews', isEditor, p.editorQueue);
router.get('/editor/reviews/:id', isEditor, p.editorReview);
router.get('/editor/staff', isEditor, p.staffDirectory);
router.get('/editor/analytics', isEditor, p.editorAnalyticsIndex);
router.get('/editor/articles/:id/analytics', isEditor, p.editorAnalytics);

module.exports = router;
