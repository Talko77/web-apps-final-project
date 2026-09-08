const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const mockPagesDirectory = path.join(__dirname, 'data', 'mock', 'pages');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function loadMockPage(filename) {
  const filePath = path.join(mockPagesDirectory, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function renderWithMock(view, filename, options = {}) {
  return (req, res, next) => {
    try {
      const mockData = loadMockPage(filename);
      const locals = options.wrapAsPage ? { page: mockData } : mockData;
      res.render(view, locals);
    } catch (error) {
      next(error);
    }
  };
}

app.get('/', renderWithMock('pages/public/home', 'home.json'));
app.get('/editorial', renderWithMock('pages/public/editorial-home', 'editorial-home.json', { wrapAsPage: true }));
app.get('/technology', renderWithMock('pages/public/technology', 'technology.json', { wrapAsPage: true }));
app.get('/search', renderWithMock('pages/public/search-results', 'search-results.json'));
app.get('/articles/:id', renderWithMock('pages/public/article', 'article.json'));
app.get('/staff/login', renderWithMock('pages/auth/staff-login', 'staff-login.json'));
app.get('/reporter/articles', renderWithMock('pages/reporter/articles', 'reporter-articles.json'));
app.get('/reporter/articles/:id/edit', renderWithMock('pages/reporter/edit-article', 'reporter-edit-article.json'));
app.get('/editor/reviews', renderWithMock('pages/editor/review-queue', 'editor-review-queue.json', { wrapAsPage: true }));
app.get('/editor/reviews/:id', renderWithMock('pages/editor/review-article', 'editor-review-article.json', { wrapAsPage: true }));
app.get('/editor/articles/:id/analytics', renderWithMock('pages/editor/analytics', 'editor-analytics.json', { wrapAsPage: true }));

// TODO: Mount the authentication, article, comment, analytics, weather, session,
// and database layers when the backend phase supplies their complete modules.

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send('Unable to render this page.');
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
