const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

let weatherCache = null;
let lastFetchTime = 0;

router.get('/', async (req, res) => {
  const now = Date.now();
  const CACHE_DURATION = 15 * 60 * 1000; // 15 דקות במילישניות[cite: 1]

  if (weatherCache && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json({ source: 'cache', data: weatherCache });
  }

  try {
    const API_KEY = process.env.WEATHER_API_KEY || 'demo_key';
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Tel%20Aviv&units=metric&appid=${API_KEY}`);
    const data = await response.json();

    if (response.ok) {
      weatherCache = { temp: data.main.temp, city: data.name, condition: data.weather[0].description };
      lastFetchTime = now;
      return res.json({ source: 'api', data: weatherCache });
    }
    
    // מנגנון נפילה fallback
    res.json({ source: 'fallback', data: { temp: 28, city: 'תל אביב', condition: 'נאה' } });
  } catch (err) {
    res.json({ source: 'fallback', data: { temp: 28, city: 'תל אביב', condition: 'נאה' } });
  }
});

module.exports = router;