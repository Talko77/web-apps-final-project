let autosaveTimer = null;

function triggerAutosave(articleId) {
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const payload = {
      title: document.getElementById('title').value,
      category: document.getElementById('category').value,
      summary: document.getElementById('summary').value,
      content: document.getElementById('content').value
    };

    const url = articleId ? `/api/articles/autosave/${articleId}` : '/api/articles/autosave';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('status-indicator').innerText = `נשמר אוטומטית ב-${new Date(data.updatedAt).toLocaleTimeString()}`;
    }
  }, 2000); // שמירה מופעלת שנתיים לאחר הפסקת ההקלדה[cite: 1]
}