// Impact Analytics: צפיות לאורך זמן, עם סימון נקודות הזמן
// שבהן העורך אישר ופרסם עדכון לכתבה.
// מצויר ב-canvas נטו, ללא ספריות חיצוניות.
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

  let current = { timeline: [], publishEvents: [] };

  // התאמת הרזולוציה לצפיפות הפיקסלים כדי שהגרף לא ייראה מטושטש
  function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 320;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }

  const fmtHour = d => new Date(d).toLocaleString('he-IL', {
    day: '2-digit', month: '2-digit', hour: '2-digit'
  });

  function draw() {
    const { width, height } = fitCanvas();
    ctx.clearRect(0, 0, width, height);

    const points = current.timeline;
    if (!points.length) {
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('אין נתוני צפייה להצגה בטווח הזמן הנבחר', width / 2, height / 2);
      return;
    }

    const plotW = width - PADDING.left - PADDING.right;
    const plotH = height - PADDING.top - PADDING.bottom;

    const times = points.map(p => new Date(p.timestamp).getTime());
    const minT = Math.min(...times);
    const maxT = Math.max(...times);
    const maxV = Math.max(...points.map(p => p.viewsCount), 1);
    const spanT = maxT - minT || 1;

    const x = t => PADDING.left + ((t - minT) / spanT) * plotW;
    const y = v => PADDING.top + plotH - (v / maxV) * plotH;

    // ציר הצפיות עם קווי עזר אופקיים
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

    // ציר הזמן
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelCount = Math.min(6, points.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((points.length - 1) * (i / Math.max(1, labelCount - 1)));
      const t = times[idx];
      ctx.save();
      ctx.translate(x(t), PADDING.top + plotH + 10);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(fmtHour(t), 0, 0);
      ctx.restore();
    }

    // שטח מתחת לקו
    ctx.beginPath();
    ctx.moveTo(x(times[0]), y(points[0].viewsCount));
    points.forEach((p, i) => ctx.lineTo(x(times[i]), y(p.viewsCount)));
    ctx.lineTo(x(times[times.length - 1]), y(0));
    ctx.lineTo(x(times[0]), y(0));
    ctx.closePath();
    ctx.fillStyle = COLORS.fill;
    ctx.fill();

    // קו הצפיות
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(times[i]);
      const py = y(p.viewsCount);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    // נקודות אישור הפרסום - קו אנכי מקווקו לכל עדכון,
    // כך שניתן לראות את הצפיות לפני ואחרי אותה נקודה
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = COLORS.event;
    ctx.fillStyle = COLORS.event;
    ctx.lineWidth = 1.5;
    ctx.textAlign = 'center';

    current.publishEvents.forEach((evt, i) => {
      const t = new Date(evt).getTime();
      if (t < minT || t > maxT) return;
      const ex = x(t);
      ctx.beginPath();
      ctx.moveTo(ex, PADDING.top);
      ctx.lineTo(ex, PADDING.top + plotH);
      ctx.stroke();
      const label = i === 0 ? 'פרסום' : `עדכון ${i}`;
      ctx.fillText(label, ex, PADDING.top - 14);
    });
    ctx.setLineDash([]);
  }

  async function load(articleId, hours) {
    if (!articleId) return;
    window.api.flash(statusEl, 'טוען נתוני צפייה...', false);

    try {
      const query = hours ? `?hours=${encodeURIComponent(hours)}` : '';
      const data = await window.api.getJSON(`/api/analytics/article/${articleId}${query}`);
      current = { timeline: data.timeline || [], publishEvents: data.publishEvents || [] };
      draw();

      const updates = Math.max(0, current.publishEvents.length - 1);
      window.api.flash(
        statusEl,
        `${data.totalViews} צפיות בסך הכול · ${updates} עדכונים מסומנים על הגרף`,
        false
      );
    } catch (err) {
      window.api.flash(statusEl, err.message, true);
    }
  }

  const articleId = () => (selectEl && selectEl.value) || canvas.dataset.articleId;

  if (selectEl) {
    selectEl.addEventListener('change', () => {
      // הכתובת מתעדכנת כדי שרענון יישאר על אותה כתבה
      window.history.replaceState({}, '', `/editor/articles/${selectEl.value}/analytics`);
      load(articleId(), rangeEl && rangeEl.value);
    });
  }
  if (rangeEl) rangeEl.addEventListener('change', () => load(articleId(), rangeEl.value));

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  });

  load(articleId(), rangeEl && rangeEl.value);
})();
