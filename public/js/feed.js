// פיד החדשות: גלילה אינסופית, חיפוש, סינון ומיון - הכול ללא רענון מלא של העמוד.
(function () {
  'use strict';

  const grid = document.getElementById('feedGrid');
  if (!grid) return;

  const sentinel = document.getElementById('feedSentinel');
  const statusEl = document.getElementById('feedStatus');
  const searchEl = document.getElementById('feedSearch');
  const categoryEl = document.getElementById('feedCategory');
  const sortEl = document.getElementById('feedSort');
  const seenEl = document.getElementById('feedSeen');

  const esc = window.api.escapeHtml;

  let page = Number(grid.dataset.page || 1);
  let hasMore = grid.dataset.hasMore === 'true';
  let loading = false;
  let requestId = 0; // מונע מתשובה איטית לדרוס תוצאה חדשה יותר

  function params(nextPage) {
    const q = new URLSearchParams({ page: String(nextPage) });
    if (searchEl && searchEl.value.trim()) q.set('search', searchEl.value.trim());
    if (categoryEl && categoryEl.value) q.set('category', categoryEl.value);
    if (sortEl && sortEl.value) q.set('sortBy', sortEl.value);
    if (seenEl && seenEl.value) q.set('seen', seenEl.value);
    return q.toString();
  }

  // חייב להישאר זהה למבנה של views/partials/public/article-card.ejs
  function cardHtml(a) {
    const media = a.imageUrl
      ? `<div class="media-frame media-thumbnail surface-panel"><img class="width-full height-full media-cover" src="${esc(a.imageUrl)}" alt="${esc(a.imageAlt)}" loading="lazy"></div>`
      : '';
    const summary = a.summary
      ? `<p class="text-body text-1 color-muted margin-top-2">${esc(a.summary)}</p>`
      : '';
    const seenBadge = a.seen
      ? '<span class="text-caption text-1 color-muted margin-top-2 block">נקראה</span>'
      : '';
    const read = a.readLabel ? ` · ${esc(a.readLabel)}` : '';

    return `<article class="article-card surface-paper radius-card overflow-hidden shadow-subtle" data-id="${esc(a._id)}" data-seen="${a.seen ? 'true' : 'false'}">
  <a class="block" href="/articles/${esc(a._id)}">
    ${media}
    <div class="pad-4">
      <div class="flex align-center justify-between gap-2">
        <span class="text-label text-1 text-uppercase color-primary">${esc(a.category || 'חדשות')}</span>
        <span class="text-caption text-1 color-muted">${esc(a.dateLabel || '')}</span>
      </div>
      <h2 class="text-headline text-4 color-body margin-top-2">${esc(a.title || 'כתבה ללא כותרת')}</h2>
      ${summary}
      <div class="flex align-center justify-between gap-2 margin-top-3">
        <span class="text-caption text-1 color-subtle">${esc(a.reporterName || '')}</span>
        <span class="text-caption text-1 color-muted">${esc(a.views || '0')} צפיות${read}</span>
      </div>
      ${seenBadge}
    </div>
  </a>
</article>`;
  }

  async function load(nextPage, replace) {
    if (loading) return;
    loading = true;
    const myRequest = ++requestId;

    if (statusEl) window.api.flash(statusEl, 'טוען כתבות...', false);

    try {
      const data = await window.api.getJSON('/api/articles/feed?' + params(nextPage));

      // תשובה שהתיישנה בזמן שהמשתמש שינה סינון - מתעלמים ממנה
      if (myRequest !== requestId) return;

      if (replace) grid.innerHTML = '';
      grid.insertAdjacentHTML('beforeend', data.articles.map(cardHtml).join(''));

      page = data.page;
      hasMore = data.hasMore;

      if (!grid.children.length) {
        window.api.flash(statusEl, 'לא נמצאו כתבות שמתאימות לחיפוש.', false);
      } else if (!hasMore) {
        window.api.flash(statusEl, 'הגעת לסוף הפיד.', false);
      } else if (statusEl) {
        statusEl.classList.add('state-hidden');
      }
    } catch (err) {
      if (myRequest === requestId) window.api.flash(statusEl, err.message, true);
    } finally {
      if (myRequest === requestId) loading = false;
    }
  }

  // השהיה קצרה כדי לא לשלוח בקשה על כל הקשה
  let debounce = null;
  function reset() {
    clearTimeout(debounce);
    debounce = setTimeout(() => load(1, true), 300);
  }

  if (searchEl) searchEl.addEventListener('input', reset);
  [categoryEl, sortEl, seenEl].forEach(el => el && el.addEventListener('change', () => load(1, true)));

  // טעינת העמוד הבא כשהמשתמש מתקרב לתחתית הפיד
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) load(page + 1, false);
    }, { rootMargin: '400px' }).observe(sentinel);
  }
})();
