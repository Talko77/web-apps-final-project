// תור הסקירה: סינון מקומי של השורות שכבר נטענו,
// לפי חיפוש חופשי, קטגוריה ומצב.
(function () {
  'use strict';

  const table = document.getElementById('queueTable');
  if (!table) return;

  const searchEl = document.getElementById('queueSearch');
  const categoryEl = document.getElementById('categoryFilter');
  const statusEl = document.getElementById('statusFilter');
  const resetEl = document.getElementById('resetFilters');
  const emptyEl = document.getElementById('queueEmptyState');
  const countEl = document.getElementById('queueCount');

  function applyFilters() {
    const term = searchEl ? searchEl.value.trim().toLowerCase() : '';
    const category = categoryEl ? categoryEl.value : '';
    const status = statusEl ? statusEl.value : '';
    let visible = 0;

    table.querySelectorAll('tbody tr[data-status]').forEach(row => {
      const matchTerm = !term ||
        row.dataset.title.toLowerCase().includes(term) ||
        row.dataset.reporter.toLowerCase().includes(term);
      const matchCategory = !category || row.dataset.category === category;
      const matchStatus = !status || row.dataset.status === status;
      const show = matchTerm && matchCategory && matchStatus;

      row.classList.toggle('state-hidden', !show);
      if (show) visible++;
    });

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.classList.toggle('state-hidden', visible > 0);
  }

  [searchEl, categoryEl, statusEl].forEach(el => {
    if (!el) return;
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', applyFilters);
  });

  if (resetEl) {
    resetEl.addEventListener('click', () => {
      if (searchEl) searchEl.value = '';
      if (categoryEl) categoryEl.value = '';
      if (statusEl) statusEl.value = '';
      applyFilters();
    });
  }

  applyFilters();
})();
