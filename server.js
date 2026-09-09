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
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

// ה-session נשמר ב-MongoDB ולא בזיכרון התהליך,
// כדי שמשתמש שהזדהה יישאר מחובר גם לאחר Restart של השרת.
app.set('trust proxy', 1);
app.use(session({
  name: 'connect.sid',
  secret: process.env.SESSION_SECRET || 'daily_web_dev_secret_change_me',
  resave: false,
  saveUninitialized: true, // נדרש למעקב "נצפה / לא נצפה" גם עבור אורחים
  store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 }),
  cookie: {
    httpOnly: true,
    maxAge: 14 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// זמין לכל תבנית EJS
app.use((req, res, next) => {
  res.locals.currentUser = (req.session && req.session.user) || null;
  next();
});

// REST API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/weather', require('./routes/weather'));

// עמודי התצוגה (EJS) - שומר על מבנה הנתיבים שנקבע במיגרציית ה-EJS
app.use('/', require('./routes/pages'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => logger.info(`השרת עלה על פורט ${PORT}`));

// חריגה לא מטופלת נרשמת ללוג ואינה מפילה את התהליך בשקט
process.on('unhandledRejection', err => logger.error('unhandledRejection', err));
process.on('uncaughtException', err => {
  logger.error('uncaughtException', err);
  server.close(() => process.exit(1));
});

module.exports = app;
