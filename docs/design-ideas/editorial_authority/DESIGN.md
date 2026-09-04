---
name: Editorial Authority
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#410002'
  on-tertiary-container: '#f63a35'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb4ab'
  on-tertiary-fixed: '#410002'
  on-tertiary-fixed-variant: '#93000b'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 56px
    fontWeight: '600'
    lineHeight: 64px
    letterSpacing: -0.025em
  display-hero-mobile:
    fontFamily: Newsreader
    fontSize: 38px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 28px
    fontWeight: '500'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lead:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 32px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
  caption:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  space-xxs: 0.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-2xl: 3rem
  space-3xl: 4rem
  gutter-mobile: 1rem
  gutter-desktop: 1.5rem
  column-gap: 2rem
  max-content-width: 1280px
  reading-column-width: 680px
---

## Brand & Style

This design system delivers the gravitas, rigor, and institutional clarity of traditional broadsheet journalism combined with the speed and utility of a modern digital publishing platform. Designed for high-frequency news environments, investigative reporting, and high-stakes editorial workflows, the interface balances reader absorption with production efficiency.

The visual style is **Contemporary Editorial Broadsheet**—a hybrid of classical editorial composition and architectural minimalism. It emphasizes typographic hierarchy, hairline structural rules, deliberate white space, and purposeful chromatic restraint. The atmosphere evokes crisp archival paper, dark typographic ink, and surgical editorial curation. Sensationalism is rejected in favor of measured authority, clarity under pressure, and unflinching legibility across long-form investigations, live dispatches, and real-time CMS operations.

## Colors

The color architecture is built around the tactile metaphor of newsprint and heavy printer's ink, energized by a singular signal color for urgent transmission:

- **Primary (`#0f172a` - Deep Ink Navy):** The core structural pigment. Used for headlines, key interactive elements, high-emphasis text, structural borders, and the editorial masthead. It brings warmth and depth that pure black cannot match.
- **Secondary (`#475569` - Slate Blue):** The supportive editorial voice. Deployed for bylines, metadata, datelines, timestamps, article summaries, section markers, and secondary interface controls.
- **Tertiary (`#dc2626` - Crimson Flash):** The urgent dispatch accent. Reserved exclusively for high-stakes signals: "BREAKING" banners, live audio/video indicator pulses, critical updates, live-ticker badges, and CMS rejection/destructive actions.
- **Neutral (`#f8fafc` - Crisp Paper White):** The backdrop canvas. Paired with pure white (`#ffffff`) for elevated panels, card surfaces, and reading containers to mimic deliberate broadsheet columns under daylight.

### Semantic Tones & Editorial Categorization
- **Editorial Section Tags:**
  - *Politics & Opinion:* `#1e293b` (Deep Slate)
  - *Business & Markets:* `#0369a1` (Market Navy)
  - *Technology & Science:* `#0f766e` (Teal Spec)
  - *Culture & Arts:* `#7e22ce` (Rich Royal Purple)
- **CMS Workflow States:**
  - *Draft / Idle:* `#64748b` (Neutral Slate)
  - *In Review:* `#b45309` (Amber)
  - *Scheduled / Staged:* `#15803d` (Field Green)
  - *Published / Live:* `#0f172a` with tertiary crimson beacon

## Typography

The typographic system hinges on the deliberate dialectic between **Newsreader** (the literary voice of observation, legacy, and narrative depth) and **Inter** (the utilitarian engine of speed, accuracy, and operational interface).

- **Headlines & Narrative Displays:** Set in Newsreader with optical sizing characteristics. Headlines above 28px feature subtle negative tracking to mimic tight traditional phototypesetting. In CMS environments, editorial leads and pull quotes preserve Newsreader italic styling for narrative gravitas.
- **Body & Long-Form Reading:** Set in Inter at 17px/28px line-height for web reading contexts, preserving a maximum measure of 65–75 characters per line to eliminate reader fatigue.
- **Labels, Badges, & Datelines:** Inter caps tokens (`label-caps`) are rendered in uppercase with wide tracking (`0.08em`) to guarantee immediate visual classification of categories, timestamps, and live status flags even at small scales.

## Layout & Spacing

The layout is grounded in a rigid **12-column editorial grid** that adapts dynamically across viewing modes, referencing broadsheet multi-column vertical rules:

- **Desktop (1280px+):** 12 columns with 24px gutters and 32px outer margins. The page organizes into primary narrative spans:
  - *Lead Package:* 8-column primary story with 4-column secondary analysis sidebar.
  - *Triple Ticker:* 4 + 4 + 4 balanced section blocks.
  - *Long-form Article View:* 680px centered reading well (occupying 7 columns) bordered by contextual sidebars for live updates and citations.
- **Tablet (768px – 1024px):** 8 columns with 20px gutters and 24px margins. Sub-stories fold into stacked 4-column cards.
- **Mobile (< 768px):** 4 columns with 16px gutters and 16px margins. Headlines scale down, multi-column divisions collapse into linear chronological ribbons separated by 1px hairline rules.
- **CMS Workspace:** 280px fixed structural navigator, fluid multi-column workspace, and 340px collapsible metadata and publishing telemetry panel.

## Elevation & Depth

This design system avoids heavy shadows and skeuomorphic blur stacks, maintaining the structural clarity of printed ink and physical layout sheets:

- **Flat Architectural Planar Layering:** Surfaces exist on distinct paper tiers:
  - `Base Canvas`: `#f8fafc` (Paper neutral).
  - `Card / Surface Container`: `#ffffff` (Crisp newsprint surface).
  - `High-Priority Banner`: `#0f172a` (Inverted deep ink).
- **Hairline Structural Rules (Primary Separation Engine):** Depth and hierarchy are established via 1px crisp borders (`#e2e8f0` in secondary resting state, `#0f172a` for primary editorial section headers and active dividing rules) instead of drop shadows.
- **Ambient Focus Lift:** Drop shadows are strictly reserved for hovering floating action items, CMS modal drawers, and dropdown utility menus:
  - `shadow-menu`: `0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)`
  - `shadow-modal`: `0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 8px -2px rgba(15, 23, 42, 0.04)`
- **Rule Lines:** Column dividers use 1px vertical borders to isolate adjacent articles while maintaining unified baseline alignment.

## Shapes

The geometry reflects structural discipline and print precision. Roundedness is kept at level `1` (Soft, 0.25rem / 4px base radius) to maintain clean corners and architectural structure without feeling aggressive:

- **Articles, Media Containers, & Content Wells:** Absolute sharp corners (`0px`) for photography and video embeds, paying homage to edge-to-edge print cuts.
- **Interactive UI (Buttons, Inputs, CMS Controls):** 4px border radius (`rounded-sm`), delivering a subtle softening that signals clickability while maintaining crisp alignment with hairpins and borders.
- **Badges & Meta Status Pills:** 2px border radius or strict 0px chamfer for badges, avoiding soft bubble aesthetics.

## Components

### Buttons
- **Primary Editorial Button:** Deep Ink Navy (`#0f172a`) background, white text, 4px radius. Hover shifts to `#1e293b` with subtle transition. Active state scales down 0.99.
- **Urgent / Breaking Action:** Crimson Accent (`#dc2626`) fill, white text. Reserved for live news subscription actions, urgent corrections, and CMS emergency pull commands.
- **Secondary / Ghost Button:** Transparent background, 1px `#cbd5e1` outline, `#0f172a` text. Hover fills with `#f1f5f9`.
- **Tertiary Link:** Underlined serif link or bold sans-serif with right arrow glyph (`→`), 0px offset.

### Badges & Section Pills
- **LIVE Beacon:** Crimson `#dc2626` background, crisp white uppercase text (`label-caps`), accompanied by an animated 6px white/red pulsing dot.
- **Breaking News Badge:** High-contrast crimson outline (1.5px `#dc2626`) or solid crimson fill, paired with tight tracking.
- **Section Badges (Tech, Politics, Business, Culture):** Compact 20px height, uppercase tracking (`0.08em`), neutral tinted background (`#f1f5f9`), slate border, `#0f172a` text.

### News & Editorial Cards
- **Lead Hero Card:** Asymmetrical layout. High-impact serif headline (`display-hero` or `headline-xl`), prominent kicker badge, italic lead summary, byline with dateline in slate blue, sharp 0px media enclosure.
- **Columnist / Opinion Card:** Centered serif headline, author portrait in circular mask with a 1px ink frame, prominent byline, and quotation styling.
- **Compact Wire Ticker Card:** Minimalist 1px bottom border, timestamp in Slate Blue (`#475569`), followed by crisp Inter bold headline. No card background; relies entirely on vertical rhythm.

### Editorial Inputs & Form Elements
- **Input Fields (CMS & Search):** Crisp 1px `#cbd5e1` border on `#ffffff`, 4px radius. Focus transition removes default glow, replacing with a sharp 1.5px `#0f172a` border and 2px offset ring in `#f8fafc`.
- **Checkboxes & Radios:** Sharp square and circular indicators with ink navy fills and clean white iconography.

### CMS Publishing Telemetry & Workflow States
- **Status Chips:** Rectangular indicators with subtle border:
  - *Draft:* Slate grey dotted outline.
  - *In Review:* Amber filled badge with contrasting dark text.
  - *Published:* Solid navy flag with timestamp.
- **Diff & Revision Viewer:** Dual-column split interface using `#fef2f2` for removals (struck-through) and `#f0fdf4` for editorial additions.