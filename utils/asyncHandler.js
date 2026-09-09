// עוטף controller אסינכרוני ומעביר כל שגיאה ל-error handler המרכזי
// כך שחריגה לא מטופלת לא תפיל את השרת
module.exports = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
