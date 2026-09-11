// API routes for editor-only staff account management.
const router = require('express').Router();
const c = require('../controllers/userController');
const { isEditor } = require('../middleware/auth');

// Staff accounts are managed by editors only
router.get('/', isEditor, c.list);
router.post('/', isEditor, c.create);
router.put('/:id', isEditor, c.update);
router.delete('/:id', isEditor, c.remove);

module.exports = router;
