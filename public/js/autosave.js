// Draft autosave. There is no "Save" button:
// the work is saved on the server two seconds after the reporter stops typing,
// so a refresh, closing the browser or moving to another machine does not lose content.
(function () {
  'use strict';

  const form = document.getElementById('articleForm');
  if (!form) return;

  const fields = {
    title: document.getElementById('articleTitle'),
    summary: document.getElementById('articleSubtitle'),
    content: document.getElementById('articleBody'),
    category: document.getElementById('articleCategory'),
    imageUrl: document.getElementById('articleImageUrl')
  };

  const indicator = document.getElementById('saveIndicator');
  const submitBtn = document.getElementById('submitForReviewBtn');
  const counterEl = document.getElementById('charCounter');

  let articleId = form.dataset.articleId || '';
  const locked = form.dataset.locked === 'true';
  let timer = null;
  let saving = false;
  let pending = false;

  function collect() {
    return {
      title: fields.title ? fields.title.value : '',
      summary: fields.summary ? fields.summary.value : '',
      content: fields.content ? fields.content.value : '',
      category: fields.category ? fields.category.value : '',
      imageUrl: fields.imageUrl ? fields.imageUrl.value : ''
    };
  }

  async function save() {
    if (saving) { pending = true; return; }
    saving = true;
    window.api.flash(indicator, 'Saving...', false);

    try {
      // A new article is created on the first save, and updated from then on
      if (!articleId) {
        const created = await window.api.sendJSON('/api/articles', 'POST', collect());
        articleId = created.articleId;
        form.dataset.articleId = articleId;
        // Updates the URL without reloading, so a refresh returns to the same article
        window.history.replaceState({}, '', `/reporter/articles/${articleId}/edit`);
        if (submitBtn) submitBtn.disabled = false;
      } else {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'PUT', collect());
      }

      const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      window.api.flash(indicator, `Autosaved at ${time}`, false);
    } catch (err) {
      window.api.flash(indicator, `Autosave failed: ${err.message}`, true);
    } finally {
      saving = false;
      if (pending) { pending = false; schedule(); }
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(save, 2000);
  }

  if (!locked) {
    Object.values(fields).forEach(el => {
      if (!el) return;
      el.addEventListener('input', schedule);
      el.addEventListener('change', schedule);
    });

    // Save immediately if the user switches to another window or closes the tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && timer) { clearTimeout(timer); save(); }
    });
  }

  if (fields.summary && counterEl) {
    const max = Number(fields.summary.getAttribute('maxlength') || 500);
    const update = () => { counterEl.textContent = `${max - fields.summary.value.length} characters remaining`; };
    fields.summary.addEventListener('input', update);
    update();
  }

  // Submit for the editor's approval
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      clearTimeout(timer);
      if (!articleId) { window.api.flash(indicator, 'Add content before submitting.', true); return; }

      submitBtn.disabled = true;
      try {
        await save();
        await window.api.sendJSON(`/api/articles/${articleId}/status`, 'PATCH', { newStatus: 'pending' });
        window.location.assign('/reporter/articles');
      } catch (err) {
        window.api.flash(indicator, err.message, true);
        submitBtn.disabled = false;
      }
    });
  }
})();
