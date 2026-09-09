const logger = require('../utils/logger');

const CACHE_TTL = 15 * 60 * 1000; // הנתון המוצג למשתמש יכול להיות בפיגור של עד 15 דקות
const CITY = process.env.WEATHER_CITY || 'Tel Aviv';

// מטמון בתהליך: אלפי מבקרים במקביל מתורגמים לקריאה חיצונית אחת ל-15 דקות.
// inFlight מונע מספר קריאות מקבילות לאותו נתון כשהמטמון פג.
let cache = null;
let cachedAt = 0;
let inFlight = null;

const FALLBACK = { city: 'תל אביב', temp: null, condition: 'נתוני מזג האוויר אינם זמינים כרגע', icon: '01d' };

async function fetchFromApi() {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new Error('WEATHER_API_KEY חסר');

  const url = 'https://api.openweathermap.org/data/2.5/weather' +
    `?q=${encodeURIComponent(CITY)}&units=metric&lang=he&appid=${key}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`OpenWeatherMap החזיר ${response.status}`);
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
    logger.warn(`שליפת מזג אוויר נכשלה: ${err.message}`);
    // מחזירים מטמון ישן אם קיים, אחרת ברירת מחדל - הווידג'ט לא מפיל את העמוד
    res.json({ source: cache ? 'stale-cache' : 'fallback', data: cache || FALLBACK });
  }
};
