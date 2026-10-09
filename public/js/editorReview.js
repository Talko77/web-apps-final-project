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

  // The in-place edit form for the pending version, if this article has one
  const draftForm = document.getElementById('editorDraftForm');
  const value = id => document.getElementById(id).value;
  const draftPayload = () => ({
    title: value('editorDraftTitle'),
    summary: value('editorDraftSummary'),
    content: value('editorDraftBody'),
    category: value('editorDraftCategory'),
    imageUrl: value('editorDraftImageUrl')
  });
  let savedDraft = draftForm ? JSON.stringify(draftPayload()) : null;
  const saveDraft = () => window.api.sendJSON(`/api/articles/${articleId}`, 'PUT', draftPayload());

  const approveBtn = document.getElementById('btn-approve');
  if (approveBtn) {
    approveBtn.addEventListener('click', () => act(approveBtn, async () => {
      // Edits typed in the pane but not saved yet are saved first, so the version that
      // gets published is exactly the one on screen
      if (draftForm && JSON.stringify(draftPayload()) !== savedDraft) await saveDraft();
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
  if (draftForm) {
    const draftStatusEl = document.getElementById('editorDraftStatus');
    const saveEditsBtn = document.getElementById('btn-save-draft-edits');

    draftForm.addEventListener('submit', async event => {
      event.preventDefault();
      saveEditsBtn.disabled = true;
      try {
        const data = await saveDraft();
        savedDraft = JSON.stringify(draftPayload());
        // Editing a live article turns it into a pending update; reload so the status, badge and
        // the approve / return buttons match the new state
        if (data && data.status === 'pending' && approveBtn && approveBtn.disabled) {
          window.location.reload();
          return;
        }
        window.api.flash(draftStatusEl, 'Your edits are saved.', false);
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
