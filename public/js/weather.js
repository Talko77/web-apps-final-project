// ווידג'ט מזג האוויר בסיידבר. הנתון נשלף מהשרת, שמחזיק מטמון של 15 דקות,
// כך שאלפי מבקרים אינם מייצרים אלפי קריאות לשירות החיצוני.
(function () {
  'use strict';

  const widget = document.getElementById('weatherWidget');
  if (!widget) return;

  const esc = window.api.escapeHtml;

  function render(payload) {
    const d = payload.data;
    const temp = d.temp === null || d.temp === undefined ? '--' : `${d.temp}°`;
    const extra = d.feelsLike !== undefined
      ? `<span class="text-caption text-1 color-muted">מרגיש כמו ${esc(d.feelsLike)}° · לחות ${esc(d.humidity)}%</span>`
      : '';
    // מצוין למשתמש כשהנתון אינו טרי, במקום להציג אותו כעדכני
    const staleNote = payload.source === 'fallback' || payload.source === 'stale-cache'
      ? '<span class="text-caption text-1 color-alert">נתון לא עדכני</span>'
      : '';

    widget.innerHTML = `<div class="flex align-center justify-between gap-2">
  <span class="text-label text-1 text-uppercase color-primary">מזג האוויר</span>
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
      widget.innerHTML = '<p class="text-caption text-1 color-muted">נתוני מזג האוויר אינם זמינים כרגע.</p>';
    });
})();
