(function () {
  const form = document.getElementById('loginForm');
  const statusMessage = document.getElementById('statusMessage');

  if (!form || !statusMessage) return;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const email = document.getElementById('staffEmail').value.trim().toLowerCase();
    const password = document.getElementById('staffPassword').value;

    if (password === 'pass123' && email === 'reporter@dailyweb.org') {
      window.location.href = '/reporter/articles';
    } else if (password === 'pass123' && email === 'editor@dailyweb.org') {
      window.location.href = '/editor/reviews';
    } else {
      statusMessage.classList.remove('state-hidden');
      statusMessage.classList.add('login-feedback-error');
      statusMessage.textContent = 'Invalid credentials. Please use one of the demo accounts shown above.';
    }
  });
})();
