// "My articles" table: client-side filtering by status, category and search,
// plus submitting an article for the editor's approval without reloading the page.
(function () {
  'use strict';

  const tbody = document.getElementById('articlesTableBody');
  if (!tbody) return;

  const pills = document.getElementById('statusFilterPills');
  const categoryEl = document.getElementById('categorySelect');
  const searchEl = document.getElementById('articleSearchInput');
  const emptyEl = document.getElementById('noResultsState');
  const countEl = document.getElementById('displayedCount');
  const statusEl = document.getElementById('reporterStatus');

  let activeStatus = 'All';

  function applyFilters() {
    const category = categoryEl ? categoryEl.value : 'All';
    const term = searchEl ? searchEl.value.trim().toLowerCase() : '';
    let visible = 0;

    tbody.querySelectorAll('.article-row').forEach(row => {
      const matchStatus = activeStatus === 'All' || row.dataset.status === activeStatus;
      const matchCategory = !category || category === 'All' || row.dataset.category === category;
      const matchTerm = !term || row.dataset.title.toLowerCase().includes(term);
      const show = matchStatus && matchCategory && matchTerm;

      row.classList.toggle('state-hidden', !show);
      if (show) visible++;
    });

    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.classList.toggle('state-hidden', visible > 0);
  }

  if (pills) {
    pills.addEventListener('click', event => {
      const btn = event.target.closest('.filter-btn[data-status]');
      if (!btn) return;
      pills.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeStatus = btn.dataset.status;
      applyFilters();
    });
  }

  if (categoryEl) categoryEl.addEventListener('change', applyFilters);
  if (searchEl) searchEl.addEventListener('input', applyFilters);

  // Submit for approval. The transition itself is validated and enforced on the server.
  tbody.addEventListener('click', async event => {
    const btn = event.target.closest('button[data-submit-id]');
    if (!btn || btn.disabled) return;

    btn.disabled = true;
    try {
      await window.api.sendJSON(`/api/articles/${btn.dataset.submitId}/status`, 'PATCH', {
        newStatus: 'pending'
      });
      window.location.reload();
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
      btn.disabled = false;
    }
  });

  applyFilters();
})();
