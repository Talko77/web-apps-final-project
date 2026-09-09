const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { isEditor } = require('../middleware/auth');

// נתוני הסטטיסטיקות חשופים לעורך בלבד
router.get('/articles', isEditor, c.listAnalyzableArticles);
router.get('/article/:articleId', isEditor, c.getArticleTimeline);

module.exports = router;
