// Review queue: server-backed filtering of all articles in the system,
// by free-text search, category, and status.
(function () {
  'use strict';

  const table = document.getElementById('queueTable');
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const searchEl = document.getElementById('queueSearch');
  const categoryEl = document.getElementById('categoryFilter');
  const statusEl = document.getElementById('statusFilter');
  const resetEl = document.getElementById('resetFilters');
  const emptyEl = document.getElementById('queueEmptyState');
  const countEl = document.getElementById('queueCount');
  const totalEl = document.getElementById('queueTotal');
  const capNoteEl = document.getElementById('queueCapNote');

  const esc = window.api.escapeHtml;

  // Mirrors the row markup in views/pages/editor/review-queue.ejs,
  // keeping client-rendered rows visually and structurally identical.
  function rowHtml(a) {
    const updateBadge = a.isUpdate
      ? '<span class="review-queue__update-label"><span class="icon review-queue__update-icon">update</span>Update to a published story - not a new article</span>\n                    '
      : '';

    return `<tr class="review-queue__row" data-status="${esc(a.statusCode)}" data-category="${esc(a.categoryCode)}" data-title="${esc(a.title)}" data-reporter="${esc(a.reporterName)}">
                  <td class="review-queue__reporter-cell">
                    <div class="review-queue__reporter">
                      <div class="review-queue__avatar">${esc(a.initials)}</div>
                      <div>
                        <span class="review-queue__reporter-name">${esc(a.reporterName)}</span>
                        <span class="review-queue__reporter-beat">${esc(a.beat)}</span>
                      </div>
                    </div>
                  </td>
                  <td class="review-queue__headline-cell">
                    ${updateBadge}<a class="review-queue__headline" href="${esc(a.url)}">${esc(a.title)}</a>
                    <p class="review-queue__summary">${esc(a.summary)}</p>
                    <span class="review-queue__read-time">${esc(a.readLabel)}</span>
                  </td>
                  <td class="review-queue__category-cell"><span class="review-queue__category">${esc(a.category)}</span></td>
                  <td class="review-queue__status-cell">
                    <span class="review-queue__status" data-status="${esc(a.statusCode)}">
                      <span class="status-badge status-badge--pending">
                        <span class="status-badge__indicator state-loading"></span>
                        ${esc(a.statusLabel || 'Pending Review')}
                      </span>
                    </span>
                  </td>
                  <td class="review-queue__version-cell"><span class="review-queue__version">${esc(a.version)}</span></td>
                  <td class="review-queue__submitted-cell">
                    <div class="review-queue__submitted-date"><time datetime="${esc(a.submittedAt)}">${esc(a.submittedLabel)}</time></div>
                    <div class="review-queue__relative-date">${esc(a.relativeDate)}</div>
                  </td>
                  <td class="review-queue__action-cell"><a class="review-queue__review-link" href="${esc(a.url)}">Review</a></td>
                </tr>`;
  }

  function render(articles) {
    tbody.innerHTML = articles.map(rowHtml).join('');
    if (emptyEl) emptyEl.classList.toggle('state-hidden', articles.length > 0);
  }

  let activeRequest = 0;

  async function reload() {
    const requestId = ++activeRequest;
    const term = searchEl ? searchEl.value.trim() : '';
    const category = categoryEl ? categoryEl.value : '';
    const status = statusEl ? statusEl.value : '';

    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (term) params.set('search', term);

    const queryString = params.toString();
    const apiUrl = '/api/articles/manage' + (queryString ? `?${queryString}` : '');
    const pageUrl = '/editor/reviews' + (queryString ? `?${queryString}` : '');

    try {
      const data = await window.api.getJSON(apiUrl);
      if (requestId !== activeRequest) return;

      const articles = data.articles || [];
      render(articles);
      if (countEl) countEl.textContent = String(articles.length);
      if (totalEl && data.total != null) totalEl.textContent = String(data.total);
      // The server caps the rows it returns, so say when the list is only part of the matches.
      if (capNoteEl) capNoteEl.classList.toggle('state-hidden', !data.hasMore);

      window.history.replaceState(null, '', pageUrl);
    } catch (err) {
      if (requestId !== activeRequest) return;
      console.error('Failed to reload review queue:', err);
    }
  }

  if (categoryEl) {
    categoryEl.addEventListener('change', reload);
  }

  if (statusEl) {
    statusEl.addEventListener('change', reload);
  }

  if (searchEl) {
    let timer = null;
    searchEl.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        reload();
      }, 250);
    });
  }

  if (resetEl) {
    resetEl.addEventListener('click', () => {
      if (searchEl) searchEl.value = '';
      if (categoryEl) categoryEl.value = '';
      if (statusEl) statusEl.value = '';
      reload();
    });
  }

  window.addEventListener('popstate', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (searchEl) searchEl.value = urlParams.get('search') || '';
    if (categoryEl) categoryEl.value = urlParams.get('category') || '';
    if (statusEl) statusEl.value = urlParams.get('status') || '';
    reload();
  });
})();
