# The Daily Web

The current implementation is a presentation-only Express/EJS migration of the
news publication and newsroom prototypes. Page content is loaded from local mock
JSON; database, authentication, API, autosave, analytics, comments, and workflow
behavior remain future backend work.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000`. Useful preview routes include `/editorial`,
`/technology`, `/search`, `/articles/demo`, `/staff/login`,
`/reporter/articles`, `/reporter/articles/demo/edit`, `/editor/reviews`,
`/editor/reviews/demo`, and `/editor/articles/demo/analytics`.

## Frontend structure

- `views/pages/` contains public, reporter, editor, and authentication pages.
- `views/partials/` contains reusable public, newsroom, comment, analytics, and
  shared EJS fragments.
- `data/mock/pages/` contains one presentation data file per page.
- `public/css/` and `public/js/` are served by Express as static assets.
- `styles/DESIGN.md` documents the CSS design system whose browser files live in
  `public/css/`.

No environment variables are required for the current mock frontend preview.
