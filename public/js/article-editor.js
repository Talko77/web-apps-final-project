// Reporter article editor.
// Two ways to persist a draft, on purpose:
//   1. Save Draft / Submit for Review - explicit actions the reporter controls.
//   2. Background autosave - required by the spec: the reporter's work must be
//      kept "without a deliberate click on a Save button", and closing the
//      browser, refreshing or moving to another computer must not lose it.
// Autosave only fires when something actually changed, so idle typing pauses
// do not generate a request per pause.
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

  const AUTOSAVE_DELAY = 5000;
  let autosaveTimer = null;
  let lastPersisted = null; // serialized snapshot of the last successful save

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

  // Shared persistence path. `isAuto` only changes the messaging and whether
  // the action buttons are disabled - autosave must not block the reporter.
  async function persist(isAuto) {
    if (saving || locked) return false;
    saving = true;
    if (!isAuto) {
      if (saveBtn) saveBtn.disabled = true;
      if (submitBtn) submitBtn.disabled = true;
    }

    const payload = collect();

    try {
      if (!articleId) {
        const created = await window.api.sendJSON('/api/articles', 'POST', payload);
        articleId = created.articleId;
        form.dataset.articleId = articleId;
        // Update the URL without reloading so a refresh returns to this article
        window.history.replaceState({}, '', `/reporter/articles/${articleId}/edit`);
      } else {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'PUT', payload);
      }

      lastPersisted = JSON.stringify(payload);

      if (isAuto) {
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        showMessage(`Autosaved at ${time}`, false);
      } else {
        showMessage('Saved', false);
      }
      return true;
    } catch (error) {
      showMessage(`${isAuto ? 'Autosave' : 'Save'} failed: ${error.message}`, true);
      return false;
    } finally {
      saving = false;
      if (!isAuto) {
        if (saveBtn) saveBtn.disabled = locked;
        if (submitBtn) submitBtn.disabled = locked;
      }
    }
  }

  const saveDraft = () => persist(false);

  // Only submitting for review requires a complete article. Autosave and Save Draft
  // deliberately accept a partial draft, so work in progress is never lost.
  // The same rule is enforced again on the server in Article.isDraftComplete().
  const REQUIRED_FIELDS = [
    ['title', 'a headline'],
    ['summary', 'a summary'],
    ['content', 'the article body'],
    ['category', 'a category']
  ];

  // Returns [fieldKey, label] for the first empty required field, or undefined
  function missingField() {
    const values = collect();
    return REQUIRED_FIELDS.find(([key]) => !values[key].trim());
  }

  function hasUnsavedChanges() {
    return JSON.stringify(collect()) !== lastPersisted;
  }

  function scheduleAutosave() {
    if (locked) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (hasUnsavedChanges()) persist(true);
    }, AUTOSAVE_DELAY);
  }

  if (!locked) {
    // Snapshot what the server already has, so autosave does not re-send
    // an untouched draft on page load.
    lastPersisted = JSON.stringify(collect());

    Object.values(fields).forEach(el => {
      if (!el) return;
      el.addEventListener('input', scheduleAutosave);
      el.addEventListener('change', scheduleAutosave);
    });

    // Closing the tab or switching away must not lose the pending edit
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges()) {
        clearTimeout(autosaveTimer);
        persist(true);
      }
    });
  }

  if (saveBtn) saveBtn.addEventListener('click', () => { clearTimeout(autosaveTimer); saveDraft(); });

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
      clearTimeout(autosaveTimer);

      const missing = missingField();
      if (missing) {
        const [key, label] = missing;
        showMessage(`Add ${label} before submitting for review.`, true);
        if (fields[key]) fields[key].focus();
        return;
      }

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
