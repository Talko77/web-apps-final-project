# Project Structure: The Daily Web

This document outlines the architectural map and component responsibilities of **The Daily Web** project.

---

## 1. Application Root & Server

- **`server.js`**: Application entry point and composition root that initializes Express, Mongo session storage, static asset serving, EJS view configuration, route mounting, and centralized error handling.
- **`seed.js`**: Database population script that seeds initial users (reporters and editors), categorized articles with published/draft revisions, comments, and hourly analytics buckets.
- **`package.json`**: Project manifest specifying Node.js engine requirements, npm scripts, and runtime dependencies (Express, Mongoose, EJS, bcryptjs, connect-mongo, etc.).

---

## 2. Configuration (`config/`)

Application-wide configuration files and shared constants.

- **`config/constants.js`**: Central dictionary defining news categories, article workflow states, staff roles, and pagination limits.
- **`config/db.js`**: Establishes and monitors the MongoDB database connection using Mongoose.

---

## 3. Data Models (`models/`)

Mongoose schemas and models enforcing database structure, validation, and indexes.

- **`models/User.js`**: Represents newsroom staff accounts (reporters and editors) with bcrypt password hashing and credential verification.
- **`models/Article.js`**: Represents articles supporting dual-state versions (live published copy and working draft), editorial feedback notes, view counts, and search indexing.
- **`models/Comment.js`**: Stores public reader comments associated with published articles, including author name, affiliation, and timestamp.
- **`models/Analytics.js`**: Stores hourly aggregated view buckets and revision timestamps for visualizing readership impact over time.

---

## 4. Controllers (`controllers/`)

Business logic handlers processing requests, executing database operations, and rendering views or JSON responses.

- **`controllers/pageController.js`**: Prepares view-models and server-renders all public, reporter, editor, and authentication EJS pages.
- **`controllers/articleController.js`**: Handles article lifecycle actions including feed querying, drafting, autosaving, review submission, editorial approval/rejection, and deletion.
- **`controllers/authController.js`**: Manages staff login authentication, session destruction (logout), and current user identity queries.
- **`controllers/commentController.js`**: Validates, saves, and retrieves public reader comments for published stories.
- **`controllers/analyticsController.js`**: Aggregates hourly view statistics and editorial publication milestones for impact chart rendering.
- **`controllers/weatherController.js`**: Retrieves live weather data from OpenWeatherMap API with server-side caching and fallback data support.

---

## 5. Routes (`routes/`)

Express routing modules mapping HTTP paths to their corresponding controller actions and route middleware.

- **`routes/pages.js`**: Defines HTML page routes for public pages, reporter workspaces, and editor desks.
- **`routes/articles.js`**: REST API routes for article feed retrieval, drafting, submissions, reviews, and deletion.
- **`routes/auth.js`**: REST API routes for staff login, logout, and current session inspection.
- **`routes/comments.js`**: REST API routes for submitting and fetching article comments.
- **`routes/analytics.js`**: REST API route returning time-series analytics and milestone data for articles.
- **`routes/weather.js`**: REST API route providing current weather widget data.

---

## 6. Middleware (`middleware/`)

Reusable Express middleware handling authorization, rate limiting, and centralized error processing.

- **`middleware/auth.js`**: Enforces session-based authentication and role authorization guards (`requireAuth`, `requireReporter`, `requireEditor`).
- **`middleware/rateLimit.js`**: Restricts request frequencies for sensitive actions such as staff login attempts and public comment postings.
- **`middleware/errorHandler.js`**: Catches unhandled errors and 404s, logs operational details, and returns consistent JSON errors or error page renders.

---

## 7. Utilities (`utils/`)

Helper functions supporting async flow, logging, and data formatting.

- **`utils/asyncHandler.js`**: Wraps asynchronous Express route handlers to forward unhandled promise rejections directly to `next()`.
- **`utils/logger.js`**: Standardized logger writing timestamped events and errors to console output and `logs/app.log`.
- **`utils/viewMappers.js`**: Transforms database documents into formatted, presentation-ready view objects (dates, initials, reading times, badges).

---

## 8. Stylesheet Architecture (`public/css/`)

Vanilla CSS design system organized into a strict cascade hierarchy loaded through a single entry point.

- **`public/css/style.css`**: Master stylesheet importing all layers in cascade order.
- **`public/css/variables.css`**: Design tokens for typography, spacing scales, color themes, borders, and breakpoints.
- **`public/css/base.css`**: CSS reset, default HTML element typography, focus states, and reduced-motion rules.
- **`public/css/utilities.css`**: Reusable utility classes for layout, flexbox, grid, spacing, and typography.
- **`public/css/components.css`**: Reusable UI component styles for buttons, badges, forms, cards, and modal dialogs.
- **`public/css/layouts.css`**: Global layout shells, reading columns, responsive editorial grid systems, and header offsets.
- **`public/css/pages.css`**: Page-specific styling rules for public, reporter, editor, and login layouts.

---

## 9. Client JavaScript (`public/js/`)

Page-scoped vanilla browser scripts implementing interactivity and AJAX workflows without external frontend frameworks.

- **`public/js/api.js`**: Shared client library providing centralized fetch request wrappers, flash alerts, and logout handling.
- **`public/js/feed.js`**: Manages homepage infinite scrolling, category filtering, reading status filters, and dynamic card generation.
- **`public/js/comments.js`**: Handles comment posting via AJAX, character countdown validation, and dynamic insertion into the comment list.
- **`public/js/article-editor.js`**: Controls the reporter article composition form, character counters, image previewing, and save/submit actions.
- **`public/js/editorQueue.js`**: Manages client-side filtering, text searching, and filter resetting in the editor review queue table.
- **`public/js/editorReview.js`**: Handles editor decision buttons (approve, revise, delete) and revision feedback submissions via AJAX.
- **`public/js/analyticsChart.js`**: Renders the custom canvas-based views-over-time chart and plots revision milestone indicators.
- **`public/js/staff-login.js`**: Handles staff login form submission, input validation, and asynchronous error message display.
- **`public/js/weather.js`**: Fetches current weather status and injects the live widget into publication sidebars.

---

## 10. Views: Full Pages (`views/pages/`)

Server-rendered EJS templates generating full HTML pages across public and newsroom domains.

- **`views/error.ejs`**: Generic error view displaying HTTP error codes, error descriptions, and home navigation.
- **`views/pages/public/home.ejs`**: Main publication portal displaying featured stories, breaking news, latest dispatches, and the infinite-scroll article feed.
- **`views/pages/public/article.ejs`**: Full article view displaying story copy, reporter byline, metadata, related articles, and public comment thread.
- **`views/pages/public/search-results.ejs`**: Search results page offering keyword query matching, category filters, and popularity/date sorting.
- **`views/pages/public/category.ejs`**: Dynamic category page rendering category metadata, article counts, and filtered published article grid.
- **`views/pages/public/editorial-home.ejs`**: Static prototype layout retained for visual design reference.
- **`views/pages/reporter/articles.ejs`**: Reporter dashboard listing personal articles, publication statuses, view counts, and quick actions.
- **`views/pages/reporter/edit-article.ejs`**: Comprehensive reporter writing interface with headline, summary, body, image URL, category controls, and revision details.
- **`views/pages/editor/review-queue.ejs`**: Editorial queue displaying submitted articles awaiting review with filterable status counters and metadata.
- **`views/pages/editor/review-article.ejs`**: Editorial review interface displaying side-by-side comparison of the published version against the submitted draft, alongside decision controls.
- **`views/pages/editor/analytics.ejs`**: Editor dashboard displaying time-series view metrics, milestone annotations, and performance summary statistics.
- **`views/pages/auth/staff-login.ejs`**: Dedicated login screen allowing staff members to sign into reporter or editor workspaces.

---

## 11. Views: Reusable Partials (`views/partials/`)

Modular EJS fragments grouped by domain for consistent rendering across pages.

### Shared Partials (`views/partials/shared/`)
- **`views/partials/shared/head.ejs`**: Universal `<head>` partial containing character encoding, viewport settings, page title, favicon, stylesheet links, and core scripts.
- **`views/partials/shared/site-logo.ejs`**: Reusable brand identity element linking to the homepage or newsroom root.

### Public Partials (`views/partials/public/`)
- **`views/partials/public/header-standard.ejs`**: Standard header with logo, primary navigation links, search bar, and staff login/logout buttons.
- **`views/partials/public/header-desk.ejs`**: Reference desktop header partial used in non-routed prototype templates.
- **`views/partials/public/article-card.ejs`**: Universal article preview card displaying image, category, headline, excerpt, author, date, and reading time.
- **`views/partials/public/breaking-strip.ejs`**: High-visibility banner displayed beneath the header for breaking news alerts.
- **`views/partials/public/footer.ejs`**: Shared publication footer displaying brand title, course project disclaimer, and demo data notice across all active public pages.

### Newsroom Partials (`views/partials/newsroom/`)
- **`views/partials/newsroom/header.ejs`**: Internal newsroom navigation bar with role badge, desk links, staff identity, and quick link to public site.
- **`views/partials/newsroom/editor-status-badge.ejs`**: Color-coded visual indicator displaying an article's current workflow state.
- **`views/partials/newsroom/editor-queue-row.ejs`**: Component representing a single story in the editor review queue.
- **`views/partials/newsroom/editor-review-actions.ejs`**: Grouping of decision buttons (Approve, Request Changes, Reject) for reviewing drafts.
- **`views/partials/newsroom/feedback-form.ejs`**: Form allowing editors to compose and send constructive revision requests to reporters.
- **`views/partials/newsroom/reporter-command-ribbon.ejs`**: Reporter action toolbar showing autosave cloud indicators and draft submission buttons.
- **`views/partials/newsroom/reporter-filter-strip.ejs`**: Status pill buttons for filtering reporter article lists.
- **`views/partials/newsroom/sidebar.ejs`**: Navigation sidebar for editor queue and telemetry views.

### Comments Partials (`views/partials/comments/`)
- **`views/partials/comments/comment-item.ejs`**: Single comment item displaying user avatar, author name, timestamp, and message text.
- **`views/partials/comments/comment-form.ejs`**: Guest comment entry form with name, affiliation, char counter, and submit action.

### Analytics Partials (`views/partials/analytics/`)
- **`views/partials/analytics/summary-metric.ejs`**: Key metric summary tile displaying a labeled metric value, change indicator, and icon.
- **`views/partials/analytics/chart-legend.ejs`**: Legend explaining the view count line and publication update marker styles on the analytics plot.

---

## 12. Mock & Reference Data (`data/mock/`)

- **`data/mock/pages/`**: Static JSON data payloads mirroring view-model structures for local testing, rendering experiments, and prototype templates.
- **`data/mock/shared/`**: Shared mock assets.
