// עזרי Ajax משותפים לכל עמודי הלקוח.
// נטען לפני כל שאר קבצי ה-JS ומגדיר את window.api.
(function () {
  'use strict';

  // כל טקסט שמגיע מהמשתמש עובר דרך כאן לפני הכנסה ל-DOM,
  // כדי למנוע הזרקת HTML בתגובות ובשמות.
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
      const message = (body && body.error) || `הבקשה נכשלה (${res.status})`;
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

  // מציג הודעה קצרה באלמנט נתון, ומנקה אותה לאחר מכן
  function flash(el, message, isError) {
    if (!el) return;
    el.textContent = message;
    el.classList.remove('state-hidden');
    el.classList.toggle('color-alert', Boolean(isError));
    el.classList.toggle('color-muted', !isError);
  }

  window.api = { escapeHtml, getJSON, sendJSON, flash };

  // התנתקות זמינה מכל עמוד שמציג את כפתור ההתנתקות בכותרת.
  // POST ולא קישור, כדי שלא תתבצע התנתקות בעקבות ניווט או טעינה מוקדמת.
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
