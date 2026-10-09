// Staff login. Authentication happens on the server only -
// the client just sends the credentials and receives the redirect target.
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  if (!form) return;

  const usernameEl = document.getElementById('staffUsername');
  const passwordEl = document.getElementById('staffPassword');
  const statusEl = document.getElementById('statusMessage');
  const submitEl = form.querySelector('button[type="submit"]');
  // Only a path on this site is a valid destination: not //host, not javascript:
  const nextUrl = /^\/(?![\/\\])/.test(form.dataset.next || '') ? form.dataset.next : '';

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) {
      window.api.flash(statusEl, 'Enter a username and password.', true);
      statusEl.classList.add('login-feedback-error');
      return;
    }

    submitEl.disabled = true;
    submitEl.classList.add('is-authenticating');

    try {
      const data = await window.api.sendJSON('/api/auth/login', 'POST', { username, password });
      statusEl.classList.remove('login-feedback-error');
      // The target is decided on the server based on the role stored in the session
      let target = nextUrl || data.redirect;
      if (target === '/editor' || target === '/editor/') target = '/editor/reviews';
      if (target === '/reporter' || target === '/reporter/') target = '/reporter/articles';
      if (target === '/login' || target === '/staff/login' || target === '/staff/login/') target = data.redirect;
      // A link meant for the other role's area would only end on an access-denied page
      if (data.user && data.user.role === 'Reporter' && target.startsWith('/editor')) target = data.redirect;
      if (data.user && data.user.role === 'Editor' && target.startsWith('/reporter')) target = data.redirect;
      window.location.assign(target);
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
      statusEl.classList.add('login-feedback-error');
      passwordEl.value = '';
      passwordEl.focus();
    } finally {
      submitEl.disabled = false;
      submitEl.classList.remove('is-authenticating');
    }
  });
})();
