# The Daily Web: Tailwind to Design System Migration Plan

## Purpose

Migrate the 11 root HTML prototypes from the current Tailwind CDN utility contract to the local Daily Web design system while preserving the existing visual design, responsive behavior, JavaScript interactions, accessibility hooks, and page structure.

This plan is based on a page-by-page scan by one subagent per root HTML page and a review of the shared stylesheet system.

## Scope

### Root HTML files

- `article-comments.html`
- `article-review-analytics-editor-desk.html`
- `edit-article-reporter-portal.html`
- `editor-review-desk.html`
- `homepage-editorial.html`
- `homepage-publication.html`
- `my-articles-reporter-portal.html`
- `review-queue-editor-desk.html`
- `search-results.html`
- `staff-login.html`
- `technology.html`

### Design-system files

- `styles/variables.css`
- `styles/base.css`
- `styles/utilities.css`
- `styles/components.css`
- `styles/layouts.css`
- `styles/pages.css`
- `styles/style.css`

### Explicit exclusions

- Do not inspect or modify `docs/`.
- Do not add React, Tailwind replacements, or another frontend framework.
- Do not change backend architecture.
- Do not commit changes or create branches.
- Do not perform unrelated security or content refactors during this styling migration.

## Current Findings

1. All 11 root pages still load `https://cdn.tailwindcss.com`.
2. All 11 pages contain an inline Tailwind configuration and duplicated inline base/reset CSS.
3. The pages do not currently use the local `styles/style.css` entry point.
4. The local design system already contains the core paper, ink, slate, crimson, typography, spacing, radius, shadow, layout, media, and control patterns.
5. The local system does not yet cover every Tailwind utility used by the prototypes, especially arbitrary dimensions, directional spacing, opacity variants, responsive variants, grid spans, exact positioning, status modifiers, and grouped hover states.
6. Several inline scripts directly add and remove Tailwind visual classes. These scripts must be updated together with the affected markup, or temporary compatibility aliases must be deliberately provided.
7. The existing visual direction is the Contemporary Editorial Broadsheet system: Newsreader for editorial text, Inter for interface text, Material Symbols for icons, neutral paper surfaces, deep ink structure, and restrained crimson states.

## Migration Rules

1. Use semantic design-system names instead of retaining property-oriented Tailwind names.
2. Reuse variables from `styles/variables.css`; do not add arbitrary values directly to migrated HTML.
3. Keep shared primitives in `utilities.css`, reusable visual patterns in `components.css`, page composition in `layouts.css`, and page-family exceptions in `pages.css`.
4. Preserve all IDs, `data-*` attributes, links, form attributes, inline handlers, icon ligature text, image URLs, image `alt` and `data-alt` attributes, SVG geometry, and semantic HTML.
5. Keep structural JavaScript hooks separate from visual state classes.
6. Keep visible keyboard focus. Do not replace `focus:outline-none` with an inaccessible focusless state.
7. Preserve the current breakpoints unless a named design-system rule intentionally reproduces the same Tailwind breakpoint.
8. Use semantic status modifiers for workflow states rather than scattered raw palette classes.
9. Remove Tailwind only after every static and runtime-generated class has a local equivalent.
10. Validate each page immediately after its migration before moving to the next page.

## Shared Design-System Work

### `styles/variables.css`

Add only repeated, approved tokens that are required for parity:

- Header heights and fixed/sticky offsets, including 64px and 112px shells.
- Named z-index/layer values for headers, filters, overlays, and sidebars.
- Exact recurring media heights and review-pane limits.
- Small spacing values needed repeatedly: 2px, 4px, 6px, 8px, 10px, and 14px.
- Named icon and status-dot dimensions.
- Semantic success, warning, returned-for-changes, draft, rejected, and disabled colors.
- Translucent surface variants used by glass headers, row hovers, version history, and overlays.
- Exact motion durations where the existing design visibly depends on 300ms, 500ms, or 700ms behavior.

Keep the existing palette and typography. Do not introduce a second color or spacing scale.

### `styles/utilities.css`

Add missing reusable primitives:

- `margin-inline-auto`, `margin-left-auto`, `margin-top-auto`, and directional margins.
- `min-width-zero`, `width-auto`, `inline-block`, and flex no-wrap.
- `align-baseline`, `align-self-end`, `align-self-auto`, and responsive alignment variants.
- `overflow-y-auto`, `appearance-none`, `pointer-events-none`, and `align-middle`.
- Directional padding utilities and compact padding utilities.
- Small gap, margin, and padding steps without arbitrary-value class names.
- Responsive `sm`, `md`, `lg`, and `xl` direction, display, width, alignment, and no-wrap utilities.
- Four-column grid presets and named editorial column spans, including 4/5/7/8/12-column spans.
- Correct desktop 8/4 content/sidebar spans.
- One-line and three-/four-line clamp utilities.
- Icon-size utilities independent of text roles.
- Opacity/state utilities for 40%, 50%, 60%, 70%, 75%, 90%, and subtle SVG treatments where required.
- `text-snug`, `text-none`, `text-capitalize`, `text-struck`, `text-not-italic`, and approved tracking roles.
- Named inset, layer, and transform utilities where the behavior is shared.

### `styles/components.css`

Add reusable patterns for:

- Fixed site headers and header content shells.
- Glass surfaces, translucent panels, and scrims.
- Search controls and custom select controls with icon positioning.
- Button variants, active/disabled/pressed states, and joined button groups.
- Filter pills, pagination buttons, and action groups.
- Status badges and status dots.
- Media overlays, image hover zoom, card hover title states, and responsive media frames.
- Timeline rules, markers, marker rings, progress bars, and review-pane emphasis.
- Feedback banners and runtime success/error states.
- Table rows, stable table columns, alternating surfaces, and table hover states.
- Newsletter/input groups.
- Exact focus, placeholder, checkbox accent, and reduced-motion behavior.

### `styles/layouts.css`

Extend shared composition for:

- Centered page shells and responsive gutters.
- Fixed header offsets and sticky filter offsets.
- Responsive 4/8/12-column editorial grids.
- Named 8/4 content/sidebar arrangements.
- Public page header/content/footer composition.
- Newsroom fixed rail and content offset behavior.
- Review pane and independently scrolling workspace layout.
- Responsive footer grid composition.

### `styles/pages.css`

Add only page-family rules for:

- Public homepage and article geometry.
- Search and result-card layout.
- Reporter tables and portal controls.
- Editor review and analytics panes.
- Login shell and feedback layout.
- Technology feature, card, skeleton, and filter geometry.

### `styles/style.css`

Keep the current import order:

1. `variables.css`
2. `base.css`
3. `utilities.css`
4. `components.css`
5. `layouts.css`
6. `pages.css`

Use this file only as the local stylesheet entry point. Do not place page-specific CSS here.

## Page-by-Page Migration Maps

### 1. `article-comments.html`

#### Replace

- `flex`, `grid`, alignment, wrapping, and direction utilities with local layout primitives.
- `gap-space-*` with the local numeric gap scale.
- `space-y-space-*` with `stack-*` rules.
- Tailwind surfaces and colors with `surface-*` and `color-*` roles.
- Tailwind typography pairs with `text-heading-*`, `text-deck`, `text-article`, `text-meta`, and weight utilities.
- `rounded-*` and `shadow-*` with local radius and elevation roles.
- `object-cover`, width, height, and overflow utilities with media-frame/media-image rules.
- `hover:*`, `group-hover:*`, and transition utilities with named card and control interaction rules.
- Form focus classes with `control-input` and the shared accessible focus treatment.

#### Add or verify

- Fixed header positioning, 64px header geometry, stacking layer, and main-content offset.
- An article reading width matching the existing 820px visual intent.
- Featured media at 440px and stable related-card media geometry.
- Avatar and 6px status-dot dimensions.
- Responsive related-card and comment-form grids.
- Two-line related-story clamp and related-image zoom.
- Exact quote/drop-cap typography, opacity, and tracking where visible.
- Semantic avatar surface and inverse text roles.

#### Preserve

- `comment-form`, `guest-name`, `guest-affil`, `comment-text`, `char-counter`, `comments-list`, and `comments-count`.
- Form validation attributes, `maxlength`, `rows`, links, images, and Material Symbol text.
- Dynamic comment insertion, count increment, form reset, and counter reset.
- `data-path`, `data-active-classes`, and navigation state contracts.

#### Validation

- Submit a comment and verify insertion, count, reset, and counter behavior.
- Test long names, affiliations, and comments for wrapping.
- Verify header, featured media, related grid, form layout, focus, hover, and reduced motion.
- Record the existing direct `innerHTML` interpolation as a separate security follow-up; do not silently change it here.

### 2. `article-review-analytics-editor-desk.html`

#### Replace

- Fixed header utilities with a named header selector and layer.
- `grid-cols-12`, `lg:col-span-8`, and `lg:col-span-4` with the corrected 8/4 editorial layout.
- `sticky top-20` with a named header-offset sticky sidebar.
- Tailwind surfaces, typography, spacing, radii, shadows, and media utilities with local roles.
- Chart and SVG utility dimensions with named chart geometry.
- Action hover/focus/active utilities with button component states.

#### Add or verify

- Notice banner responsive row/stack behavior.
- Article figure dimensions and `overflow-visible` chart behavior.
- 720px review-pane limit and vertical scrolling.
- Version-history translucent surfaces.
- Error, secondary, primary, and pending-review semantic color roles.
- Exact legend-dot, avatar, icon, and textarea dimensions.

#### Preserve

- `editorNotes`, `statusAlert`, `handleEditorialAction`, and all three action values.
- `chartGradient`, SVG structure, chart attributes, and Material Symbol content.
- Dynamic status alert class replacement, note validation, focus, and scrolling.

#### Validation

- Test approve, request changes with/without notes, and reject.
- Verify alert visibility after JavaScript replaces `className`.
- Check desktop 8/4 layout, sticky sidebar, mobile stacking, chart rendering, focus, and textarea behavior.

### 3. `edit-article-reporter-portal.html`

#### Replace

- Fixed newsroom rail and content layout with newsroom shell classes.
- Toolbar, breadcrumb, editor, revision, and action utility combinations with semantic components.
- Tailwind timeline utilities with named timeline list, rule, marker, and ring selectors.
- Review-pane height/scroll utilities with a named scroll pane.
- Diff typography with `text-struck` and `text-not-italic` roles.
- Progress and action controls with named component states.

#### Add or verify

- Responsive newsroom rail/content spans.
- Exact timeline pseudo-element positioning.
- Review-pane max-height and vertical overflow.
- Progress-bar fill geometry and colors.
- Exact metric/avatar/media/icon dimensions.
- Placeholder, checkbox accent, hover, active, and focus states.

#### Preserve

- All editor IDs, save/submit/preview hooks, revision data, contenteditable/form behavior, and script-generated classes.
- `data-path`, `data-active-classes`, image metadata, and Material Symbol text.

#### Validation

- Test editor actions, autosave/status changes, revision display, timeline alignment, scrolling, and responsive newsroom behavior.

### 4. `editor-review-desk.html`

#### Replace

- `fixed left-0 top-0 h-full w-64` with `newsroom-sidebar` and semantic rail rules.
- Rail border and stacking classes with named directional rule/layer styles.
- `lg:col-span-*` with corrected 8/4 workspace spans.
- Medium grid variants with exact 768px behavior.
- Tailwind timeline, review-pane, status, ring, and control utilities with semantic selectors.

#### Add or verify

- Four-column telemetry layout from the correct breakpoint.
- 192px comparison media height and 720px scroll pane.
- Timeline pseudo-element, 2px rule, marker rings, and offsets.
- Secondary, fixed-secondary, error, outline, and translucent surfaces.
- Progress bar, checkbox accent, placeholder, active, hover, and focus behavior.

#### Preserve

- `btn-approve`, `btn-request-revisions`, `btn-preview`.
- Sidebar `data-path` and `data-active-classes` values.
- Image `data-alt`, navigation links, and inline listeners.

#### Validation

- Test all review actions, comparison scrolling, timeline alignment, sidebar behavior, responsive workspace layout, and keyboard focus.

### 5. `homepage-editorial.html`

#### Replace

- Fixed/glass header utilities with named site-header and surface-glass rules.
- Breaking ticker, lead story, secondary cards, dispatch stream, telemetry, sidebar widgets, and footer utility combinations with semantic components.
- `group-hover:*` with named interactive card/media descendant selectors.
- Gradient/scrim utility combinations with media overlay selectors.
- Arbitrary media heights, grid spans, clamp values, and footer columns with named geometry.

#### Add or verify

- Header height, offset, layer, and responsive visibility.
- Ticker stacking/horizontal alignment and truncation.
- Lead media and story-card media heights.
- Responsive 12-column content/sidebar composition.
- Four-column and five-column widget/footer layouts.
- Live ping, spinner, loading, and reduced-motion behavior.
- Newsletter input-group corner rules.
- Quote mark, mono timestamp, rank, status-dot, and chart dimensions.

#### Preserve

- `data-path`, image attributes, SVG/chart structure, icon ligatures, search/archive labels, and loading controls.

#### Validation

- Verify mobile, tablet, and desktop headers, ticker, hero, cards, sidebar widgets, footer, hover zoom, live states, and focus.

### 6. `homepage-publication.html`

#### Replace

- Publication header, ticker, feature grid, dispatch stream, sidebar, widgets, and footer utilities with the public-page design system.
- Fixed header and main offset with named shell classes.
- Tailwind media, rank, date-tile, icon, grid, footer, and input-group dimensions with semantic geometry.
- Hover/group state utilities with local interactive selectors.

#### Add or verify

- 64px header and top offset.
- Lead and secondary media heights.
- Mobile/tablet/desktop grid variants.
- Four-column widget and footer layouts.
- Glass, scrim, hover, live-indicator, weather, and newsletter states.
- Exact ranking, date-tile, icon, and footer control dimensions.

#### Preserve

- Public links, search/archive labels, widget data, SVGs, image metadata, accessible labels, and scripts.

#### Validation

- Compare all public sections at 375px, 768px, 1024px, and 1280px. Verify no fixed header overlap and no content overflow.

### 7. `my-articles-reporter-portal.html`

#### Replace

- Context bar, page header, create action, filters, search/select controls, table, badges, action groups, empty state, and pagination with local components.
- Status palette classes with semantic modifiers.
- Table arbitrary widths/paddings with named column and cell rules.
- Search/select absolute icon utilities with named control selectors.
- `hidden`, opacity, hover, disabled, active, and focus classes with local state rules.

#### Add or verify

- Fixed header positioning, 64px height, z-index, and content offset.
- `sm`/`md`/`lg` layout variants and control widths.
- Stable category/status/date/views/actions columns.
- 48px thumbnails and one-line title clamp.
- Distinct published, pending, changes-requested, draft, and rejected treatments.
- Empty-state measure, icon opacity, disabled pagination, and table scrolling.

#### Preserve

- `.filter-btn`, active state contract, `.article-row`, `statusFilterPills`, `categorySelect`, `articleSearchInput`, `articlesTableBody`, `noResultsState`, `displayedCount`.
- `data-status`, `data-category`, `data-path`, `hidden`, `disabled`, and current filtering logic.

#### Validation

- Test every status, category, search, reset, empty-state, count, pagination, hover, keyboard, and responsive table path.

### 8. `review-queue-editor-desk.html`

#### Replace

- Editor context/header, metrics, search, category/reset controls, review table, statuses, pagination, widgets, and footer with local components.
- Fixed header offsets, 12-column grid, and 8/4 layout with named composition classes.
- Table scroll, stable columns, row hover, status dots, and compact controls with semantic rules.

#### Add or verify

- Exact header layer and content offset.
- Correct 8/4 desktop composition and mobile stacking.
- Warning, returned-for-changes, published, and error status distinction.
- Search/select icon positioning, compact spacing, focus, disabled, and active states.
- Footer responsive grid and table minimum width.

#### Preserve

- `queueSearch`, `categoryFilter`, `resetFilters`, `queueTable`, `data-category`, `data-status`, `data-path`, and disabled pagination attributes.
- Row filtering through `row.style.display`.
- Material icon text and inline filtering script.

#### Validation

- Test case-insensitive search, category filtering, reset, pagination, table scroll, and all responsive breakpoints.

### 9. `search-results.html`

#### Replace

- Query header, search form/meta/tags, filter sidebar, radio/checkbox controls, date/sort controls, result cards, telemetry, and footer utility combinations.
- `lg:col-span-4`/`lg:col-span-8` with the local 4/8 editorial arrangement.
- Sticky sidebar offset with a named header-aware rule.
- Arbitrary input/icon/media dimensions with semantic control and result-card geometry.

#### Add or verify

- Search/select controls, placeholder, focus, checkbox/radio accent, and icon positioning.
- Filter sidebar spacing and sticky behavior.
- Result-card media dimensions, metadata, marks, title/excerpt clamps, and author avatars.
- Telemetry box and progress fill.
- Active tags, filter buttons, hover, and pagination states.

#### Preserve

- `searchForm`, `searchInput`, `resetBtn`, `sortBySelect`, radio/checkbox names and values, result links/data, and Material Symbol content.

#### Validation

- Verify search form, reset, sorting/filter controls, responsive 4/8 layout, sticky sidebar, card wrapping, table-like metadata, and focus.

### 10. `staff-login.html`

#### Replace

- Login shell, panel, logo/status masthead, inputs, remember control, submit button, feedback banner, demo notice, and footer links.
- Form surface, typography, spacing, radius, shadow, focus, hover, and state classes with local components.
- `object-contain`, checkbox accent, exact opacity, and button active-state behavior with semantic selectors.

#### Add or verify

- Login panel max width and centered responsive geometry.
- Logo width and containment.
- Exact 8px/6px status dots and checkbox dimensions.
- Success/error feedback surfaces and runtime visibility.
- Loading `opacity-75`, authenticating text, and restored button content.
- Placeholder and accessible focus treatment.

#### Preserve

- `loginForm`, `handleLogin`, `staffEmail`, `staffPassword`, `rememberMe`, `signInBtn`, `statusMessage`, inline submit handler, runtime `className` assignments, and injected button markup.

#### Validation

- Test successful login, failed login, loading state, focus, checkbox association, logo responsiveness, and mobile panel sizing.

### 11. `technology.html`

#### Replace

- Fixed 112px header, channel hero, sticky filter ribbon, feature article, card grid, dispatch stream, sidebar, skeleton, pagination, and footer utilities.
- Tailwind 7/5 feature and 8/4 content/sidebar spans with named editorial spans.
- Filter/search/select, bookmark, skeleton, hover, ping, spinner, glass, and scrim classes with local components.

#### Add or verify

- Header height and sticky filter offset.
- Hero grid overlay and noninteractive SVG layer.
- Feature media at 380px mobile/500px desktop intent.
- Card media, 1/2/3-column grids, three-/four-line clamps, and hover zoom.
- Skeleton dimensions, loading/dim state, bookmark state, pagination buttons, and disabled opacity.
- Footer five-column desktop and two-column tablet layout.
- Exact icon sizes, select offsets, and input control geometry.

#### Preserve

- `filter-btn`, `bookmark-btn`, `loadingSkeleton`, `articleGrid`, `paginationControls`, `beatSearchInput`, `dateFilterSelect`, `sortBySelect`.
- `data-filter`, `data-active`, `data-path`, `data-alt`, icon lookup classes, and all script-mutated classes.

#### Validation

- Test filters, search, sorting, date selection, skeleton visibility, loading dim state, bookmark icon/state, pagination, focus, hover, and responsive media/layout.

## Tailwind Removal Sequence

1. Add and validate all required shared design-system rules.
2. Migrate one root page and its script-controlled classes.
3. Link `styles/style.css` on that page.
4. Run the page validation and static class scan.
5. Repeat for the remaining pages.
6. After all pages are migrated, remove from every root page:
   - Tailwind CDN script.
   - Inline Tailwind configuration.
   - Duplicated inline `@layer base` reset where local `base.css` covers it.
   - Redundant page-level Google Font imports, retaining the authoritative local entry-point imports.
7. Keep `material-symbols-outlined` temporarily when a page script queries that selector, or migrate the script and markup atomically to the local `icon` class.
8. Confirm no visual or runtime behavior still depends on Tailwind.

## JavaScript Contract Checklist

The following behavior contracts must remain intact:

- Form IDs and event listeners.
- `data-path`, `data-filter`, `data-status`, `data-category`, `data-active`, and `data-active-classes`.
- Filtering through `style.display` where currently used.
- Dynamic `className` assignments and class-list mutations.
- Comment insertion/count/reset/counter behavior.
- Editor approve/request/reject behavior.
- Login loading/success/error behavior.
- Reporter search/category/status filtering and empty-state behavior.
- Review queue search/category/reset behavior.
- Technology filter/sort/date/bookmark/skeleton/pagination behavior.
- Material Symbol ligatures and selectors used by scripts.

Any presentation class changed in a script must be changed in the corresponding HTML and script in the same migration step.

## Validation and Approval

### Static validation

- No root HTML file contains `cdn.tailwindcss`.
- No root HTML file contains `tailwind-config`.
- No unresolved Tailwind utility remains in static markup.
- No unresolved Tailwind utility remains in inline script-generated markup or class mutations.
- No arbitrary bracket-value class remains in migrated markup.
- Local stylesheet is linked from every root page.
- No file under `docs/` is changed.
- No unrelated file is modified.

### Responsive validation

Check at minimum:

- 375px mobile.
- 640px small breakpoint.
- 768px tablet breakpoint.
- 1024px desktop breakpoint.
- 1280px wide desktop.

Verify fixed/sticky offsets, 4/8/12-column composition, card and media dimensions, footer grids, table scrolling, control wrapping, and long-text overflow.

### Interaction validation

Test:

- Comment submission, count update, insertion order, reset, and character counter.
- Editorial approve, request changes, validation, and reject.
- Login success, failure, loading, and feedback visibility.
- Reporter status/category/search filtering, reset, empty state, pagination, and action controls.
- Review queue search, category filter, reset, and pagination.
- Search form, tags, radio/checkbox controls, date/sort controls, and reset.
- Technology filters, search, date/sort, bookmark, skeleton, loading, and pagination.

### Accessibility and visual validation

- Keyboard focus remains visible on every input, select, button, link, checkbox, and radio.
- Focus styles do not shift layout.
- Reduced-motion preferences suppress or reduce zoom, pulse, ping, and transition effects.
- Status and action colors meet contrast requirements.
- Long names, labels, article titles, comments, and metadata wrap without overlap.
- Images maintain stable dimensions while loading.
- Sticky and fixed elements never cover the first readable content.

## Completion Criteria

The migration is approved only when:

1. All 11 root pages use the local design system.
2. All Tailwind CDN/config dependencies are removed.
3. All Tailwind utilities are replaced by existing or newly documented semantic design-system rules.
4. All page-specific subagent maps are addressed.
5. JavaScript behavior and DOM contracts remain intact.
6. Responsive, visual, interaction, accessibility, and static checks pass.
7. No files under `docs/` are modified.
8. No commit is created.
