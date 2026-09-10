// API routes for article feed querying, reporter draft authoring, and editor review workflows.
const router = require('express').Router();
const c = require('../controllers/articleController');
const { isReporter, isEditor, isStaff } = require('../middleware/auth');

// Public
router.get('/feed', c.getFeed);

// Reporter
router.get('/mine', isReporter, c.getMyArticles);
router.post('/', isReporter, c.create);

// Editor
router.get('/manage', isEditor, c.getAllForEditor);
router.delete('/:id', isEditor, c.remove);

// A reporter on their own articles, an editor on every article - the check lives in the controller
router.get('/:id', isStaff, c.getOne);
router.put('/:id', isStaff, c.saveDraft);
router.patch('/:id/status', isStaff, c.changeStatus);

module.exports = router;
