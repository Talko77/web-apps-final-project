// ערכים קבועים המשותפים לשרת ולתצוגות
const CATEGORIES = ['חדשות', 'ספורט', 'טכנולוגיה', 'תרבות', 'כלכלה', 'בריאות'];

const STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  RETURNED: 'returned'
};

const STATUS_LABELS = {
  draft: 'בהכנה',
  pending: 'ממתינה לאישור עורך',
  published: 'פורסמה',
  returned: 'הוחזרה לתיקונים'
};

const ROLES = {
  REPORTER: 'Reporter',
  EDITOR: 'Editor'
};

const FEED_PAGE_SIZE = 20;

module.exports = { CATEGORIES, STATUS, STATUS_LABELS, ROLES, FEED_PAGE_SIZE };
