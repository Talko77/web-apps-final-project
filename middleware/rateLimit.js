const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// מניעת ספאם: אורח יכול לפרסם עד 3 תגובות בדקה מאותו מכשיר.
// החסימה נאכפת בשרת ולא בצד הלקוח.
exports.commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`חריגה ממגבלת תגובות מ-${req.ip}`);
    res.status(429).json({
      error: 'חרגת ממגבלת התגובות. ניתן לפרסם עד 3 תגובות בדקה. נסה שוב בעוד רגע.'
    });
  }
});

// הגנה על מסך ההתחברות מפני ניחוש סיסמאות
exports.loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`חריגה מניסיונות התחברות מ-${req.ip}`);
    res.status(429).json({ error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד מספר דקות.' });
  }
});
