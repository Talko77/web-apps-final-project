// Application composition root: configures Express, database connection, sessions, static assets, routes, and centralized error handling.
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const { connectDB, MONGO_URI } = require('./config/db');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

connectDB();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  // Avoid stale CSS and JavaScript while developing locally.
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

// The session store is MongoDB rather than the process memory,
// so a signed-in user stays signed in even after the server restarts.
app.set('trust proxy', 1);
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'daily_web_dev_secret_change_me',
  resave: false,
  saveUninitialized: true, // needed to track read/unread articles for guests too
  store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Available to every EJS template
app.use((req, res, next) => {
  res.locals.currentUser = (req.session && req.session.user) || null;
  next();
});

// REST API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/weather', require('./routes/weather'));

// View pages (EJS) - keeps the path structure established during the EJS migration
app.use('/', require('./routes/pages'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
let server;

if (require.main === module) {
  server = app.listen(PORT, () => logger.info(`Server listening on port ${PORT}`));

  // An unhandled error is written to the log and does not kill the process silently
  process.on('unhandledRejection', err => logger.error('unhandledRejection', err));
  process.on('uncaughtException', err => {
    logger.error('uncaughtException', err);
    if (server) server.close(() => process.exit(1));
    else process.exit(1);
  });
}

module.exports = app;
