// Editor staff directory: create, search, update and delete newsroom accounts over Ajax.
// Every rule that matters (who may do this, password hashing, protecting the last
// editor) is enforced on the server; this file is only the interface.
(function () {
  'use strict';

  const body = document.getElementById('staffTableBody');
  if (!body) return;

  const createForm = document.getElementById('staffCreateForm');
  const createBtn = document.getElementById('staffCreateBtn');
  const searchEl = document.getElementById('staffSearch');
  const statusEl = document.getElementById('staffStatus');
  const emptyEl = document.getElementById('staffEmptyState');

  const esc = window.api.escapeHtml;
  const currentUserId = body.dataset.currentUserId;
  const roles = (body.dataset.roles || '').split(',').filter(Boolean);

  // Mirrors the row markup in views/pages/editor/staff.ejs, so a row added or
  // reloaded here is identical to one rendered on the next page load.
  function rowHtml(user) {
    const options = roles.map(role =>
      `<option value="${esc(role)}"${role === user.role ? ' selected' : ''}>${esc(role)}</option>`
    ).join('');

    return `<tr class="staff-directory__row" data-user-id="${esc(user._id)}">
  <td><input class="control-input staff-directory__input" data-field="username" maxlength="30" type="text" value="${esc(user.username)}" /></td>
  <td><input class="control-input staff-directory__input" data-field="displayName" maxlength="60" type="text" value="${esc(user.displayName)}" /></td>
  <td><select class="control-input staff-directory__input" data-field="role">${options}</select></td>
  <td><input class="control-input staff-directory__input" data-field="password" placeholder="Leave blank to keep" type="password" /></td>
  <td class="staff-directory__action-cell">
    <div class="staff-directory__actions" role="group">
      <button class="staff-directory__action staff-directory__action--save" data-action="save" type="button">Save</button>
      <button class="staff-directory__action staff-directory__action--delete" data-action="delete" type="button"${String(user._id) === currentUserId ? ' disabled title="You cannot delete your own account"' : ''}>Delete</button>
    </div>
  </td>
</tr>`;
  }

  function render(users) {
    body.innerHTML = users.map(rowHtml).join('');
    if (emptyEl) emptyEl.classList.toggle('state-hidden', users.length > 0);
  }

  async function reload() {
    const search = searchEl ? searchEl.value.trim() : '';
    const data = await window.api.getJSON(`/api/users?search=${encodeURIComponent(search)}`);
    render(data.users);
  }

  const field = (row, name) => row.querySelector(`[data-field="${name}"]`);

  if (createForm) {
    createForm.addEventListener('submit', async event => {
      event.preventDefault();
      createBtn.disabled = true;
      try {
        const created = await window.api.sendJSON('/api/users', 'POST', {
          username: document.getElementById('newUsername').value.trim(),
          displayName: document.getElementById('newDisplayName').value.trim(),
          password: document.getElementById('newPassword').value,
          role: document.getElementById('newRole').value
        });
        createForm.reset();
        // Clearing the search keeps the new account visible even when a filter was active
        if (searchEl) searchEl.value = '';
        await reload();
        window.api.flash(statusEl, `Created ${created.user.username}.`, false);
      } catch (err) {
        window.api.flash(statusEl, err.message, true);
      } finally {
        createBtn.disabled = false;
      }
    });
  }

  if (searchEl) {
    let timer = null;
    searchEl.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        reload().catch(err => window.api.flash(statusEl, err.message, true));
      }, 250);
    });
  }

  // One delegated handler, so rows replaced after a search keep working
  body.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const row = button.closest('.staff-directory__row');
    const userId = row.dataset.userId;
    const username = field(row, 'username').value.trim();

    if (button.dataset.action === 'delete' &&
      !window.confirm(`Delete the account "${username}"? This cannot be undone.`)) return;

    button.disabled = true;
    try {
      if (button.dataset.action === 'save') {
        const updated = await window.api.sendJSON(`/api/users/${userId}`, 'PUT', {
          username,
          displayName: field(row, 'displayName').value.trim(),
          role: field(row, 'role').value,
          // An empty value means "keep the current password"
          password: field(row, 'password').value
        });
        field(row, 'password').value = '';
        window.api.flash(statusEl, `Saved ${updated.user.username}.`, false);
      } else {
        await window.api.sendJSON(`/api/users/${userId}`, 'DELETE');
        await reload();
        window.api.flash(statusEl, `Deleted ${username}.`, false);
      }
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
    } finally {
      button.disabled = false;
    }
  });
})();
