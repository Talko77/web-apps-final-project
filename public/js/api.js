// Shared Ajax helpers for all client pages.
// Loaded before every other JS file and defines window.api.
(function () {
  'use strict';

  // Every piece of user-supplied text goes through here before being inserted
  // into the DOM, to prevent HTML injection via comments and names.
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function request(url, options) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(options && options.headers) },
      ...options
    });

    let body = null;
    try {
      body = await res.json();
    } catch (err) {
      body = null;
    }

    if (!res.ok) {
      const message = (body && body.error) || `Request failed (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }

    return body;
  }

  const getJSON = url => request(url, { method: 'GET' });

  const sendJSON = (url, method, payload) => request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });

  // Shows a short message in the given element, then clears it afterwards
  function flash(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('state-hidden');
    el.classList.toggle('color-alert', Boolean(isError));
    el.classList.toggle('color-muted', !isError);
  }

  window.api = { escapeHtml, getJSON, sendJSON, flash };

  // Logout is available from every page that shows the header logout button.
  // A POST rather than a link, so navigation or prefetching cannot log the user out.
  document.addEventListener('click', async event => {
    const btn = event.target.closest('#logoutBtn');
    if (!btn) return;
    btn.disabled = true;
    try {
      const data = await sendJSON('/api/auth/logout', 'POST');
      window.location.assign(data.redirect || '/');
    } catch (err) {
      btn.disabled = false;
    }
  });
})();
