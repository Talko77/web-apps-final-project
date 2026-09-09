// התחברות צוות. ההזדהות מתבצעת בשרת בלבד -
// הלקוח רק שולח את הפרטים ומקבל את היעד להפניה.
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  if (!form) return;

  const usernameEl = document.getElementById('staffUsername');
  const passwordEl = document.getElementById('staffPassword');
  const statusEl = document.getElementById('statusMessage');
  const submitEl = form.querySelector('button[type="submit"]');
  const nextUrl = form.dataset.next || '';

  form.addEventListener('submit', async event => {
    event.preventDefault();

    const username = usernameEl.value.trim();
    const password = passwordEl.value;

    if (!username || !password) {
      window.api.flash(statusEl, 'יש להזין שם משתמש וסיסמה.', true);
      statusEl.classList.add('login-feedback-error');
      return;
    }

    submitEl.disabled = true;
    form.classList.add('is-authenticating');

    try {
      const data = await window.api.sendJSON('/api/auth/login', 'POST', { username, password });
      statusEl.classList.remove('login-feedback-error');
      // היעד נקבע בשרת לפי התפקיד שנשמר ב-session
      window.location.assign(nextUrl || data.redirect);
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
      statusEl.classList.add('login-feedback-error');
      passwordEl.value = '';
      passwordEl.focus();
    } finally {
      submitEl.disabled = false;
      form.classList.remove('is-authenticating');
    }
  });
})();
