const logger = require('../utils/logger');

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/') || req.xhr ||
    (req.headers.accept || '').includes('application/json');
}

// 404 - נתיב שלא הותאם לאף route
exports.notFound = (req, res) => {
  if (wantsJson(req)) return res.status(404).json({ error: 'המשאב המבוקש לא נמצא' });
  res.status(404).render('error', { title: 'הדף לא נמצא', message: 'הדף שחיפשת אינו קיים.' });
};

// מטפל שגיאות מרכזי - כל שגיאה מגיעה לכאן דרך asyncHandler
exports.errorHandler = (err, req, res, next) => {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);

  // מזהה Mongo לא תקין הוא בקשה שגויה ולא שגיאת שרת
  if (err.name === 'CastError') {
    logger.warn(`מזהה לא תקין ב-${req.originalUrl}: ${err.value}`);
    if (wantsJson(req)) return res.status(400).json({ error: 'מזהה לא תקין' });
    return res.status(400).render('error', { title: 'בקשה שגויה', message: 'המזהה שנשלח אינו תקין.' });
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);
  else logger.warn(`${req.method} ${req.originalUrl} - ${err.message}`);

  const message = status >= 500 ? 'אירעה שגיאה בשרת. נסה שוב מאוחר יותר.' : err.message;

  if (wantsJson(req)) return res.status(status).json({ error: message });
  res.status(status).render('error', { title: 'שגיאה', message });
};
