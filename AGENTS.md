# The Daily Web

## Project Overview

The Daily Web is a full-stack digital news publication and newsroom workspace. It supports the complete article lifecycle: drafting, autosaving, editorial review, requested changes, approval, publication, post-publication revisions, comments, view tracking, and impact analytics.

The product has three user roles:

- **Guest:** reads published articles, searches and filters the public feed, and posts comments.
- **Reporter:** creates and edits owned articles, autosaves work, and submits articles for review.
- **Editor:** reviews all articles, edits and approves submissions, publishes content, requests changes, and removes content.

The current repository contains the CSS design system and project
documentation. The former HTML prototypes have been removed from the active
source tree; historical versions remain recoverable through Git history.
The implementation should remain focused on this scope and should not
introduce a more complex architecture than the course requirements need.

## Required Technology

Use the technologies and patterns required by the course:

- Node.js and Express for the server, routes, middleware, and API.
- MVC separation between models, views, and controllers.
- MongoDB with Mongoose for persistent data.
- EJS where server-rendered templates are appropriate.
- Semantic HTML5, CSS, Flexbox, and responsive layouts.
- Vanilla JavaScript and Ajax for client-side interaction without unnecessary full-page reloads.
- REST-style routes and HTTP status codes.

React, Angular, Vue, and other unapproved frameworks or libraries must not be added. A package that was not taught in the course or explicitly allowed should be approved before use. Chart.js or canvas may be used for Impact Analytics, and a free weather service may be used without requiring payment details.

## Functional Requirements

### Public experience

- Show only approved and published articles in the public feed.
- Support infinite scrolling in batches of 20, search, category filtering, read/unread filtering, and sorting by publication date or popularity.
- Keep search, filters, sorting, loading more articles, and comments asynchronous where appropriate.
- Render the full article body in the initial server response for SEO; do not require JavaScript to load the article text.
- Track article views and allow public comments.
- Enforce a maximum of three comments per minute per guest device on the server. Client-side checks may improve the UI but cannot replace server enforcement.

### Authentication and roles

- Provide login for reporters and editors.
- Persist authentication across a server restart using a store outside process memory.
- Determine roles from the authenticated server-side user, never from values submitted by the browser.
- Enforce every permission on the server. A hidden or disabled client button is not authorization.

### Reporter workflow

- Reporters can create, search, filter, autosave, edit, and submit their own articles.
- Reporters can read editor feedback, revise returned work, and resubmit it.
- Reporters cannot edit another reporter's article, approve or publish content, or bypass the workflow.
- Autosaved drafts must be stored in MongoDB so work survives refreshes, browser closure, and switching computers.

### Editor workflow

- Editors can view and filter all articles, inspect pending content, compare revisions, approve and publish, request changes with a note, and delete articles.
- Enforce the legal article states: draft, awaiting approval, published, and returned for changes.
- Published content must remain public while a new revision is being edited or reviewed. Store the new work separately and replace the public revision only after editor approval.

### Analytics and weather

- Impact Analytics must show views over time and mark publication times for article updates.
- Aggregate views into time buckets with atomic updates so concurrent readers do not lose counts.
- Weather data must be cached and no older than 15 minutes. Do not make a separate external request for every visitor.

## Data and Security

The core data should cover users, articles, article revisions, comments, view statistics, and persistent sessions. Keep revisions separate from the public article state so an update cannot accidentally replace published content before approval.

- Store passwords only as one-way salted hashes; never store plaintext passwords.
- Keep secrets in environment variables. Commit `.env.example`, never real credentials, keys, or tokens.
- Validate route parameters, query strings, and request bodies.
- Check ownership and roles on every protected route.
- Escape user-provided text and prevent HTML injection in comments and other text fields.
- Return clear user-facing errors without exposing stack traces or secrets.
- Use suitable status codes, centralized error handling, and logs for important failures and workflow events.
- Paginate and filter in the database, return only required feed fields, and add indexes for common article, comment, revision, view, and session queries.

## Design and Accessibility

Follow the **Contemporary Editorial Broadsheet** direction already established in the repository:

- Use Newsreader for editorial headlines and Inter for interface text and metadata.
- Use a crisp paper-like neutral canvas, deep ink navy/slate structure, and restrained crimson for urgent or destructive states.
- Prefer strong typography, hairline rules, clear hierarchy, readable long-form measures, and minimal corner rounding.
- Use the responsive editorial grid: 12 columns on desktop, 8 on tablet, and 4 on mobile.
- Preserve accessible labels, readable contrast, keyboard-friendly controls, semantic elements, and clear status indicators.

Do not replace the established visual language with generic dashboard styling. Keep public reading pages and newsroom tools visually related while making each workflow easy to scan.

### Local Stylesheets

The `styles/` directory is the token-driven visual system for the public,
reporter, editor, analytics, and staff-login prototypes. Treat
[`styles/DESIGN.md`](styles/DESIGN.md) as the detailed CSS reference and keep
each file limited to its responsibility:

- `styles/style.css` imports Google Fonts and the local layers in order:
	variables, base, utilities, components, layouts, then pages.
- `styles/variables.css` contains semantic colors, Newsreader/Inter typography,
	spacing, responsive breakpoints, media dimensions, radii, shadows, workflow
	states, and page-parity geometry tokens.
- `styles/base.css` contains sizing resets, document defaults, media defaults,
	form inheritance, focus behavior, disabled controls, scrollbar rules, and
	reduced-motion behavior.
- `styles/utilities.css` contains reusable layout, spacing, typography, color,
	surface, media, responsive, state, motion, and interaction classes.
- `styles/components.css` contains shared links, buttons, inputs, media frames,
	icons, tables, newsroom controls, public mastheads, and status treatments.
- `styles/layouts.css` contains page shells, reading columns, four/eight/twelve
	column editorial grids, newsroom navigation, public offsets, and workspaces.
- `styles/pages.css` contains page-family details for public reading/search/
	technology views, reporter editing/articles/login, and editor
	analytics/queue/diff workflows.

Use the existing Newsreader and Inter pairing, semantic surface/color tokens,
and named utility classes. The responsive grid is four columns on mobile,
eight at 768px, and twelve at 1024px; newsroom navigation is 256px wide on
desktop and stacks below 768px. Reuse the existing 640px, 768px, 1024px, and
1280px breakpoints rather than adding a second scale.

Preserve accessible focus states, reduced-motion behavior, semantic HTML,
existing class names, and script-controlled state hooks such as
`.filter-btn.active`, `.is-authenticating`, and `.state-hidden`. Do not add
React or another frontend framework, arbitrary-value utility names, or a
second token scale. Keep stylesheet headers and section comments current when
CSS changes are made.

## Repository and Documentation

The active repository no longer contains the former root page prototypes or
the design-reference HTML files. Do not recreate or add HTML prototype files
to the project. Any archived prototype material is outside the project source
tree and is not an implementation dependency.

The [`styles/DESIGN.md`](styles/DESIGN.md) file is the authoritative reference
for the CSS system: layer order, tokens, typography, spacing, responsive
layout, visual roles, and page-family contracts. Use documentation as design
guidance, not as a reason to add a new framework or duplicate complex
architecture.

Keep [`README.md`](README.md) up to date with installation and run instructions, required environment variables, the main folder structure, and the implemented features. It may also document demo users, seed instructions, key routes, models, indexes, team contributions, and AI usage required by the course.

## Development Expectations

- Keep changes small, understandable, and consistent with the existing project.
- Make the simplest implementation that satisfies the requirements; avoid unnecessary service layers or abstractions.
- Use Git branches, focused commits, merges, and pull requests throughout development.
- Do not copy code from other projects or repositories. Everyone on the team must understand the code used in the submission.
- AI assistance is allowed, but its output must be verified, understood, and documented according to course policy.
- Before submission, seed at least 500 varied articles plus users, comments, workflow states, revisions, and view history for analytics.
- Test the critical demo paths: role restrictions, ownership, autosave and restart persistence, revision safety, public search/filtering, comment rate limiting, analytics, and weather-cache failure behavior.