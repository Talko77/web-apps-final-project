// Editor actions: approve and publish, return for revisions with a note, and delete an article.
// All the checks are enforced on the server - the buttons here are only the interface.
(function () {
  'use strict';

  const root = document.getElementById('reviewActions');
  if (!root) return;

  const articleId = root.dataset.articleId;
  const statusEl = document.getElementById('statusAlert');
  const noteEl = document.getElementById('editorNotes');

  async function act(button, run) {
    button.disabled = true;
    try {
      await run();
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
      button.disabled = false;
    }
  }

  const approveBtn = document.getElementById('btn-approve');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => act(approveBtn, async () => {
      await window.api.sendJSON(`/api/articles/${articleId}/status`, 'PATCH', { newStatus: 'published' });
      window.location.assign('/editor/reviews');
    }));
  }

  const returnBtn = document.getElementById('btn-request-revisions');
  if (returnBtn) {
    returnBtn.addEventListener('click', () => {
      const note = noteEl ? noteEl.value.trim() : '';
      // A note is part of the requirement for returning an article for revisions, so it is required here
      if (!note) {
        window.api.flash(statusEl, 'Add a note explaining what changes are needed.', true);
        if (noteEl) noteEl.focus();
        return;
      }
      act(returnBtn, async () => {
        await window.api.sendJSON(`/api/articles/${articleId}/status`, 'PATCH', {
          newStatus: 'returned',
          editorNote: note
        });
        window.location.assign('/editor/reviews');
      });
    });
  }

  const deleteBtn = document.getElementById('btn-delete');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!window.confirm('Delete this article permanently? This also removes its comments and view data and cannot be undone.')) return;
      act(deleteBtn, async () => {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'DELETE');
        window.location.assign('/editor/reviews');
      });
    });
  }
})();
