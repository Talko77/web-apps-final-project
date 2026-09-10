// Centralized error handling and 404 middleware with JSON vs HTML content negotiation.
const logger = require('../utils/logger');

function wantsJson(req) {
  return req.originalUrl.startsWith('/api/') || req.xhr ||
    (req.headers.accept || '').includes('application/json');
}

// 404 - a path that did not match any route
exports.notFound = (req, res) => {
  if (wantsJson(req)) return res.status(404).json({ error: 'The requested resource was not found' });
  res.status(404).render('error', {
    pageTitle: 'Page Not Found — The Daily Web',
    title: '404 - Page Not Found',
    statusCode: 404,
    statusMessage: 'Dispatch Missing',
    message: 'The story or desk you requested has moved or does not exist.'
  });
};

// Central error handler - every error reaches here through asyncHandler
exports.errorHandler = (err, req, res, next) => {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);

  // An invalid Mongo id is a bad request, not a server error
  if (err.name === 'CastError') {
    logger.warn(`Invalid identifier at ${req.originalUrl}: ${err.value}`);
    if (wantsJson(req)) return res.status(400).json({ error: 'Invalid identifier' });
    return res.status(400).render('error', { title: 'Bad Request', message: 'The identifier provided is not valid.' });
  }

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl}`, err);
  else logger.warn(`${req.method} ${req.originalUrl} - ${err.message}`);

  const message = status >= 500 ? 'Something went wrong on our side. Please try again later.' : err.message;

  if (wantsJson(req)) return res.status(status).json({ error: message });
  res.status(status).render('error', { title: 'Error', message });
};
