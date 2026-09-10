// View-model mapping utilities: transforms raw Mongoose documents into UI presentation models matching design tokens.
// The views are built on the design system tokens (surface-*, color-*),
// so the job here is mapping article state onto those existing tokens
// rather than inventing new class names.
const { STATUS, STATUS_LABELS } = require('../config/constants');

// Existing design tokens for each article state.
const STATUS_STYLE = {
  [STATUS.PUBLISHED]: 'surface-success color-success',
  [STATUS.PENDING]: 'surface-warning color-warning',
  [STATUS.RETURNED]: 'surface-alert color-alert',
  [STATUS.DRAFT]: 'surface-panel color-body'
};

const ACTION_ENABLED = 'surface-success color-inverse motion-colors';
const ACTION_DISABLED = 'surface-raised color-subtle state-muted control-disabled';

// The action a reporter can take on an article in its current state.
const ACTION = {
  [STATUS.DRAFT]: { label: 'Submit for Review', disabled: false },
  [STATUS.RETURNED]: { label: 'Re-submit', disabled: false },
  [STATUS.PENDING]: { label: 'Awaiting Editor', disabled: true },
  [STATUS.PUBLISHED]: { label: 'Live', disabled: true }
};

const pad = n => String(n).padStart(2, '0');

// "Today, 10:42" / "Yesterday, 16:18" / "Oct 24, 14:10"
function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(d, now)) return `Today, ${time}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (sameDay(d, yesterday)) return `Yesterday, ${time}`;

  return `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}, ${time}`;
}

// "3 hours ago" / "Yesterday" / "5 days ago"
function formatRelative(date) {
  if (!date) return '—';
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  if (hours < 48) return 'Yesterday';

  return `${Math.round(hours / 24)} days ago`;
}

// 14200 -> "14.2k"
function formatViews(count) {
  if (!count) return '0';
  if (count < 1000) return String(count);
  return `${(count / 1000).toFixed(1)}k`;
}

// Estimated reading time at roughly 200 words per minute.
function readingLabel(content) {
  const words = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

// "EV" from "Elena Vasquez"
function initials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

// Version label derived from the number of approved publications,
// noting whether an update is currently under review.
function versionLabel(article) {
  const approved = (article.publishEvents || []).length;
  if (!approved) return 'v1.0 Draft';
  const pendingUpdate = article.isPublished && article.status === STATUS.PENDING;
  return pendingUpdate ? `v${approved + 1}.0 Draft (Update)` : `v${approved}.0`;
}

// A row in the reporter's "My Articles" table.
function toReporterRow(article) {
  const status = article.status;
  const version = article.publishedVersion || article.draftVersion || {};
  const action = ACTION[status];

  // The detail line tells the reporter what is needed or where the article stands.
  let detail = version.title ? `Category: ${version.category || 'Not set'}` : 'No content yet';
  let detailClass = 'color-muted';
  if (status === STATUS.RETURNED && article.editorNote) {
    detail = `Editor note: ${article.editorNote}`;
    detailClass = 'color-alert text-medium';
  } else if (article.isPublished && status === STATUS.PENDING) {
    detail = 'Update awaiting approval — the previous version is still live';
    detailClass = 'color-alert';
  }

  return {
    id: String(article._id),
    title: version.title || '(Untitled article)',
    detail,
    detailClass,
    category: version.category || 'Uncategorised',
    status: STATUS_LABELS[status],
    statusClass: STATUS_STYLE[status],
    updated: formatDateTime(article.updatedAt),
    // Machine-readable form for the <time datetime="..."> attribute in the table
    updatedAt: article.updatedAt ? new Date(article.updatedAt).toISOString() : '',
    // Unpublished articles show a dash, which the view renders as muted.
    views: article.isPublished ? formatViews(article.totalViews) : '-',
    rowClass: article.isPublished ? 'surface-muted' : 'surface-paper',
    image: version.imageUrl || '',
    imageAlt: version.title || 'Untitled article',
    action: action.label,
    actionClass: action.disabled ? ACTION_DISABLED : ACTION_ENABLED,
    disabled: action.disabled,
    editUrl: `/reporter/articles/${article._id}/edit`
  };
}

// A row in the editor's review queue.
function toQueueRow(article) {
  const version = (article.draftVersion && article.draftVersion.title)
    ? article.draftVersion
    : (article.publishedVersion || article.draftVersion || {});
  const reporterName = article.reporter
    ? (article.reporter.displayName || article.reporter.username)
    : 'Unknown';

  return {
    id: String(article._id),
    title: version.title || '(Untitled article)',
    summary: version.summary || '',
    category: version.category || 'Uncategorised',
    categoryCode: version.category || 'Uncategorised',
    reporterName,
    initials: initials(reporterName),
    beat: version.category ? `${version.category} Desk` : 'Newsroom',
    submittedLabel: formatDateTime(article.updatedAt),
    // Machine-readable form for the <time datetime="..."> attribute in the queue
    submittedAt: article.updatedAt ? new Date(article.updatedAt).toISOString() : '',
    relativeDate: formatRelative(article.updatedAt),
    statusLabel: STATUS_LABELS[article.status],
    statusCode: article.status,
    statusClass: STATUS_STYLE[article.status],
    version: versionLabel(article),
    readLabel: readingLabel(version.content),
    url: `/editor/reviews/${article._id}`,
    // Distinguishes an update to a live article from a brand new one.
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
