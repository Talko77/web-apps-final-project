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

  function commentHtml(c) {
    return `<article class="comment-item surface-paper radius-card pad-4 margin-top-3">
  <div class="flex align-center gap-2">
    <span class="avatar-initials surface-ink color-inverse">${esc(c.initials || '')}</span>
    <span class="text-label text-1 color-body">${esc(c.author)}</span>
    <time class="text-caption text-1 color-muted" datetime="${esc(c.datetime)}">${esc(c.dateLabel)}</time>
  </div>
  <p class="text-body text-1 color-body margin-top-2">${esc(c.text)}</p>
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
})();
