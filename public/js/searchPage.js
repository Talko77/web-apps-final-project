// Search page: the search box, category and sort filters update the results without a reload.
// feed.js loads the articles; this script feeds it the chosen filters and keeps the
// header, the category counts and the address bar in step with the results.
(function () {
  'use strict';

  const form = document.getElementById('searchForm');
  const grid = document.getElementById('feedGrid');
  if (!form || !grid) return;

  const searchEl = document.getElementById('feedSearch');
  const hidden = {
    category: document.getElementById('feedCategory'),
    sort: document.getElementById('feedSort')
  };
  const header = document.getElementById('searchResultsHeader');
  const queryEl = document.getElementById('searchResultsQuery');
  const countEl = document.getElementById('searchResultsCount');
  const emptyEl = document.getElementById('searchEmpty');
  const applyBtn = document.getElementById('searchApplyBtn');

  // Filters apply as soon as they change, so the button is only for browsers without JavaScript
  if (applyBtn) applyBtn.classList.add('state-hidden');

  // Pressing Enter searches in place instead of submitting the form
  form.addEventListener('submit', event => {
    event.preventDefault();
    searchEl.dispatchEvent(new Event('input'));
  });

  document.querySelectorAll('.search-page__radio').forEach(radio => {
    radio.addEventListener('change', () => {
      const target = hidden[radio.name];
      document.querySelectorAll(`.search-page__radio[name="${radio.name}"]`).forEach(r => {
        r.closest('.search-page__option').classList.toggle('search-page__option--active', r.checked);
      });
      target.value = radio.value;
      target.dispatchEvent(new Event('change'));
    });
  });

  grid.addEventListener('feed:loaded', event => {
    const data = event.detail;
    if (data.total === undefined) return; // a later page from scrolling, nothing to update

    const q = searchEl.value.trim();
    header.classList.toggle('state-hidden', !q);
    queryEl.textContent = q;
    countEl.textContent = String(data.total);
    if (emptyEl) emptyEl.classList.add('state-hidden'); // feed.js reports "no results" itself

    const counts = data.categoryCounts || {};
    document.querySelectorAll('[data-category-count]').forEach(el => {
      const category = el.dataset.categoryCount;
      el.textContent = String(category
        ? counts[category] || 0
        : Object.values(counts).reduce((sum, n) => sum + n, 0));
    });

    // Keep the address in step, so a refresh or a shared link shows the same results
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (hidden.category.value) params.set('category', hidden.category.value);
    if (hidden.sort.value === 'popularity') params.set('sort', 'popularity');
    const query = params.toString();
    window.history.replaceState({}, '', query ? `/search?${query}` : '/search');
  });
})();
