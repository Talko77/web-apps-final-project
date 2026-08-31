async function renderImpactChart(articleId) {
  const res = await fetch(`/api/analytics/article/${articleId}`);
  const { timeline, publishEvents } = await res.json();

  const labels = timeline.map(data => new Date(data.timestamp).toLocaleString('he-IL', { hour: '2-digit', day: '2-digit', month: '2-digit' }));
  const views = timeline.map(data => data.viewsCount);

  const ctx = document.getElementById('analyticsChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'כמות צפיות לאורך זמן',
        data: views,
        borderColor: '#007bff',
        fill: false,
        tension: 0.1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        annotation: { // סימון נקודות אישור ועדכון הכתבה על הגרף[cite: 1]
          annotations: publishEvents.map((evt, idx) => ({
            type: 'line',
            xMin: new Date(evt).toLocaleString('he-IL', { hour: '2-digit', day: '2-digit', month: '2-digit' }),
            xMax: new Date(evt).toLocaleString('he-IL', { hour: '2-digit', day: '2-digit', month: '2-digit' }),
            borderColor: 'red',
            borderWidth: 2,
            label: { content: `עדכון ${idx + 1}`, enabled: true, position: 'top' }
          }))
        }
      }
    }
  });
}