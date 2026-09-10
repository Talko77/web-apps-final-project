const router = require('express').Router();
const { getWeather } = require('../controllers/weatherController');

router.get('/', getWeather);

module.exports = router;
