// API routes for public guest comments and editor comment moderation.
const router = require('express').Router();
const c = require('../controllers/commentController');
const { commentLimiter } = require('../middleware/rateLimit');
const { isEditor } = require('../middleware/auth');

router.get('/article/:articleId', c.listByArticle);
router.post('/article/:articleId', commentLimiter, c.create);
router.delete('/:id', isEditor, c.remove);

module.exports = router;
