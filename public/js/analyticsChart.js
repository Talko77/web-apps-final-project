// Impact Analytics: views over time, marking the points in time
// where the editor approved and published an update to the article.
// Drawn on a plain canvas, with no external libraries.
(function () {
  'use strict';

  const canvas = document.getElementById('analyticsChart');
  if (!canvas) return;

  const statusEl = document.getElementById('chartStatus');
  const selectEl = document.getElementById('analyticsArticleSelect');
  const rangeEl = document.getElementById('analyticsRange');
  const ctx = canvas.getContext('2d');

  const PADDING = { top: 24, right: 16, bottom: 48, left: 56 };
  const COLORS = {
    line: '#1e3a5f',
    fill: 'rgba(30, 58, 95, 0.12)',
    event: '#b3261e',
    axis: '#c9c9c4',
    text: '#5c5c57'
  };

  const HOUR = 3600 * 1000;
  const COMPARE_HOURS = 24; // hours compared on each side of an update

  let current = { timeline: [], publishEvents: [], since: 0, end: 0 };
  let plot = null; // geometry of the last draw, used by the hover tooltip

  // Match the resolution to the pixel density so the chart does not look blurry
  function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 320;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  const fmtHour = d => new Date(d).toLocaleString('en-US', {
    day: '2-digit', month: '2-digit', hour: '2-digit'
  });

  // Hours nobody read the article have no bucket in the database, so add them back as 0
  // views. Otherwise the line would be drawn straight across the quiet hours.
  function fillHours(timeline, since, until) {
    const byHour = new Map(timeline.map(p => [new Date(p.timestamp).getTime(), p.viewsCount]));
    const points = [];
    for (let t = since; t <= until; t += HOUR) {
      points.push({ timestamp: t, viewsCount: byHour.get(t) || 0 });
    }
    return points;
  }

  function draw() {
    const { width, height } = fitCanvas();
    ctx.clearRect(0, 0, width, height);

    const points = current.timeline;
    plot = null;
    if (!points.some(p => p.viewsCount)) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No view data for the selected time range', width / 2, height / 2);
      return;
    }

    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;

    const times = points.map(p => p.timestamp);
    // The axis covers the whole selected range, so every update marker fits on it
    const minT = times[0];
    // The axis runs to the end of the current hour, so an update approved in this hour fits
    const maxT = current.end;
    const maxV = Math.max(...points.map(p => p.viewsCount), 1);
    const spanT = maxT - minT || 1;

    const x = t => PADDING.left + ((t - minT) / spanT) * plotW;
    const y = v => PADDING.top + plotH - (v / maxV) * plotH;
    plot = { spanT, plotW, points };

    // Views axis with horizontal gridlines
    ctx.strokeStyle = COLORS.axis;
    ctx.fillStyle = COLORS.text;
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i <= 4; i++) {
      const value = Math.round((maxV / 4) * i);
      const gy = y(value);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, gy);
      ctx.lineTo(PADDING.left + plotW, gy);
      ctx.stroke();
      ctx.fillText(String(value), PADDING.left - 8, gy);
    }

    // Time axis
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelCount = 6;
    for (let i = 0; i < labelCount; i++) {
      const t = minT + (spanT * i) / (labelCount - 1);
      ctx.save();
      ctx.translate(x(t), PADDING.top + plotH + 10);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(fmtHour(t), 0, 0);
      ctx.restore();
    }

    // Area under the line
    ctx.beginPath();
    ctx.moveTo(x(times[0]), y(points[0].viewsCount));
    points.forEach((p, i) => ctx.lineTo(x(times[i]), y(p.viewsCount)));
    ctx.lineTo(x(times[times.length - 1]), y(0));
    ctx.lineTo(x(times[0]), y(0));
    ctx.closePath();
    ctx.fillStyle = COLORS.fill;
    ctx.fill();

    // Views line
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(times[i]);
      const py = y(p.viewsCount);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Publish approval points - a dashed vertical line per update,
    // so the views before and after that point can be compared
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.event;
    ctx.fillStyle = COLORS.event;
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';

    current.publishEvents.forEach((evt, i) => {
      const t = new Date(evt).getTime();
      if (t < minT || t >= maxT) return; // an older update, outside the selected range
      const ex = x(t);
      ctx.beginPath();
      ctx.moveTo(ex, PADDING.top);
      ctx.lineTo(ex, PADDING.top + plotH);
      ctx.stroke();
      const label = i === 0 ? 'Published' : `Update ${i}`;
      ctx.fillText(label, ex, PADDING.top - 14);
    });
    ctx.setLineDash([]);
  }

  // One line per update: average views per hour in the 24 hours before and after it
  function renderSummary() {
    const listEl = document.getElementById('updateSummary');
    if (!listEl) return;
    listEl.textContent = '';

    const avg = (from, to) => {
      const inside = current.timeline.filter(p => p.timestamp >= from && p.timestamp < to);
      if (!inside.length) return null;
      return inside.reduce((sum, p) => sum + p.viewsCount, 0) / inside.length;
    };
    const fmt = v => (v === null ? 'no data' : `${v.toFixed(1)} views/hr`);

    current.publishEvents.forEach((evt, i) => {
      const t = new Date(evt).getTime();
      if (t < current.since || t >= current.end) return;
      const window = COMPARE_HOURS * HOUR;
      const before = avg(t - window, t);
      const after = avg(t, t + window);
      const item = document.createElement('li');
      item.textContent = `${i === 0 ? 'Published' : `Update ${i}`} · ${fmtHour(t)}: ` +
        `${fmt(before)} in the ${COMPARE_HOURS}h before → ${fmt(after)} in the ${COMPARE_HOURS}h after`;
      listEl.appendChild(item);
    });
  }

  // Native browser tooltip with the exact value of the hour under the pointer
  canvas.addEventListener('mousemove', e => {
    if (!plot) { canvas.title = ''; return; }
    const rect = canvas.getBoundingClientRect();
    const frac = (e.clientX - rect.left - PADDING.left) / plot.plotW;
    if (frac < 0 || frac > 1) { canvas.title = ''; return; }
    const hour = Math.round((frac * plot.spanT) / HOUR);
    const p = plot.points[Math.min(plot.points.length - 1, Math.max(0, hour))];
    canvas.title = `${fmtHour(p.timestamp)}: ${p.viewsCount} views`;
  });

  async function load(articleId, hours) {
    if (!articleId) return;
    window.api.flash(statusEl, 'Loading view data...', false);

    try {
      const query = hours ? `?hours=${encodeURIComponent(hours)}` : '';
      const data = await window.api.getJSON(`/api/analytics/article/${articleId}${query}`);
      const since = new Date(data.since).getTime();
      const until = Math.floor(new Date(data.until).getTime() / HOUR) * HOUR;
      current = {
        timeline: fillHours(data.timeline || [], since, until),
        publishEvents: data.publishEvents || [],
        since,
        end: until + HOUR
      };
      draw();
      renderSummary();

      // Only the updates inside the selected range are drawn on the chart
      const updates = current.publishEvents.filter((evt, i) => {
        const t = new Date(evt).getTime();
        return i > 0 && t >= current.since && t < current.end;
      }).length;
      window.api.flash(
        statusEl,
        `${data.totalViews} views in total · ${updates} ${updates === 1 ? 'update' : 'updates'} marked on the chart`,
        false
      );
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
    }
  }

  const articleId = () => (selectEl && selectEl.value) || canvas.dataset.articleId;

  if (selectEl) {
    selectEl.addEventListener('change', () => {
      // The URL is updated so a refresh stays on the same article
      window.history.replaceState({}, '', `/editor/articles/${selectEl.value}/analytics`);
      load(articleId(), rangeEl && rangeEl.value);
    });
  }
  if (rangeEl) rangeEl.addEventListener('change', () => load(articleId(), rangeEl.value));

  // Deleting the recorded view data for this article: the hourly buckets and the
  // cumulative counter go together, so the chart and the popularity sort stay in step.
  const resetBtn = document.getElementById('resetViewData');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!window.confirm('Delete all recorded view data for this article? The chart and the view count reset to zero and this cannot be undone.')) return;
      resetBtn.disabled = true;
      try {
        await window.api.sendJSON(`/api/analytics/article/${articleId()}`, 'DELETE');
        await load(articleId(), rangeEl && rangeEl.value);
        window.api.flash(statusEl, 'View data reset for this article.', false);
      } catch (err) {
        window.api.flash(statusEl, err.message, true);
      } finally {
        resetBtn.disabled = false;
      }
    });
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  });

  load(articleId(), rangeEl && rangeEl.value);
})();
