// Reporter article editing uses explicit actions only. Typing never persists a draft.
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

  const saveBtn = document.getElementById('saveDraftBtn');
  const submitBtn = document.getElementById('submitForReviewBtn');
  const messageEl = document.getElementById('articleActionMessage');
  const counterEl = document.getElementById('charCounter');
  let articleId = form.dataset.articleId || '';
  const locked = form.dataset.locked === 'true';
  let saving = false;

  function collect() {
    return {
      title: fields.title ? fields.title.value : '',
      summary: fields.summary ? fields.summary.value : '',
      content: fields.content ? fields.content.value : '',
      category: fields.category ? fields.category.value : '',
      imageUrl: fields.imageUrl ? fields.imageUrl.value : ''
    };
  }

  function showMessage(message, isError) {
    window.api.flash(messageEl, message, isError);
  }

  async function saveDraft() {
    if (saving || locked) return false;
    saving = true;
    if (saveBtn) saveBtn.disabled = true;
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (!articleId) {
        const created = await window.api.sendJSON('/api/articles', 'POST', collect());
        articleId = created.articleId;
        form.dataset.articleId = articleId;
        window.history.replaceState({}, '', `/reporter/articles/${articleId}/edit`);
      } else {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'PUT', collect());
      }
      showMessage('Saved', false);
      return true;
    } catch (error) {
      showMessage(`Save failed: ${error.message}`, true);
      return false;
    } finally {
      saving = false;
      if (saveBtn) saveBtn.disabled = locked;
      if (submitBtn) submitBtn.disabled = locked;
    }
  }

  if (saveBtn) saveBtn.addEventListener('click', saveDraft);

  if (fields.summary && counterEl) {
    const max = Number(fields.summary.getAttribute('maxlength') || 500);
    const updateCounter = () => {
      counterEl.textContent = `${max - fields.summary.value.length} characters remaining`;
    };
    fields.summary.addEventListener('input', updateCounter);
    updateCounter();
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const saved = await saveDraft();
      if (!saved || !articleId) return;

      submitBtn.disabled = true;
      try {
        await window.api.sendJSON(`/api/articles/${articleId}/status`, 'PATCH', { newStatus: 'pending' });
        window.location.assign('/reporter/articles');
      } catch (error) {
        showMessage(error.message, true);
        submitBtn.disabled = locked;
      }
    });
  }
})();
