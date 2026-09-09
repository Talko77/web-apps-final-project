const router = require('express').Router();
const c = require('../controllers/articleController');
const { isAuthenticated, isReporter, isEditor, isStaff } = require('../middleware/auth');

// ציבורי
router.get('/feed', c.getFeed);

// כתב
router.get('/mine', isReporter, c.getMyArticles);
router.post('/', isReporter, c.create);

// עורך
router.get('/manage', isEditor, c.getAllForEditor);
router.delete('/:id', isEditor, c.remove);

// כתב על הכתבות שלו, עורך על כל הכתבות - הבדיקה בתוך ה-controller
router.get('/:id', isStaff, c.getOne);
router.put('/:id', isStaff, c.saveDraft);
router.patch('/:id/status', isAuthenticated, c.changeStatus);

module.exports = router;
