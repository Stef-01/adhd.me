---
name: ADHD.ME
description: A calm Australian care finder with an Aurora night world for patients and a warm yellow identity for public and operational surfaces.
colors:
  patient-night: "#07151D"
  patient-ground: "#061017"
  patient-surface: "rgb(7 21 29 / 0.68)"
  patient-text: "#F5FBFC"
  patient-muted: "#C0D1D6"
  aurora-mint: "#A8E6CF"
  aurora-cyan: "#88D4D6"
  aurora-peach: "#FFD6BA"
  aurora-purple: "#C4B5FD"
  brand-yellow: "#F1BC31"
  public-paper: "#FAFAF7"
  public-ink: "#1A1C1C"
  signal: "#FB7185"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.375rem, 5vw, 4rem)"
    fontWeight: 430
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.02em"
rounded:
  control: "8px"
  card: "12px"
  glass: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  patient-primary-button:
    backgroundColor: "{colors.aurora-mint}"
    textColor: "{colors.patient-night}"
    typography: "{typography.label}"
    rounded: "{rounded.card}"
    padding: "12px 18px"
    height: "44px"
  patient-glass-input:
    backgroundColor: "{colors.patient-surface}"
    textColor: "{colors.patient-text}"
    typography: "{typography.body}"
    rounded: "{rounded.glass}"
    padding: "16px"
  patient-mode-pill:
    backgroundColor: "{colors.patient-surface}"
    textColor: "{colors.patient-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px"
    height: "52px"
  public-primary-button:
    backgroundColor: "{colors.public-ink}"
    textColor: "{colors.public-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
    height: "44px"
---

# Design System: ADHD.ME

## Overview

**Creative North Star: "The Living Night Guide"**

ADHD.ME has two related visual environments. Patient routes are a quiet, living night sky: blue-black ground, photographic stars, independently moving cyan, mint, peach and purple light, pale serif questions, and dark translucent controls. The environment should feel present and responsive without asking for attention; the voice wisp is the one expressive focal point.

Public and practice-console routes retain the warm platform identity: paper and stone workspaces, a saturated yellow header, charcoal actions and restrained density. Immersive learning games are deliberately isolated visual worlds. Shared typography, direct Australian English, explicit focus and the small ADHD.ME mark keep the environments recognisably related.

**Key Characteristics:**

- Voice-first patient entry with a typed path always visible.
- Living atmospheric depth behind a sparse, high-contrast task layer.
- Warm yellow identity preserved outside the patient app.
- Minimal controls, plain language and one consequential decision at a time.
- Motion, transparency and touch behavior designed for access under cognitive load.

## Colors

The patient palette is cool and nocturnal; the public palette is warm and editorial. Never blend both grounds on one surface.

### Primary

- **Aurora Mint:** The patient action color, active navigation signal and brightest inner light.
- **Brand Yellow:** The public and console header, browser chrome and selected warm navigation cue.

### Secondary

- **Aurora Cyan:** The cool light curtain, focus support and secondary luminous edge.
- **Aurora Peach:** A low-frequency warmth in the patient atmosphere, never a solid call-to-action fill.
- **Aurora Purple:** A restrained spectral edge around the wisp and night sky.

### Neutral

- **Patient Night / Ground:** The patient canvas and its deepest falloff.
- **Patient Surface:** Translucent controls and cards over the moving sky.
- **Patient Text / Muted:** High-contrast task copy and subordinate labels.
- **Public Paper / Ink:** The warm workspace and its primary copy and actions.
- **Signal:** Urgent-help dot and other small high-importance signals only.

### Named Rules

**The Two Grounds Rule.** Aurora night belongs to patient routes; warm paper and yellow belong to public and operational routes.

**The Rare Warmth Rule.** Peach and yellow are controlled identity or atmospheric signals, not extra competing actions inside the night world.

## Typography

**Display Font:** Newsreader (with Georgia and serif fallbacks)<br>
**Body Font:** Plus Jakarta Sans (with system-ui and sans-serif fallbacks)

**Character:** Newsreader makes patient questions feel human and considered. Plus Jakarta Sans keeps controls, explanations and operational data compact and unambiguous.

### Hierarchy

- **Display** (430, fluid 38–64px, 1.08): One patient question or a significant quoted voice; avoid stacked promotional headlines.
- **Headline** (600, responsive): Public and workspace headings with restrained weight.
- **Title** (600, 18–24px): Card and section names.
- **Body** (400, 16px, 1.55): Instructions and explanatory copy; keep measures short under cognitive load.
- **Label** (650, 13px, 0.02em): Controls, navigation and compact statuses; sentence case unless the wordmark requires tracking.

### Named Rules

**The One Question Rule.** A patient first viewport leads with one serif question; interface labels remain sans serif.

## Layout

Patient routes use a full-bleed atmospheric ground with a sticky translucent header, a narrow central task column and a floating mobile dock. The welcome screen maintains one clear vertical sequence: question, voice wisp, compact typed fallback, matching mode and navigation. Desktop navigation sits within the header; mobile navigation floats 12–20px from the viewport edges and accounts for safe areas and consent height.

Every touch target is at least 44px. Content scrolls naturally; fixed actions reserve their space. The primary mobile breakpoint is 768px, with 390px refinements for small phones. Patient screens may widen their content where scanning requires it, but the first action remains visually centered and calm.

Public and console layouts remain warm, bounded workspaces. Learn uses its established 1080px browsing width. A clinician profile behaves as a pushed mobile screen with its own booking bar. Immersive games marked with `[data-liquid]` opt out of the Aurora shell completely.

## Elevation & Depth

Patient depth comes from tonal layering, blur and light rather than stacked white cards. Dark glass surfaces use a faint inner highlight, a soft ambient shadow and enough opacity to keep text stable over the sky. The sky combines a local licensed photograph with three procedural light curtains, a low horizon bloom, sparse stars and static grain. Curtains move on different long cycles so the environment does not expose a single mechanical loop.

Interactive transitions remain fast and quiet. Ambient sky and wisp motion is continuous by explicit product direction, uses composited transform, opacity and filter animation, pauses from Settings, and becomes a composed static frame under `prefers-reduced-motion`. Reduced-transparency replaces glass with opaque patient night and removes grain.

### Shadow Vocabulary

- **Ambient Patient:** A broad low-opacity black shadow that separates glass without hard outlines.
- **Luminous Edge:** Cyan or mint light used only on the wisp, active navigation and primary focus.
- **Warm Structural:** The incumbent restrained public shadow; public cards remain mostly flat.

### Named Rules

**The Still Task Rule.** The atmosphere can live; reading surfaces and controls do not drift, pulse or compete with the task.

## Shapes

Patient glass uses gently curved 12–18px corners. Search, mode and mobile-navigation containers become full pills where their single-row geometry supports it. The wisp alone uses asymmetric organic contours. Public controls retain the tighter 8px radius, cards use 12px, and learning artwork keeps its own silhouette language.

Borders are translucent and quiet in the night world. Focus rings remain explicit. Do not round every section into a card; large reading areas stay open against the ground.

## Components

### Voice Wisp

The signature patient action is a large labelled button, not decoration. It contains layered refracted color, an optically centered microphone, a broad glow and three independently drifting particles. Its accessible name is "Talk instead of typing" and its visible instruction is "Tap to speak".

### Buttons

- **Patient Primary:** Mint fill, patient-night text, 12px radius and at least 44px height.
- **Public Primary:** Charcoal fill, paper text and 8px radius.
- **Hover / Focus:** Quiet border or luminance change; strong visible focus; short custom easing.
- **Press:** Immediate subtle scale feedback only where it does not conflict with the ambient wisp transform.

### Chips

Patient chips are dark translucent pills with a cyan-tinted edge. Selected state adds mint tint, brighter text and a small inner highlight. Example searches scroll horizontally on phones rather than wrapping into a dense block.

### Cards / Containers

Patient cards use translucent night surfaces, 12–18px radii and tonal separation. Results remain rows where comparison speed matters. Public and console cards use paper/stone and restrained borders. Learning covers may mix their own cover color into the night surface, but do not become generic glass tiles.

### Inputs / Fields

The AI composer is a single-line pill beneath the voice action; Standard mode restores the sentence-sized composer and examples. Both use a dark glass surface, white text, a mint circular action and an explicit focus edge. Voice and typed submissions converge on the same matching path.

### Navigation

Desktop patient navigation is a compact pill in the sticky header. Mobile navigation is a floating three-destination dock with icon and label, a minimum 58px tab target, filled active icon, tint and `aria-current`. Public and console navigation keeps the yellow brand field.

### Settings

Settings is a centered panel on desktop and bottom sheet on mobile. Aurora motion is on by default and can be paused from a labelled settings row; the choice persists on device. Data export, restore and deletion remain in the same sheet.

### Ownership

- `app/styles/aurora.css`: patient palette, sky, wisp, glass and patient-specific responsive behavior.
- `app/(app)/layout.tsx`: patient atmosphere structure and patient-only browser theme.
- `app/finder-stages/welcome-stage.tsx`: voice-first AI and full Standard entry modes.
- `app/styles/platform.css` and `app/styles/finder.css`: shared shell geometry and finder structure.
- `app/styles/platform-surfaces.css` and `app/styles/brand.css`: warm public and operational primitives.
- `app/styles/glass.css`: liquid glass inside `[data-liquid]` games only.

## Do's and Don'ts

### Do:

- **Do** let the patient sky move slowly behind a still, readable task layer.
- **Do** keep voice dominant while leaving typed input immediately available.
- **Do** preserve 44px minimum targets, visible focus, reduced-motion and reduced-transparency paths.
- **Do** keep the yellow header and warm paper identity on public and console routes.
- **Do** attach provenance to every shipping photographic or generated raster.
- **Do** use one decisive action and short plain-language copy per patient step.

### Don't:

- **Don't** apply Aurora glass to public pages, practice console screens or `[data-liquid]` games.
- **Don't** hide typed matching behind a mode, menu or secondary screen.
- **Don't** animate reading surfaces, navigation labels or high-frequency task controls continuously.
- **Don't** replace the sky with an unstable remote hot-link or an unlicensed image.
- **Don't** reintroduce a dense directory grid, ratings, unsupported clinical claims or manufactured confidence.
- **Don't** flatten the original yellow brand into teal everywhere; the separation of worlds is intentional.
