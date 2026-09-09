// Wraps an async controller and forwards every error to the central error handler,
// so an unhandled rejection does not bring the server down
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
