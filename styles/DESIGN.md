# The Daily Web CSS Design System

This file documents the local visual system for The Daily Web. The browser CSS
files live in `public/css/`; they are organized as a token-driven cascade and
support public publication pages, reporter workflows, editor review tools,
analytics, and staff login. Those CSS files are the source of truth for the
contracts documented here.

## File responsibilities

`public/css/style.css` loads the layers in this order:

1. Google Fonts: Newsreader, Inter, and Material Symbols Outlined.
2. `variables.css`: semantic color, typography, spacing, geometry, media,
	workflow, and responsive tokens.
3. `base.css`: sizing reset, document defaults, media defaults, form
	inheritance, focus treatment, disabled controls, and reduced motion.
4. `utilities.css`: composable layout, type, surface, color, media, state,
	interaction, and responsive utility classes.
5. `components.css`: shared links, buttons, inputs, media frames, icons,
	tables, newsroom controls, public mastheads, and status details.
6. `layouts.css`: page shells, reading columns, responsive editorial grids,
	newsroom navigation, public offsets, and editor workspaces.
7. `pages.css`: page-family rules for article reading, publication, search,
	technology, reporter, login, review queue, analytics, and diff views.

Keep new rules in the layer that owns their responsibility. Do not modify the
CSS files while updating this document; this file records their current data.

## Visual language

The system uses a crisp paper-like canvas with deep ink structure and restrained
crimson for error and urgent states. Editorial display text uses Newsreader;
interface text, metadata, forms, tables, and captions use Inter. Material
Symbols Outlined is reserved for interface icons through the `.icon` class.

The light palette is defined with semantic tokens such as:

- Surfaces: `--color-background` and `--color-surface-container-*`.
- Ink: `--color-on-surface`, `--color-on-surface-variant`, and inverse tokens.
- Actions: `--color-primary`, `--color-secondary`, and their container tokens.
- Feedback: error, info, warning, and success container/ink pairs.
- Workflow: pending, returned, published, draft, rejected, and submit-success
	colors, including reporter and editor-specific status tokens.

Dark mode remains reserved. No dark palette or dark selectors are implemented.

## Naming rules

Use lowercase words separated by hyphens. Prefix names with their role when useful, such as `layout-`, `text-`, `surface-`, `color-`, `state-`, or `motion-`.

Choose names that describe purpose rather than CSS implementation:

- `layout-*` controls composition, alignment, sizing, and positioning.
- `text-*` identifies a type role or numbered type scale step.
- `surface-*` identifies a paper, panel, ink, or alert surface.
- `color-*` identifies text color by editorial purpose.
- `gap-*`, `stack-*`, `space-*`, and `pad-*` describe editorial rhythm.
- `control-*` identifies control behavior or icon treatment.
- `state-*` identifies state, such as hidden, muted, loading, or spinning.
- `motion-*` identifies transitions.
- `interaction-*` identifies hover or user interaction behavior.

Useful visual roles include `surface-page`, `surface-paper`, `surface-panel`,
`surface-ink`, `surface-alert`, `surface-info`, `surface-warning`,
`surface-success`, `surface-scrim`, `surface-hero-fade`, and `surface-glass`.
Use `text-heading-*`, `text-kicker`, `text-meta`, `text-byline`, `text-deck`,
`text-quote`, and `text-article` for editorial content. Use `media-frame`,
`media-hero`, `media-card`, `media-thumbnail`, `media-image`, `avatar-small`,
`avatar-medium`, `avatar-large`, and `image-logo` for imagery.

## Token usage

Use the custom properties in `variables.css` for repeated values. Do not
introduce a second color, spacing, typography, radius, shadow, or breakpoint
scale in a page file. Keep the existing paper, ink, slate, and crimson palette
and the Newsreader plus Inter type pairing.

## Typography system

Newsreader is the primary editorial family for displays, headlines, decks,
quotes, and long-form narrative emphasis. Inter is the secondary interface
family for body copy, navigation, forms, labels, metadata, tables, and
captions. Material Symbols Outlined is reserved for interface icons.

The font imports live in `style.css`. The token fallbacks are intentionally
ordered so the design remains readable if Google Fonts is unavailable:

- Display and editorial text: `Newsreader`, `Georgia`, `Times New Roman`, serif.
- Interface and metadata: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, sans-serif.
- Icons: `Material Symbols Outlined`, sans-serif.

Use the existing weight range rather than synthesizing new hierarchy: regular
for reading text, medium for supporting headings, semibold for headlines and
actions, and bold for caps labels and strong status text.

## Layout and responsive behavior

`page-shell` centers content at the shared maximum width. `reading-column`
protects long-form text. `editorial-grid` uses four columns on mobile, eight
at 768px, and twelve at 1024px. The `grid-single`, `grid-split`,
`grid-triple`, `span-sidebar`, `span-content`, and `span-wide` utilities
describe common compositions without arbitrary-value class names.

Newsroom navigation is fixed at 256px on desktop and becomes a normal,
full-width block below 768px. Public pages share a stable 64px masthead and
32px breaking-news strip, with a 96px content offset. Reporter and editor
workspaces use a 64px site header, with editor workspace content reserving
that header height.

Use the existing responsive utilities at 640px, 768px, 1024px, and 1280px.
Page rules also provide mobile-specific media heights, stacking, table
scrolling, compact controls, and navigation visibility.

## Shared class vocabulary

Use lowercase hyphenated names that describe purpose:

- Composition: `flex`, `grid`, `relative`, `absolute`, `sticky`, `page-shell`,
  `reading-column`, `editorial-grid`, `newsroom-sidebar`, `newsroom-content`.
- Surfaces and color: `surface-page`, `surface-paper`, `surface-panel`,
  `surface-ink`, `surface-alert`, `surface-info`, `surface-warning`,
  `surface-success`, `surface-scrim`, `surface-hero-fade`, `surface-glass`,
  `color-primary`, `color-muted`, `color-subtle`, and `color-alert`.
- Media: `media-frame`, `media-hero`, `media-card`, `media-thumbnail`,
  `media-image`, `media-overlay`, `media-caption`, `avatar-*`, and `image-logo`.
- Controls and state: `control-button`, `control-button-secondary`,
  `control-input`, `control-pointer`, `control-disabled`, `state-hidden`,
  `state-muted`, `state-loading`, and `state-spinning`.
- Motion and interaction: `motion-colors`, `motion-shadow`, `motion-transform`,
  `motion-all`, `interaction-zoom`, and `interaction-underline`.

Icons must use `.icon`; icon buttons should retain accessible labels. Existing
script-controlled hooks such as `.filter-btn.active`, `.is-authenticating`,
and `state-hidden` are behavioral contracts and should not be renamed casually.

## Page-family contracts

`pages.css` contains the current parity rules for these surfaces:

- Public article, publication homepage, search results, editorial homepage,
  technology channel, comments, related dispatches, and public footer.
- Reporter article editing, article list/table, autosave, revision ledger,
  status filters, staff login, and runtime feedback.
- Editor analytics/review, queue filters and tables, comparison panes,
  revision feedback, audit timelines, decision sidebars, and telemetry.

Important named tokens include `--article-content-width` (820px), public and
technology media heights, `--workspace-review-max-height` (720px),
`--comparison-media-height` (192px), `--analytics-chart-height` (224px),
reporter thumbnail/status sizes, and the login panel/logo widths.

## Working rules

Reuse tokens from `variables.css`; do not create a second color, type, spacing,
radius, shadow, or breakpoint scale in a page rule. Prefer semantic utilities
and stable structural hooks over arbitrary-value classes. Keep page-specific
selectors in `pages.css`, shared patterns in `components.css`, and composition
in `layouts.css`. Preserve accessible focus states, reduced-motion behavior,
keyboard-friendly controls, readable contrast, and the existing HTML/JavaScript
state hooks when migrating markup.
