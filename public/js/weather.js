// Sidebar weather widget. The data is fetched from the server, which keeps a 15-minute cache,
// so thousands of visitors do not generate thousands of calls to the external service.
(function () {
  'use strict';

  const widget = document.getElementById('weatherWidget');
  if (!widget) return;

  const esc = window.api.escapeHtml;

  function render(payload) {
    const d = payload.data;
    const temp = d.temp === null || d.temp === undefined ? '--' : `${d.temp}°`;
    const extra = d.feelsLike !== undefined
      ? `<span class="text-caption text-1 color-muted">Feels like ${esc(d.feelsLike)}° · Humidity ${esc(d.humidity)}%</span>`
      : '';
    // Tell the user when the data is not fresh, instead of presenting it as current
    const staleNote = payload.source === 'fallback' || payload.source === 'stale-cache'
      ? '<span class="text-caption text-1 color-alert">Data may be stale</span>'
      : '';

    widget.innerHTML = `<div class="flex align-center justify-between gap-2">
  <span class="text-label text-1 text-uppercase color-primary">Weather</span>
  <span class="text-caption text-1 color-muted">${esc(d.city || '')}</span>
</div>
<p class="text-headline text-5 color-body margin-top-2">${esc(temp)}</p>
<p class="text-body text-1 color-muted">${esc(d.condition || '')}</p>
${extra}
${staleNote}`;
  }

  window.api.getJSON('/api/weather')
    .then(render)
    .catch(() => {
      widget.innerHTML = '<p class="text-caption text-1 color-muted">Weather data is unavailable right now.</p>';
    });
})();
