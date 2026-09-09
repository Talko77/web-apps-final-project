// ממיר מסמכי Mongoose לשדות שהתבניות הקיימות מצפות להם.
// התבניות בנויות סביב טוקני העיצוב של המערכת (surface-*, color-*),
// ולכן המפתח כאן הוא מיפוי מצב הכתבה לאותם טוקנים ולא המצאת מחלקות חדשות.
const { STATUS, STATUS_LABELS } = require('../config/constants');

// טוקני העיצוב הקיימים לכל מצב כתבה
const STATUS_STYLE = {
  [STATUS.PUBLISHED]: 'surface-success color-success',
  [STATUS.PENDING]: 'surface-warning color-warning',
  [STATUS.RETURNED]: 'surface-alert color-alert',
  [STATUS.DRAFT]: 'surface-panel color-body'
};

const ACTION_ENABLED = 'surface-success color-inverse motion-colors';
const ACTION_DISABLED = 'surface-raised color-subtle state-muted control-disabled';

// הפעולה שהכתב יכול לבצע על הכתבה במצבה הנוכחי
const ACTION = {
  [STATUS.DRAFT]: { label: 'הגש לאישור', disabled: false },
  [STATUS.RETURNED]: { label: 'הגש מחדש', disabled: false },
  [STATUS.PENDING]: { label: 'ממתינה לעורך', disabled: true },
  [STATUS.PUBLISHED]: { label: 'מפורסמת', disabled: true }
};

const pad = n => String(n).padStart(2, '0');

// "היום, 10:42" / "אתמול, 16:18" / "24 באוק׳, 14:10"
function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(d, now)) return `היום, ${time}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (sameDay(d, yesterday)) return `אתמול, ${time}`;

  return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}, ${time}`;
}

// "לפני 3 שעות" / "אתמול" / "לפני 5 ימים"
function formatRelative(date) {
  if (!date) return '—';
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'עכשיו';
  if (minutes < 60) return `לפני ${minutes} דקות`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  if (hours < 48) return 'אתמול';

  return `לפני ${Math.round(hours / 24)} ימים`;
}

// 14200 -> "14.2k"
function formatViews(count) {
  if (!count) return '0';
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

// זמן קריאה משוער לפי קצב של 200 מילים לדקה
function readingLabel(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} דקות קריאה`;
}

// "ד.ל" מתוך "דנה לוי"
function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('.');
}

// מספר גרסה נגזר ממספר אישורי הפרסום, ומציין אם קיים עדכון בבדיקה
function versionLabel(article) {
  const approved = (article.publishEvents || []).length;
  if (!approved) return 'טיוטה ראשונה';
  const pendingUpdate = article.isPublished && article.status === STATUS.PENDING;
  return pendingUpdate ? `גרסה ${approved + 1} (עדכון בבדיקה)` : `גרסה ${approved}`;
}

// שורה בטבלת "הכתבות שלי" של הכתב
function toReporterRow(article) {
  const status = article.status;
  const version = article.publishedVersion || article.draftVersion || {};
  const action = ACTION[status];

  // הפירוט מסביר לכתב מה נדרש ממנו או מה מצב הכתבה
  let detail = version.title ? `קטגוריה: ${version.category || 'לא נבחרה'}` : 'טרם הוזן תוכן';
  let detailClass = 'color-muted';
  if (status === STATUS.RETURNED && article.editorNote) {
    detail = `הערת עורך: ${article.editorNote}`;
    detailClass = 'color-alert text-medium';
  } else if (article.isPublished && status === STATUS.PENDING) {
    detail = 'עדכון ממתין לאישור, הגרסה הקודמת עדיין מפורסמת';
    detailClass = 'color-alert';
  }

  return {
    id: String(article._id),
    title: version.title || '(כתבה ללא כותרת)',
    detail,
    detailClass,
    category: version.category || 'ללא קטגוריה',
    status: STATUS_LABELS[status],
    statusClass: STATUS_STYLE[status],
    updated: formatDateTime(article.updatedAt),
    // כתבה שלא פורסמה מציגה מקף, והתבנית צובעת אותו כמוחלש
    views: article.isPublished ? formatViews(article.totalViews) : '-',
    rowClass: article.isPublished ? 'surface-muted' : 'surface-paper',
    image: version.imageUrl || '',
    imageAlt: version.title || 'כתבה ללא כותרת',
    action: action.label,
    actionClass: action.disabled ? ACTION_DISABLED : ACTION_ENABLED,
    disabled: action.disabled,
    editUrl: `/reporter/articles/${article._id}/edit`
  };
}

// שורה בתור הסקירה של העורך
function toQueueRow(article) {
  const version = article.draftVersion || {};
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'לא ידוע';

  return {
    id: String(article._id),
    title: version.title || '(כתבה ללא כותרת)',
    summary: version.summary || '',
    category: version.category || 'ללא קטגוריה',
    categoryCode: version.category || 'ללא קטגוריה',
    reporterName,
    initials: initials(reporterName),
    beat: version.category ? `כתב ${version.category}` : 'כתב',
    submittedLabel: formatDateTime(article.updatedAt),
    relativeDate: formatRelative(article.updatedAt),
    statusLabel: STATUS_LABELS[article.status],
    statusCode: article.status,
    statusClass: STATUS_STYLE[article.status],
    version: versionLabel(article),
    readLabel: readingLabel(version.content),
    url: `/editor/reviews/${article._id}`,
    // מבדיל עדכון לכתבה מפורסמת מכתבה חדשה לגמרי
    isUpdate: Boolean(article.isPublished && article.status === STATUS.PENDING)
  };
}

module.exports = {
  STATUS_STYLE,
  formatDateTime,
  formatRelative,
  formatViews,
  readingLabel,
  initials,
  versionLabel,
  toReporterRow,
  toQueueRow
};
