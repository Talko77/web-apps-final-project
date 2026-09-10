# The Daily Web

A news publication and newsroom workspace covering the full article lifecycle: drafting,
autosaving, editorial review, requested changes, approval, publication, post-publication
revisions, comments, view tracking and Impact Analytics.

## Install and run

Requirements: **Node.js 18 or newer** (the app uses the built-in `fetch`) and **MongoDB**,
either locally or on Atlas.

The commands below are meant to be copied as-is. Do not add trailing comments on the same
line — zsh does not treat `#` as an inline comment and will expand `~`.

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

1. `npm install` — installs dependencies. All dependencies are pure JavaScript, so there is
   no native compilation step and the same `node_modules` works on macOS, Linux and Windows.
2. `cp .env.example .env` — creates the environment file. Open `.env` and set
   `SESSION_SECRET`, and `WEATHER_API_KEY` if you want a live weather widget. The app also
   starts without the file, using defaults.
3. `npm run seed` — seeds 500 articles, 6 users, comments and view history.
4. `npm start` — starts the server. Use `npm run dev` for automatic reload.

The site runs at <http://localhost:3000>.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | no | Defaults to `mongodb://127.0.0.1:27017/daily_web` |
| `SESSION_SECRET` | in production | Key used to sign the session cookie |
| `PORT` | no | Defaults to 3000 |
| `NODE_ENV` | no | `development` or `production` |
| `WEATHER_API_KEY` | no | Free key from OpenWeatherMap. Without it the widget shows fallback data |
| `WEATHER_CITY` | no | Defaults to `Tel Aviv` |

`.env` is never committed. `.env.example` is the only template kept in the repository.

### Demo users

The password for every seeded user is `123456`. These accounts are created by
`npm run seed` only, for demonstration purposes.

| Username | Role | Name |
|---|---|---|
| `reporter1` | Reporter | Elena Vasquez |
| `reporter2` | Reporter | Marcus Bell |
| `reporter3` | Reporter | Priya Raman |
| `reporter4` | Reporter | Jonah Keller |
| `editor1` | Editor | Sarah Chen |
| `editor2` | Editor | Daniel Okafor |

## Project structure

```
server.js                 Entry point: middleware, session, route mounting
seed.js                   Demo data seeding
config/
  constants.js            Categories, article states, roles, page size
  db.js                   MongoDB connection
models/                   Model layer
  User.js                 Users, one-way password hashing
  Article.js              Articles, draft and published versions, indexes
  Comment.js              Comments
  Analytics.js            Hourly view buckets
controllers/              Controller layer
  authController.js       Sign in, sign out, current identity
  articleController.js    Feed, drafts, state transitions, deletion
  commentController.js    Comments
  analyticsController.js  Chart data
  weatherController.js    External service with caching
  pageController.js       EJS page rendering
routes/                   REST routes and view routes
middleware/
  auth.js                 Server-side authentication and authorisation
  rateLimit.js            Comment and sign-in rate limits
  errorHandler.js         404 and centralised error handling
utils/
  logger.js               Writes logs to file and console
  asyncHandler.js         Forwards async errors to the error handler
  viewMappers.js          Maps DB documents onto view fields
views/                    View layer (EJS)
  error.ejs               Generic error page
  pages/public/           Home, article page, search results, category page
  pages/reporter/         Reporter workspace
  pages/editor/           Review queue, version comparison, analytics
  pages/auth/             Staff login
  partials/               Shared components
public/
  css/                    Design system (variables, base, utilities, components, layouts, pages)
  js/                     Client-side JavaScript (vanilla, no framework)
logs/app.log              Error and operational event log
styles/DESIGN.md          Design system documentation
```

## Core functionality

### Home page
A feed of published articles only, with infinite scroll loading 20 articles at a time
(`IntersectionObserver` in `public/js/feed.js`), title search, category filtering,
read/unread filtering and sorting by publication date or popularity. All of these run over
Ajax with no full page reload.

### Article page
Fully server-rendered: the headline, body and comments are present in the initial HTML, so
the page is accessible to search engines without JavaScript. Posting a comment happens over
Ajax and the new comment appears immediately without reloading the list.

### Article states and transitions

| State | Moved by | To |
|---|---|---|
| Draft (`draft`) | Reporter | Pending Review |
| Pending Review (`pending`) | Editor | Published / Changes Requested |
| Changes Requested (`returned`) | Reporter | Pending Review |
| Published (`published`) | Reporter (editing) | back to Draft |

Every other transition is rejected on the server. Moving to `pending` is blocked when the
title, summary, content or category is missing.

### Editing a published article
The model separates `status` (the editorial state of the draft) from `isPublished` (whether a
public version exists). `publishedVersion` is what readers see and `draftVersion` is what the
reporter is working on. A published article therefore stays visible to the public while an
update to it is awaiting approval, and the new content replaces it only once an editor
approves.

### Work continuity
Drafts persist two ways, and both write to MongoDB:

- **Background autosave** — `public/js/article-editor.js` saves five seconds after the
  reporter stops typing, and immediately if the tab is hidden or closed. It only sends a
  request when the content actually changed, so idle pauses do not generate traffic. This
  satisfies the requirement that work is kept without a deliberate click on a Save button,
  and that refreshing, closing the browser or moving to another computer loses nothing.
- **Save Draft** — an explicit action for reporters who want to confirm the save themselves.

Because drafts live in MongoDB rather than the browser, returning to the editor always
restores the last version the reporter worked on, from any machine.

### Editor workspace
All articles with filtering by state, category and search. The review page shows the
published version and the version awaiting approval side by side, so it is clear what is
currently public and what would replace it. The editor can approve and publish, request
changes with a note (a note is required), and delete an article along with its comments and
view data.

### Impact Analytics
`public/js/analyticsChart.js` draws on a plain `<canvas>` with no external library: a time
axis, view counts along it, and dashed vertical lines at every point where an editor approved
and published an update. This makes it possible to see how the view count changed before and
after each update.

Views are pre-aggregated into hourly buckets (`models/Analytics.js`) rather than one row per
view. Each view is a single atomic `$inc` with `upsert`, so thousands of concurrent readers
neither lose counts nor create write pressure. `Article.totalViews` is maintained alongside so
that sorting by popularity is a single query with no aggregation.

### External service — weather
`controllers/weatherController.js` calls OpenWeatherMap on the free tier (no payment details)
and caches the result for 15 minutes. An `inFlight` guard prevents parallel calls when the
cache expires, so thousands of visitors translate into one external call per 15 minutes. On
failure it returns a stale cache or fallback data, and the widget marks the value as not
current.

## Security and permissions

- Three user types: Guest, Reporter, Editor.
- Passwords are stored only as one-way bcrypt hashes and cannot be recovered.
- Permissions are derived from the server-side session, never from data sent by the browser.
- Every protected route is checked on the server (`middleware/auth.js`). Hiding a button in
  the client is not authorisation.
- A reporter can edit only their own articles and cannot publish. An editor can view, edit,
  approve, return and delete.
- Sessions are stored in MongoDB (`connect-mongo`), so a signed-in user stays signed in
  across a server restart.
- All user text is output through `<%= %>` in EJS or `escapeHtml` on the client, preventing
  HTML injection.
- Rate limits: up to 3 comments per minute per device, and up to 20 sign-in attempts per
  5 minutes.
- User input is truncated to allowed lengths and categories are validated against a fixed list.

## REST endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Sign in |
| POST | `/api/auth/logout` | public | Sign out |
| GET | `/api/auth/me` | public | Current user |
| GET | `/api/articles/feed` | public | Feed with paging, search, filter and sort |
| GET | `/api/articles/mine` | Reporter | Own articles |
| GET | `/api/articles/manage` | Editor | All articles |
| GET | `/api/articles/:id` | Reporter/Editor | Single article |
| POST | `/api/articles` | Reporter | Create article |
| PUT | `/api/articles/:id` | Reporter/Editor | Save draft |
| PATCH | `/api/articles/:id/status` | Reporter/Editor | State transition |
| DELETE | `/api/articles/:id` | Editor | Delete article |
| GET | `/api/comments/article/:id` | public | Comments for an article |
| POST | `/api/comments/article/:id` | public | Add comment (rate limited) |
| DELETE | `/api/comments/:id` | Editor | Delete comment |
| GET | `/api/analytics/articles` | Editor | Articles selectable in the chart |
| GET | `/api/analytics/article/:id` | Editor | Timeline, views and publish events |
| GET | `/api/weather` | public | Cached weather |

### View routes

`/` home · `/category/:category` category · `/search` search · `/articles/:id` article page ·
`/staff/login` sign in · `/reporter/articles` my articles · `/reporter/articles/new/edit` new article ·
`/reporter/articles/:id/edit` edit · `/editor/reviews` review queue ·
`/editor/reviews/:id` version comparison · `/editor/articles/:id/analytics` analytics

## Models and indexes

| Model | Indexes |
|---|---|
| `User` | `username` unique |
| `Article` | `(isPublished, publishedAt)`, `(isPublished, totalViews)`, `(isPublished, category, publishedAt)`, `(reporter, updatedAt)`, `(status, updatedAt)` |
| `Comment` | `article`, `(article, createdAt)` |
| `Analytics` | `(article, timestamp)` unique |

Paging, filtering and sorting all happen in the database, and the feed selects only the
fields the card displays rather than the full article body, so the system stays fast with
thousands of articles.

## What to demonstrate

1. **Permissions** — try `/editor/reviews` as a guest and as a reporter, and try editing
   another reporter's article.
2. **Work continuity** — type in the article editor, refresh the page, and return to the
   same content.
3. **Server restart** — stop and restart the server while signed in.
4. **Versions** — edit a published article, submit it for approval, and confirm the public
   still sees the previous version.
5. **Search and paging** — infinite scroll and filtering over 500 articles.
6. **Comment limit** — post four comments in a minute and get blocked by the server.
7. **Weather** — first request hits the service, the second is served from cache.
8. **Impact Analytics** — pick an article with several updates and identify the view spike
   around each update point.

## Team contributions and AI usage

To be completed before submission:

- Contribution table: each student's name, the components they worked on and the branches
  they opened.
- Link to the Git repository (open for viewing) and documentation of the pull requests.
- Description of AI tool usage: which parts were produced with assistance, and how they were
  verified and understood.
