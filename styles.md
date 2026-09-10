# The Daily Web CSS Guide

## Source of truth

The browser loads `/css/style.css` from `views/partials/shared/head.ejs`.
Runtime styles live in `public/css/`; top-level `styles/` is not served.

`style.css` loads Google Fonts/Material Symbols, then:

1. `variables.css`
2. `base.css`
3. `utilities.css`
4. `components.css`
5. `layouts.css`
6. `pages.css`

This order is a cascade contract. Do not link individual layers or add a
page stylesheet that bypasses it.

## Layer responsibilities

### `variables.css`

Shared semantic colors; Newsreader, Inter, and Material Symbols font stacks;
type scales; spacing/gutters; content widths; media dimensions/ratios; radii;
shadows; controls; header/workspace geometry; and workflow colors. Reuse tokens
for recurring values. Add one only for a genuinely shared value, not a local
page adjustment.

### `base.css`

Sizing/reset rules and element defaults: typography, links, headings, media,
forms, focus, disabled controls, scrollbars, tables, and reduced motion. It
affects every page and should change rarely.

### `utilities.css`

A finite hand-written vocabulary, not Tailwind:

- display/position, flex alignment, and editorial grid presets;
- `.gap-*`, `.stack-*`, `.pad-*`, and `.margin-*` spacing;
- `.text-1`–`.text-8`, font roles/weights, and semantic editorial text;
- `.surface-*`, `.color-*`, `.rule*`, `.radius-*`, `.shadow-*`;
- widths, heights, media, avatars, state, motion, and interaction;
- responsive `sm-`, `md-`, and `lg-` helpers.

Numbers are named scale steps, not arbitrary values. Do not add one-off pixel
utilities or a parallel spacing/type/color system.

### `components.css`

Cross-page patterns: `.button*`, `.form-field*`, `.site-logo`, `.site-header*`,
`.site-search*`, `.site-mobile-menu*`, `.site-breaking-bar`, `.article-card*`,
`.comment-form*`, `.comment-item*`, `.status-badge*`,
`.article-filter-strip*`, `.analytics-summary-metric*`,
`.analytics-chart-legend*`, media frames, `.control-*`, `.icon`, table defaults,
toolbars, editor actions, and comparison media.

The file also retains parity selectors used by detailed page markup. Confirm
EJS usage before removing or consolidating them.

### `layouts.css`

Reusable geometry: `.page-shell`, `.reading-column`, `.editorial-grid`,
newsroom sidebar/content, public main/footer offsets, reporter workspaces,
newsroom footer, editor header offsets, and workspace composition. Geometry
used by only one page belongs in `pages.css`.

### `pages.css`

Page-family rules, preferably scoped by these roots:

- Public: `.public-page`, `.publication-page`, `.article-page`, `.search-page`,
  `.category-page`.
- Reporter: `.reporter-articles*` and `.article-editor*`.
- Auth: `.staff-login*`.
- Editor: `.review-queue*`, `.review-article*`, `.analytics-page*`,
  `.staff-directory*`, plus compatibility roots `.editor-queue-page`,
  `.editor-diff-page`, and `.editor-analytics-page`.

Put one-page exceptions here and scope them under the page root.

## Naming

The code intentionally combines:

- lowercase role-based utilities such as `.surface-paper`, `.color-muted`,
  `.text-headline`, and `.pad-inline-5`;
- BEM-like semantic names such as `.article-card__media`,
  `.article-editor__sidebar`, and `.review-article__action--approve`.

State hooks such as `.state-hidden`, `.state-loading`, `.filter-btn.active`,
and `.is-authenticating` may be toggled by JavaScript. IDs and `data-*` are
also script contracts. Name new classes by editorial/interface purpose, keep
the convention of their component, and do not introduce a third naming style.

## Shared markup relationships

The standard/newsroom mastheads, article card, comment item, editor status, and
analytics metric have EJS partials. Their shared semantic selectors belong in
`components.css`.

Two structures also have browser renderers:

- `partials/public/article-card.ejs` matches `public/js/feed.js`.
- `partials/comments/comment-item.ejs` matches `public/js/comments.js`.
- `pages/editor/staff.ejs` table rows match `public/js/staffDirectory.js`.

Keep each pair synchronized. Before editing a component based on a partial,
search for active `include()` calls; every remaining partial has at least one.

## Responsive conventions

Use only the existing boundaries:

- default/mobile below 640px;
- small at 640px;
- medium/tablet at 768px;
- large/desktop at 1024px;
- extra-wide refinements at 1280px.

Matching 639px, 767px, and 1023px maximums and bounded tablet queries already
exist. Preserve them rather than inventing nearby breakpoints.

- `.page-shell` uses shared gutters and a 1280px maximum.
- `.reading-column` limits prose to 680px; article layout also uses the named
  820px content token where appropriate.
- `.editorial-grid` is 4 columns by default, 8 at 768px, 12 at 1024px.
- Shared tokens/rules reserve fixed public header and breaking-strip space.
- Reporter/editor multi-column workspaces begin at 1024px.
- Tables retain structure inside overflow wrappers on narrow screens.
- Navigation compacts below 768px; forms/controls refine below 640px.
- `prefers-reduced-motion` behavior remains centralized in `base.css`.

Test both sides of every touched boundary, especially 639/640, 767/768, and
1023/1024.

## When not to modify shared CSS

Do not edit a global token, base rule, utility, shared component, or layout to
solve a single-page mismatch unless the result is correct for every consumer.
Use a page-root-scoped `pages.css` rule when only one page/workflow changes, a
component is intentionally denser there, or a shared edit would affect other
public/reporter/editor views.

Check all EJS includes and JS-generated equivalents before changing
`.site-header*`, `.site-logo`, `.button`, `.form-field*`, `.article-card*`,
`.comment-item*`, `.control-*`, `.icon`, or `.state-hidden`.

Do not:

- change a token to compensate for one page;
- add inline styles or another linked stylesheet;
- add unscoped page overrides;
- rename/remove state classes, IDs, or `data-*` without updating scripts;
- change shared card/comment DOM in only one render path;
- alter Newsreader/Inter, the paper/ink/slate/crimson language, or the existing
  radius/shadow scales during a feature fix;
- treat hard-coded editorial/technology reference pages as active truth.

## Safe workflow

1. Identify the active route, EJS root, includes, and page script.
2. Search all selector uses and related JS hooks.
3. Reuse a token/utility for small composition needs.
4. Change shared layers only for truly shared behavior; otherwise scope in
   `pages.css`.
5. Synchronize server- and browser-rendered markup when applicable.
6. Verify focus, disabled, loading, empty, and error states at narrow and wide
   sizes without changing the established visual design.
