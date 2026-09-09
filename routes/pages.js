const router = require('express').Router();
const p = require('../controllers/pageController');
const { isReporter, isEditor } = require('../middleware/auth');

// Public
router.get('/', p.home);
router.get('/search', p.search);
router.get('/articles/:id', p.articlePage);
router.get('/staff/login', p.staffLogin);

// editorial-home.ejs and technology.ejs are prototypes with content hard-coded in the markup.
// The paths are kept, but they redirect to real data-driven views instead of serving made-up content.
router.get('/editorial', (req, res) => res.redirect('/'));
router.get('/technology', (req, res) => res.redirect('/search?category=Technology'));

// Reporter area
router.get('/reporter/articles', isReporter, p.reporterArticles);
router.get('/reporter/articles/new/edit', isReporter, p.reporterEdit);
router.get('/reporter/articles/:id/edit', isReporter, p.reporterEdit);

// Editor area
router.get('/editor/reviews', isEditor, p.editorQueue);
router.get('/editor/reviews/:id', isEditor, p.editorReview);
router.get('/editor/analytics', isEditor, p.editorAnalyticsIndex);
router.get('/editor/articles/:id/analytics', isEditor, p.editorAnalytics);

module.exports = router;
