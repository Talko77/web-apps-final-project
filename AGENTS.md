# The Daily Web: Repository Instructions

## Scope and stack

The Daily Web is a server-rendered news publication and newsroom application.
The active implementation uses Node.js, Express, MongoDB/Mongoose, EJS, vanilla
browser JavaScript, and CSS under `public/css/`. Do not introduce a client
framework, a second rendering system, or architectural layers beyond the
course requirements.

Roles remain server-enforced: guests read/search/comment; reporters manage and
submit their own drafts; editors review all work, publish or return it, delete
it, and inspect analytics. Derive roles from the session and never treat hidden
controls or browser-supplied role data as authorization.

## Current architecture

`server.js` is the composition root. It configures EJS, serves `public/`, uses a
Mongo-backed session store, exposes `currentUser` to templates, mounts JSON APIs
under `/api`, mounts page routes at `/`, and finishes with centralized errors.

- `routes/`: page/API paths and authentication middleware.
- `controllers/`: data access, workflow rules, view-model mapping, renders/JSON.
- `models/`: Mongoose users, articles, comments, and hourly analytics buckets.
- `middleware/`: role checks, rate limits, and error handling.
- `utils/`: async, logging, validation, and view-formatting helpers.
- `config/`: database setup and shared constants.
- `views/`: the only active EJS view tree.
- `public/css/` and `public/js/`: assets served by Express.
- `data/mock/`, `docs/`, and `styles/DESIGN.md`: supporting/reference material.

Do not use `publics/` as the asset root; Express serves `public/`. Do not add
runtime CSS to top-level `styles/`; its current file is documentation only.

## Active views and routes

- Public: `views/pages/public/home.ejs` (`/`), `category.ejs`
  (`/category/:category`), `article.ejs` (`/articles/:id`), and
  `search-results.ejs` (`/search`).
- Auth: `views/pages/auth/staff-login.ejs` (`/staff/login`).
- Reporter: `views/pages/reporter/articles.ejs` and `edit-article.ejs`.
- Editor: `views/pages/editor/review-queue.ejs`, `review-article.ejs`, and
  `analytics.ejs`.
- Errors: `views/error.ejs`.

`views/pages/public/editorial-home.ejs` contains large hard-coded
reference/prototype markup but is not rendered. `/editorial` redirects to `/`;
`/technology` redirects to `/category/technology`. Do not copy sample content
into active pages or treat it as another public implementation unless a
requested feature deliberately changes that contract.

## EJS composition and reuse

Pages are complete HTML documents; no EJS layout engine is installed. Every
active page includes `partials/shared/head`, which loads `/css/style.css` and
the shared `/js/api.js`. Page scripts are loaded at the end of their owner page.

Partials are grouped into `shared/`, `public/`, `newsroom/`, `comments/`, and
`analytics/`. Actual active reuse matters more than a file's presence:

- `shared/head` is universal; `shared/site-logo` is used by headers and login.
- `public/header-standard` serves active public/error pages and includes the
  optional `breaking-strip`.
- `public/footer` serves all active public pages.
- `newsroom/header` serves all active reporter/editor pages.
- `public/article-card` serves home, search, and related articles.
- `comments/comment-item`, `newsroom/editor-status-badge`, and
  `analytics/summary-metric` are used by their active domain pages.
- `header-desk` is used only by the two non-routed reference templates.
- `chart-legend`, `comment-form`, `editor-queue-row`, `editor-review-actions`,
  `feedback-form`, `reporter-command-ribbon`, `reporter-filter-strip`, and
  `newsroom/sidebar` currently have no active page include. Editing them alone
  does not change rendered UI.

Pass explicit locals and retain partial defaults. Use escaped EJS (`<%=`) for
data; reserve `<%-` for trusted partial inclusion or deliberately prepared
markup. Article bodies are server-rendered as escaped paragraphs for SEO and
injection safety.

`public/js/feed.js` builds the same article-card DOM as
`partials/public/article-card.ejs`; `public/js/comments.js` builds comment items
matching `partials/comments/comment-item.ejs`. Update both render paths when a
requested change alters either structure.

## Browser JavaScript contracts

Keep browser code vanilla and page-scoped; use `public/js/api.js` for shared
request/error/logout behavior. Existing IDs, `data-*`, and state classes are
behavioral APIs, including `data-article-id`, `data-status`, `data-category`,
`data-title`, `.filter-btn.active`, `.state-hidden`, and
`.is-authenticating`. Search `public/js/` before renaming markup hooks.

Article copy must not depend on client loading. Ajax is appropriate for feed
loading/filtering, comments, autosave/workflow actions, queue filtering,
analytics data, and weather.

## CSS architecture

`public/css/style.css` is the sole entry point. Its fixed cascade is:

1. `variables.css`: tokens and shared measurements.
2. `base.css`: reset, element defaults, focus, disabled, reduced motion.
3. `utilities.css`: composable layout, spacing, type, color, state, responsive.
4. `components.css`: reusable controls, headers, cards, forms, media, statuses.
5. `layouts.css`: shells, reading widths, grids, offsets, workspaces.
6. `pages.css`: public, reporter, login, editor, and analytics page rules.

Read `styles.md` before styling. Preserve import order and use the owning layer.
Markup intentionally mixes utilities (`flex`, `gap-*`, `text-*`, `surface-*`)
with BEM-like semantic names (`.article-card__title`,
`.review-article__action--approve`). Do not wholesale-convert either style.

Before modifying a shared class or reusable partial, determine every page/component that uses it. 
Prefer page-specific modifier classes when the requested change applies to only one page.

## Responsive conventions

Use the existing 640px, 768px, 1024px, and 1280px boundaries and matching
narrow `max-width` queries; do not create a second scale.

- `page-shell` centers content and supplies gutters.
- `reading-column` limits long-form measure.
- `editorial-grid` has 4 columns by default, 8 at 768px, and 12 at 1024px.
- Responsive utilities use `sm-`, `md-`, and `lg-` prefixes.
- Shared layout rules own fixed public/newsroom header offsets.
- Reporter/editor workspaces become desktop grids at 1024px; tables stack or
  scroll on narrow screens.
- Navigation compacts below 768px, with further control changes below 640px.

Preserve reduced-motion behavior, focus styles, semantic HTML, labels, keyboard
access, and contrast.

## Change boundaries

- Make the smallest requested change; do not opportunistically refactor or
  redesign adjacent code.
- Reuse an active partial for genuinely identical markup. Do not extract a
  one-off fragment merely for abstraction or assume an unused partial is live.
- Modify a shared partial/class only when every consumer should change.
  Otherwise use page-owned markup or a page-root-scoped rule in `pages.css`.
- Preserve separate draft/published versions and legal workflow states;
  published content stays public while an update is reviewed.
- Keep passwords hashed, secrets in environment variables, sessions in MongoDB,
  authorization/validation server-side, comment limits server-enforced, and
  analytics increments atomic.
- Do not add React/Vue/Angular, unapproved packages, prototype HTML, duplicate
  asset trees, or another token/breakpoint system.
- Update `README.md` when implementation changes affect setup, environment,
  routes, structure, or documented features.

## Verification

Match checks to the change. For EJS/CSS, inspect every active consumer, check
browser-script hooks, and test narrow/wide layouts. For application work,
exercise relevant role, ownership, workflow, persistence, and error paths.
Never treat a reference template or unused partial as proof an active route
works.
