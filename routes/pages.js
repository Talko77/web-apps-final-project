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

// Convenience aliases and login redirects
router.get('/login', (req, res) => {
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect('/staff/login' + query);
});

router.get('/editor', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'Editor' ? '/editor/reviews' : '/reporter/articles');
  }
  return res.redirect('/staff/login?next=' + encodeURIComponent('/editor/reviews'));
});

router.get('/reporter', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(req.session.user.role === 'Reporter' ? '/reporter/articles' : '/editor/reviews');
  }
  return res.redirect('/staff/login?next=' + encodeURIComponent('/reporter/articles'));
});

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
