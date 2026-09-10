// Handles external weather API integration with in-memory caching and graceful fallbacks.
const logger = require('../utils/logger');

const CACHE_TTL = 15 * 60 * 1000; // The value shown to the user may be up to 15 minutes behind
const CITY = process.env.WEATHER_CITY || 'Tel Aviv';

// In-process cache: thousands of concurrent visitors turn into one external call every 15 minutes.
// inFlight prevents several parallel calls for the same value when the cache expires.
let cache = null;
let cachedAt = 0;
let inFlight = null;

const FALLBACK = { city: 'Tel Aviv', temp: null, condition: 'Weather data is unavailable right now', icon: '01d' };

async function fetchFromApi() {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new Error('WEATHER_API_KEY is not set');

  const url = 'https://api.openweathermap.org/data/2.5/weather' +
    `?q=${encodeURIComponent(CITY)}&units=metric&lang=en&appid=${key}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OpenWeatherMap returned ${response.status}`);
    const data = await response.json();
    return {
      city: data.name,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      condition: data.weather[0].description,
      icon: data.weather[0].icon
    };
  } finally {
    clearTimeout(timer);
  }
}

// GET /api/weather
exports.getWeather = async (req, res) => {
  const now = Date.now();

  if (cache && now - cachedAt < CACHE_TTL) {
    return res.json({ source: 'cache', ageSeconds: Math.round((now - cachedAt) / 1000), data: cache });
  }

  try {
    if (!inFlight) {
      inFlight = fetchFromApi().finally(() => { inFlight = null; });
    }
    cache = await inFlight;
    cachedAt = Date.now();
    res.json({ source: 'api', ageSeconds: 0, data: cache });
  } catch (err) {
    logger.warn(`Weather lookup failed: ${err.message}`);
    // Return the stale cache if there is one, otherwise the fallback - the widget must not break the page
    res.json({ source: cache ? 'stale-cache' : 'fallback', data: cache || FALLBACK });
  }
};
