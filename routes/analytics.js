// API routes for editor impact analytics and article traffic timeline queries.
const router = require('express').Router();
const c = require('../controllers/analyticsController');
const { isEditor } = require('../middleware/auth');

// The analytics data is exposed to the editor only
router.get('/articles', isEditor, c.listAnalyzableArticles);
router.get('/article/:articleId', isEditor, c.getArticleTimeline);
router.post('/article/:articleId', isEditor, c.createBucket);
router.put('/article/:articleId', isEditor, c.updateBucket);
router.delete('/article/:articleId', isEditor, c.resetArticleViews);

module.exports = router;
