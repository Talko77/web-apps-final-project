// Analytics rules that depend on no framework or database.

// Rounds a date down to the start of the hour - the key of an hourly view bucket
function hourBucket(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d;
}

// Reads { timestamp, viewsCount }; null when the time is invalid or in the future,
// or the count is not a non-negative whole number
function parseBucket(body = {}) {
  const time = new Date(body.timestamp);
  const views = Number(body.viewsCount);
  if (Number.isNaN(time.getTime()) || time > new Date() || !Number.isInteger(views) || views < 0) return null;
  return { timestamp: hourBucket(time), viewsCount: views };
}

module.exports = { hourBucket, parseBucket };
