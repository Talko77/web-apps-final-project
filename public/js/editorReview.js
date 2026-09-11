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

  // The editor may edit the pending version himself before deciding on it.
  // This reuses PUT /api/articles/:id, which leaves a pending article pending,
  // so the approve and return actions stay valid straight after a save.
  const draftForm = document.getElementById('editorDraftForm');
  if (draftForm) {
    const draftStatusEl = document.getElementById('editorDraftStatus');
    const saveEditsBtn = document.getElementById('btn-save-draft-edits');
    const value = id => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    draftForm.addEventListener('submit', async event => {
      event.preventDefault();
      saveEditsBtn.disabled = true;
      try {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'PUT', {
          title: value('editorDraftTitle'),
          summary: value('editorDraftSummary'),
          content: value('editorDraftBody'),
          category: value('editorDraftCategory'),
          imageUrl: value('editorDraftImageUrl')
        });
        window.api.flash(draftStatusEl, 'Your edits are saved to the pending version.', false);
      } catch (err) {
        window.api.flash(draftStatusEl, err.message, true);
      } finally {
        saveEditsBtn.disabled = false;
      }
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
