const rateLimit = require('express-rate-limit');

exports.commentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // דקה אחת
  max: 3, // מקסימום 3 תגובות
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'חרגת ממגבלת התגובות. ניתן לפרסם עד 3 תגובות בדקה.' }
});