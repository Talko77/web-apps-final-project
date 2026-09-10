// API routes for public weather widget data with server-side caching.
const router = require('express').Router();
const { getWeather } = require('../controllers/weatherController');

router.get('/', getWeather);

module.exports = router;
