# Calm Clarity — the design system, as authored in Stitch

Verbatim copy of the design system behind [MAP-PRD.md](../../adhd-life/MAP-PRD.md), pulled from
Stitch project `3007208472686763697`, design system `assets/20907de9ca2f4fb49c329bb9e5a182e4`,
on 2026-09-20. Committed so the build does not depend on reaching that API.

Where a value here disagrees with `app/globals.css`, **the tree's token wins** and the mapping
is in MAP-PRD §4. This file is the source, not the contract.

## Theme front matter and full guidelines

```markdown
---
name: Calm Clarity
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#504534'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f0f1f1'
  outline: '#827562'
  outline-variant: '#d4c4ae'
  surface-tint: '#7c5800'
  primary: '#7c5800'
  on-primary: '#ffffff'
  primary-container: '#f5b731'
  on-primary-container: '#684a00'
  inverse-primary: '#fbbc36'
  secondary: '#aa3620'
  on-secondary: '#ffffff'
  secondary-container: '#fe7357'
  on-secondary-container: '#6d0d00'
  tertiary: '#555f6f'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8c2d4'
  on-tertiary-container: '#46505f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdea6'
  primary-fixed-dim: '#fbbc36'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4200'
  secondary-fixed: '#ffdad3'
  secondary-fixed-dim: '#ffb4a5'
  on-secondary-fixed: '#3e0400'
  on-secondary-fixed-variant: '#891e0a'
  tertiary-fixed: '#d9e3f6'
  tertiary-fixed-dim: '#bdc7d9'
  on-tertiary-fixed: '#121c2a'
  on-tertiary-fixed-variant: '#3d4756'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
  header-yellow-deep: '#E5A922'
  radar-fill: rgba(242, 106, 79, 0.58)
  radar-stroke: '#E05338'
  radar-axis-guide: rgba(31, 41, 55, 0.16)
  chip-sage-bg: '#DCFCE7'
  chip-sage-text: '#166534'
  chip-sky-bg: '#E0F2FE'
  chip-sky-text: '#0369A1'
  border-subtle: '#E5E7EB'
  text-primary: '#111827'
  text-secondary: '#4B5563'
  text-muted: '#6B7280'
  surface-card: '#FFFFFF'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  axis-label:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 17px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2.5rem
  margin-mobile: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 3.5rem
---

## Brand & Style

This design system is tailored specifically for neurodivergent individuals navigating ADHD. The primary design objective is radical reduction of cognitive load, elimination of executive-function friction, and emotional validation. 

Rather than adopting a clinical or deficit-based medical model, the interface embodies a warm, grounded, and humanistic visual language. The experience rejects sensory overwhelm: there are no aggressive primary red alerts, no flashing notifications, and no addictive gamification widgets (streaks, badges, confetti, or XP tallies). 

The visual movement blends Warm Humanist Minimalism with Quiet Editorial Design:
- **Calm Warmth**: Grounded by a sunny, welcoming golden-yellow navigation header combined with clean, unblemished warm off-white surfaces.
- **Cognitive Breathing Room**: Expansive, intentional whitespace that separates thoughts, modules, and data points into singular, digestible moments.
- **Affirmative Visualizations**: Inverting traditional medical charts, outward dimensional sprawl signifies stability and ease, framing ADHD characteristics around resilience and environmental fit rather than pathology.

## Colors

The color palette is deliberately calibrated to soothe rather than stimulate:

- **Primary (`#F5B731`) & Header Deep (`#E5A922`)**: A warm, reassuring golden yellow used exclusively in the global header container to establish identity and orientation without visual glare.
- **Secondary Accent (`#F26A4F` / `radar-fill` at 58% opacity & `radar-stroke` `#E05338`)**: A soft coral-terracotta hue reserved strictly for the 6-axis dynamic radar map polygon. It avoids the clinical sterility of cold blue while steering entirely clear of emergency red.
- **Tertiary (`#1F2937`) & Text Primary (`#111827`)**: High-contrast, deeply legible charcoal blacks that provide effortless reading across body and metadata copy, softening the starkness of pure `#000000`.
- **Neutral (`#FAFAFA`) & Surface Card (`#FFFFFF`)**: Pure, un-muddled canvas layers that prevent sensory exhaustion.
- **Validation Accents (`chip-sage-bg`, `chip-sky-bg`)**: Natural, desaturated sage and muted sky tints denote strengths, supported domains, and positive momentum.

### Color Rules
- **No Diagnostic Red**: Emergency red indicators, crimson warnings, and danger alerts are strictly forbidden. Areas requiring support use neutral charcoal or muted borders with clear, empathetic copy.
- **No Traffic-Light Paradigms**: Never group green, amber, and red together to classify human traits.

## Typography

This design system uses **Plus Jakarta Sans** uniformly across headlines, body copy, and labels. Its humanist curves, generous apertures, and balanced geometry provide rapid glyph recognition, directly reducing reading fatigue.

### Typographic Principles
- **Generous Leading**: Line heights are spaced at 1.5x to 1.65x the font size for body prose to avoid visual line-jumping during reading.
- **Concise Headings**: Headlines prioritize conversational warmth (e.g., *"Your ADHD, made clearer"* or *"What stands out"*).
- **Axis Text Limits**: Radar map perimeter axis labels must be capped at 2 lines maximum on mobile devices to prevent layout reflow and visual overcrowding.
- **Linear CTAs**: Interactive text links utilize semantic forward arrows (`→`) set inline with the label to make directional momentum explicit.

## Layout & Spacing

Whitespace functions as an active cognitive shield. Layouts strictly follow a "one focal point per screenful" discipline.

### Viewport Structures
- **Mobile (< 768px)**:
  - Strict vertical single-column flow with `margin-mobile` (24px / 1.5rem) side padding.
  - The radar visualization is constrained to a fixed 300px–340px square viewport.
  - Section stack: Top Nav & Brand Header → Radar Chart → Primary Narrative takeaway ("What stands out") → Maximum 3 Current Focus chips → Strengths list → Exactly 1 Next Useful Step action card.
  - Bottom navigation bar remains pinned to the bottom screen edge with zero occlusion of content.
- **Desktop (≥ 1024px)**:
  - An asymmetric two-column fixed-max layout (maximum width 1140px, centered):
    - **Left Column (55%)**: Fixed-diameter 420px–480px radar chart canvas, centered within its column.
    - **Right Column (45%)**: Structured vertical stack of context modules (Current Focus, Strengths, and Next Step action cards) with `space-xl` separation.

### Spacing Rules
- Never cluster more than 3 attribute chips in a single row or block.
- All tap and interactive boundaries maintain a mandatory minimum touch target of 44px × 44px.

## Elevation & Depth

This system is completely flat. Simulated real-world lighting, skeletal drop shadows, and glassmorphic blurs are prohibited to minimize visual static and keep rendering unencumbered.

### Depth Hierarchy
- **Level 0 (Canvas Base)**: `#FAFAFA` warm off-white background.
- **Level 1 (Surface Cards & Navigation Bar)**: `#FFFFFF` flat background bounded only by a 1px hairline border of `border-subtle` (`#E5E7EB`). No drop shadows.
- **Level 2 (Active Pills & Buttons)**: Solid high-contrast charcoal `#1F2937` or softly tinted chips (`#DCFCE7`, `#E0F2FE`) that rely solely on flat color contrast to denote state.
- **Data Overlay (Radar Map)**: Concentric guide levels are rendered with hairline strokes at 15–20% opacity. The dynamic polygon sits as a flat layer with 55–65% opacity and a solid 1.5px perimeter stroke.
- **Sheets & Modals**: For deeper domain breakdowns or GP summary exports, a flat modal overlay or mobile bottom sheet uses an ultra-clean semi-opaque scrim (`rgba(17, 24, 39, 0.35)`) without blur filters.

## Shapes

The design uses pill-shaped geometries (`border-radius: 9999px`) for interactive items to evoke an approachable, non-intimidating aesthetic:

- **Navigation Items**: Pinned active tabs (e.g., the selected "My ADHD" pill) and secondary pill triggers use full capsule radii (`rounded-full`).
- **Interactive Chips & Tags**: Status indicators, factor tags, and strength markers are styled as full pills with generous horizontal padding.
- **Cards & Enclosures**: Summary containers, next-step cards, and input panels use `rounded-xl` (1.5rem / 24px) to retain soft, friendly perimeters.
- **Radar Nodes**: Data points on the radar map terminate in smooth circular nodes with 4px radii, cleanly anchoring the coral outline.

## Components

### 1. Navigation Header
- Container: Full-width warm golden-yellow (`#F5B731`) background with clean vertical breathing room.
- Tab Pills: Enclosed within a centered capsule track. Active tab is solid charcoal (`#1F2937`) with pure white text and icon; inactive tabs are transparent with dark charcoal typography (`#111827`).
- Action Utilities: Circular or pill-shaped icon triggers (e.g., Settings, Urgent Help) aligned neatly with consistent 44px hit-boxes.

### 2. The 6-Axis Radar Map
- **Axes & Rings**: 6 radial lines originating from the center, circumscribed by 4–5 concentric polygonal guides rendered in `radar-axis-guide` hairline borders.
- **The Polygon**: Filled with `radar-fill` (`rgba(242, 106, 79, 0.58)`) and stroked with `radar-stroke` (`#E05338`). Never apply interior gradients.
- **Axis Confidence States**:
  - Confident: Solid axis line terminating at the scored point.
  - "Still Learning" (data below confidence threshold): The axis spoke renders as a soft dotted line; the dynamic polygon detaches from this node to indicate pending assessment rather than low competence.
- **Axis Labels**: Placed around the perimeter using `axis-label` typography in charcoal `#1F2937`.

### 3. Pill Chips
- **Strength Chips ("Working for you")**: Soft sage background (`#DCFCE7`) with deep green typography (`#166534`), or muted sky background (`#E0F2FE`) with deep blue typography (`#0369A1`).
- **Focus / Support Chips ("Current focus")**: Crisp white background with a 1px `#E5E7EB` border, or soft neutral grey fill (`#F3F4F6`).
- Layout: Inline flex, auto-wrapping, limited strictly to 3 visible items to prevent choice paralysis.

### 4. Action Cards ("Next Useful Step")
- Structure: Exactly one primary actionable suggestion card presented at a time.
- Styling: Flat `#FFFFFF` surface, 1px `#E5E7EB` border, 24px internal padding, `rounded-xl`.
- Content: Bold headline, brief 1-line contextual explanation, duration badge (e.g., `"3 min read"`), and a primary text link button with trailing forward arrow (`→`).

### 5. Buttons & Interactive Links
- **Primary Action**: Solid charcoal fill (`#1F2937`), white text, full pill radius, minimum height 48px, horizontal padding 24px.
- **Secondary / Inline Action**: Typographic button in `text-primary` with right arrow (`→`), bold weight, zero background, 44px hit-box padding.
- **State Feedback**: Simple opacity shift (`opacity: 0.8`) on press. Zero scale bounces, confetti, or gamified animations.

### 6. Form Fields & Inputs
- Flat `#FFFFFF` surface with 1px `#E5E7EB` border and `rounded-lg` (1rem) curvature.
- Focus state: Replaces border with a crisp 1.5px `#1F2937` stroke. No glowing neon drop shadows.```
