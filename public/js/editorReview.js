// פעולות העורך: אישור ופרסום, החזרה לתיקונים עם הערה, ומחיקת כתבה.
// כל הבדיקות נאכפות בשרת - הכפתורים כאן הם רק ממשק.
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
      // הערה היא חלק מהדרישה להחזרה לתיקונים, ולכן נדרשת כאן
      if (!note) {
        window.api.flash(statusEl, 'יש לצרף הערה המסבירה אילו תיקונים נדרשים.', true);
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
      if (!window.confirm('למחוק את הכתבה לצמיתות? הפעולה תמחק גם את התגובות ונתוני הצפייה ואינה ניתנת לביטול.')) return;
      act(deleteBtn, async () => {
        await window.api.sendJSON(`/api/articles/${articleId}`, 'DELETE');
        window.location.assign('/editor/reviews');
      });
    });
  }
})();
