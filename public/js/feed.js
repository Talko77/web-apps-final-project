// News feed: infinite scroll, search, filtering and sorting - all without a full page reload.
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
  let requestId = 0; // prevents a slow response from overwriting a newer result

  function params(nextPage) {
    const q = new URLSearchParams({ page: String(nextPage) });
    if (searchEl && searchEl.value.trim()) q.set('search', searchEl.value.trim());
    if (categoryEl && categoryEl.value) q.set('category', categoryEl.value);
    if (sortEl && sortEl.value) q.set('sortBy', sortEl.value);
    if (seenEl && seenEl.value) q.set('seen', seenEl.value);
    return q.toString();
  }

  // Must stay identical to the markup in views/partials/public/article-card.ejs
  function cardHtml(a) {
    const media = a.imageUrl
      ? `<div class="article-card__media"><img class="article-card__image" src="${esc(a.imageUrl)}" alt="${esc(a.imageAlt)}" loading="lazy"></div>`
      : '';
    const summary = a.summary
      ? `<p class="article-card__summary">${esc(a.summary)}</p>`
      : '';
    const seenBadge = a.seen
      ? '<span class="article-card__read-state">Read</span>'
      : '';
    const read = a.readLabel ? ` · ${esc(a.readLabel)}` : '';

    return `<article class="article-card" data-id="${esc(a._id)}" data-seen="${a.seen ? 'true' : 'false'}">
  <a class="article-card__link" href="/articles/${esc(a._id)}">
    ${media}
    <div class="article-card__body">
      <div class="article-card__meta">
        <span class="article-card__category">${esc(a.category || 'News')}</span>
        <time class="article-card__date" datetime="${esc(a.datetime || '')}">${esc(a.dateLabel || '')}</time>
      </div>
      <h2 class="article-card__title">${esc(a.title || 'Untitled article')}</h2>
      ${summary}
      <div class="article-card__footer">
        <span class="article-card__author">${esc(a.reporterName || '')}</span>
        <span class="article-card__metrics">${esc(a.views || '0')} views${read}</span>
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

    if (statusEl) window.api.flash(statusEl, 'Loading articles...', false);

    try {
      const data = await window.api.getJSON('/api/articles/feed?' + params(nextPage));

      // A response that went stale while the user changed a filter - ignore it
      if (myRequest !== requestId) return;

      if (replace) grid.innerHTML = '';
      grid.insertAdjacentHTML('beforeend', data.articles.map(cardHtml).join(''));

      page = data.page;
      hasMore = data.hasMore;

      if (!grid.children.length) {
        window.api.flash(statusEl, 'No articles match your search.', false);
      } else if (!hasMore) {
        window.api.flash(statusEl, 'You have reached the end of the feed.', false);
      } else if (statusEl) {
        statusEl.classList.add('state-hidden');
      }
    } catch (err) {
      if (myRequest === requestId) window.api.flash(statusEl, err.message, true);
    } finally {
      if (myRequest === requestId) loading = false;
    }
  }

  // Short delay so we do not fire a request on every keystroke
  let debounce = null;
  function reset() {
    clearTimeout(debounce);
    debounce = setTimeout(() => load(1, true), 300);
  }

  if (searchEl) searchEl.addEventListener('input', reset);
  [categoryEl, sortEl, seenEl].forEach(el => el && el.addEventListener('change', () => load(1, true)));

  // Load the next page as the user approaches the bottom of the feed
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) load(page + 1, false);
    }, { rootMargin: '400px' }).observe(sentinel);
  }
})();
