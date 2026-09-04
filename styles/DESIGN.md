# The Daily Web CSS Design System

This directory contains the local visual language for The Daily Web. The CSS is intentionally independent from the current HTML during the class-migration phase. HTML class attributes will be updated in a later, separate task.

## File responsibilities

- `style.css`: imports the files in their required cascade order.
- `variables.css`: design tokens only, including color, typography, spacing, geometry, and elevation.
- `base.css`: browser normalization, document defaults, media defaults, form inheritance, focus treatment, and reduced-motion behavior.
- `utilities.css`: small composable classes named by editorial intent.
- `components.css`: recurring controls and visual patterns such as buttons, article copy, icons, status surfaces, and tables.
- `layouts.css`: page composition such as content shells, reading columns, editorial grids, and newsroom navigation.
- `pages.css`: rules that apply only to a page family or structural fallback.

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

## Dark mode tokens

The prototypes declare that a dark mode may be selected, but they do not
currently provide a dark color palette or dark-specific color rules. The
variables file therefore reserves the dark-mode section without inventing
values. When the palette is approved, add dark values there using the same
semantic names as the light palette; dark-mode selectors will be implemented
in a later phase.

The foundational layout names `flex`, `grid`, `relative`, `absolute`, and
`sticky` are intentionally short because they are universal composition
primitives. All scales and visual roles use the project vocabulary described
below. Avoid arbitrary-value names such as `width-[500px]`.

## Token usage

Use the custom properties in `variables.css` for repeated values. Do not introduce a second color, spacing, typography, radius, or shadow scale in a page file. Keep the existing paper, ink, slate, and crimson palette and the Newsreader plus Inter type pairing.

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

## Migration policy

HTML is not changed while CSS names are being designed. The stylesheet contains the canonical local classes only; current HTML may still contain older class names and therefore will not use the new rules until the later HTML migration.

During that later migration:

1. Replace old class names with the closest documented local class.
2. Combine multiple semantic classes when one old utility represented multiple responsibilities.
3. Do not create new property-based names to avoid updating markup.
4. Keep JavaScript state names separate from visual class names unless the state itself is a reusable design-system state.
5. Verify desktop, tablet, and mobile layouts after each page family is migrated.

## Class mapping examples

| Previous style name | Canonical design-system name | Responsibility |
| --- | --- | --- |
| `dw-page-container` | `page-shell` | centered page width |
| `dw-reading-column` | `reading-column` | long-form reading measure |
| `dw-editorial-grid` | `editorial-grid` | responsive editorial grid |
| `dw-newsroom-sidebar` | `newsroom-sidebar` | fixed newsroom navigation |
| `dw-newsroom-content` | `newsroom-content` | workspace content offset |
| `flex` plus alignment classes | `layout-flex` plus alignment class | flex composition |
| `text-headline-lg` | `text-6 text-headline` | editorial headline role |
| `bg-surface-container` | `surface-panel` | panel background |
| `text-secondary` | `color-muted` | supporting metadata |
| `hidden` | `state-hidden` | intentionally hidden content |
| `material-symbols-outlined` | `icon` | project-owned icon alignment |

## Numbered scales

The numeric scales are intentionally small and stable. `text-1` is 12px,
`text-2` is 15px, `text-3` is 17px, `text-4` is 18px, `text-5` is 22px,
`text-6` is 28px, `text-7` is 40px, and `text-8` is 56px. Spacing uses the
same idea: `gap-1` is 4px through `gap-8` at 64px. Use named classes for
meaningful geometry: `width-reading`, `width-content`, `height-feature`, and
`grid-editorial`. Never add arbitrary dimension classes to markup.

## Working rule

Read the file header before editing a stylesheet. Add new rules to the file that owns their responsibility, reuse existing tokens, and add a short section comment when a rule is unusual or depends on a future HTML or JavaScript contract.
