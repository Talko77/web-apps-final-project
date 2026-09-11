// Comments: adding a new comment shows it in the list immediately,
// without reloading the whole list and without refreshing the page.
(function () {
  'use strict';

  const form = document.getElementById('comment-form');
  if (!form) return;

  const list = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  const nameEl = document.getElementById('guest-name');
  const textEl = document.getElementById('comment-text');
  const counterEl = document.getElementById('char-counter');
  const statusEl = document.getElementById('comment-status');
  const submitEl = form.querySelector('button[type="submit"]');
  const articleId = form.dataset.articleId;

  const esc = window.api.escapeHtml;
  const MAX = Number((textEl && textEl.getAttribute('maxlength')) || 1000);

  if (textEl && counterEl) {
    const update = () => {
      counterEl.textContent = `${MAX - textEl.value.length} characters remaining`;
    };
    textEl.addEventListener('input', update);
    update();
  }

  const canModerate = list && list.dataset.canModerate === 'true';

  const moderationHtml = `<div class="comment-item__actions" role="group">
        <button class="comment-item__action" data-action="edit-comment" type="button">Edit</button>
        <button class="comment-item__action comment-item__action--delete" data-action="delete-comment" type="button">Delete</button>
      </div>`;

  function commentHtml(c) {
    return `<article class="comment-item" data-comment-id="${esc(c.id || '')}">
  <div class="comment-item__header">
    <div class="comment-item__avatar">${esc(c.initials || 'GU')}</div>
    <div class="comment-item__content">
      <div class="comment-item__meta">
        <strong class="comment-item__author">${esc(c.author || 'Guest')}</strong>
        <time class="comment-item__date" datetime="${esc(c.datetime || '')}">${esc(c.dateLabel || 'Just now')}</time>
        ${canModerate ? moderationHtml : ''}
      </div>
      <p class="comment-item__text">${esc(c.text || '')}</p>
    </div>
  </div>
</article>`;
  }

  // Builds the avatar initials for a comment rendered on the client.
  // The server does the same in utils/viewMappers.initials, so a comment
  // posted now looks identical to one rendered on the next page load.
  function initialsOf(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const content = textEl.value.trim();
    if (!content) {
      window.api.flash(statusEl, 'Comment cannot be empty.', true);
      return;
    }

    submitEl.disabled = true;
    submitEl.classList.add('is-authenticating');

    try {
      const data = await window.api.sendJSON(`/api/comments/article/${articleId}`, 'POST', {
        authorName: nameEl ? nameEl.value.trim() : '',
        content
      });

      const c = data.comment;
      list.insertAdjacentHTML('afterbegin', commentHtml({
        id: c._id,
        initials: initialsOf(c.authorName),
        author: c.authorName,
        datetime: c.createdAt,
        dateLabel: 'Just now',
        text: c.content
      }));

      if (countEl) countEl.textContent = String(list.querySelectorAll('.comment-item').length);

      textEl.value = '';
      if (counterEl) counterEl.textContent = `${MAX} characters remaining`;
      window.api.flash(statusEl, 'Comment posted.', false);
    } catch (err) {
      // A 429 means the server-enforced limit of three comments per minute was exceeded
      window.api.flash(statusEl, err.message, true);
    } finally {
      submitEl.disabled = false;
      submitEl.classList.remove('is-authenticating');
    }
  });

  // Editor moderation: edit a comment in place, or delete it. One delegated handler,
  // so a comment posted a moment ago is moderated the same way as a rendered one.
  if (canModerate) {
    list.addEventListener('click', async event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const item = button.closest('.comment-item');
      const commentId = item.dataset.commentId;
      const textEl = item.querySelector('.comment-item__text');

      if (button.dataset.action === 'delete-comment') {
        if (!window.confirm('Delete this comment permanently?')) return;
        button.disabled = true;
        try {
          await window.api.sendJSON(`/api/comments/${commentId}`, 'DELETE');
          item.remove();
          if (countEl) countEl.textContent = String(list.querySelectorAll('.comment-item').length);
        } catch (err) {
          window.api.flash(statusEl, err.message, true);
          button.disabled = false;
        }
        return;
      }

      // First click swaps the paragraph for a textarea, the second click saves it
      const box = item.querySelector('.comment-item__edit');
      if (!box) {
        const editor = document.createElement('textarea');
        editor.className = 'comment-item__edit control-input';
        editor.maxLength = MAX;
        editor.rows = 3;
        editor.value = textEl.textContent;
        textEl.classList.add('state-hidden');
        textEl.after(editor);
        editor.focus();
        button.textContent = 'Save';
        return;
      }

      const content = box.value.trim();
      if (!content) {
        window.api.flash(statusEl, 'Comment cannot be empty.', true);
        return;
      }

      button.disabled = true;
      try {
        const data = await window.api.sendJSON(`/api/comments/${commentId}`, 'PUT', { content });
        textEl.textContent = data.comment.content;
        box.remove();
        textEl.classList.remove('state-hidden');
        button.textContent = 'Edit';
        window.api.flash(statusEl, 'Comment updated.', false);
      } catch (err) {
        window.api.flash(statusEl, err.message, true);
      } finally {
        button.disabled = false;
      }
    });
  }
})();
