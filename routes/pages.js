const router = require('express').Router();
const p = require('../controllers/pageController');
const { isReporter, isEditor } = require('../middleware/auth');

// ציבורי
router.get('/', p.home);
router.get('/search', p.search);
router.get('/articles/:id', p.articlePage);
router.get('/staff/login', p.staffLogin);

// editorial-home.ejs ו-technology.ejs הם אב-טיפוס עם תוכן קבוע בקוד.
// הנתיבים נשמרים ומפנים לתצוגות אמיתיות מבוססות נתונים במקום להציג תוכן מומצא.
router.get('/editorial', (req, res) => res.redirect('/'));
router.get('/technology', (req, res) => res.redirect('/search?category=' + encodeURIComponent('טכנולוגיה')));

// אזור הכתב
router.get('/reporter/articles', isReporter, p.reporterArticles);
router.get('/reporter/articles/new/edit', isReporter, p.reporterEdit);
router.get('/reporter/articles/:id/edit', isReporter, p.reporterEdit);

// אזור העורך
router.get('/editor/reviews', isEditor, p.editorQueue);
router.get('/editor/reviews/:id', isEditor, p.editorReview);
router.get('/editor/analytics', isEditor, p.editorAnalyticsIndex);
router.get('/editor/articles/:id/analytics', isEditor, p.editorAnalytics);

module.exports = router;
