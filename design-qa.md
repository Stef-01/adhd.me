# Main introduction reference design QA

> **PRE-FORK RECORD.** This documents the landing page of the Meherr product, before this tree was
> reoriented to ADHD assessment. The hero, the PMOS/PCOS naming and the "South Asian women"
> positioning it evaluates were all replaced — see `app/story-landing.tsx`. Kept because the
> typography and hierarchy reasoning still applies to the page that replaced it.

## Evidence

- Source visual truth: `/Users/devasiathottunkal/Desktop/web design/IMG_5251.PNG` and `/Users/devasiathottunkal/Desktop/web design/IMG_5252.PNG`.
- Source pixel dimensions: 2796 × 1290 each. The references include a tablet frame; the app-owned areas were evaluated for hierarchy, type pairing, restraint and negative space rather than copied as device chrome.
- Desktop hero implementation: `qa/main-intro-desktop-final.png`.
- Desktop statement implementation: `qa/main-intro-desktop-statement.png`.
- Mobile hero implementation: `qa/main-intro-mobile-final.png`.
- Mobile registration implementation: `qa/main-intro-mobile-register.png`.
- Desktop viewport: 1440 × 900 CSS px at 1× screenshot density.
- Mobile viewport: 390 × 844 CSS px at 1× screenshot density.
- State: main introduction at rest; registration CTA followed to the form.
- Full-view comparison evidence: the source hero and `qa/main-intro-desktop-final.png` were opened together; the source editorial content view and `qa/main-intro-desktop-statement.png` were opened together.
- Focused region evidence: `qa/main-intro-mobile-final.png` checks hero wrapping and `qa/main-intro-mobile-register.png` checks form density and the primary conversion path.
- Density normalization: the browser captures match their CSS viewport at DPR 1. The 2796 × 1290 reference images were viewed fitted to the same comparison surface because their outer tablet frame is reference context, not implementation content.

## Findings

No actionable P0, P1 or P2 differences remain.

- Fonts and typography: the implementation now follows the references' restrained sans-serif display type with a serif italic accent. The hero is seven words, wraps deliberately and leaves PMOS/PCOS naming to the supporting sentence.
- Spacing and layout rhythm: the main page uses a quiet masthead, one large statement per section, asymmetric alignment and generous negative space. Desktop and mobile captures show no clipping or horizontal overflow.
- Colors and visual tokens: warm paper, near-black olive and muted sage replace decorative UI surfaces. Text contrast is clear in the checked light and dark sections.
- Image quality and asset fidelity: no generic stock or generated photograph was added. This is intentional: the request was to transfer the references' formatting, while generic health imagery would make the early community venture feel less credible. No reference image was replaced with CSS art or a placeholder.
- Copy and content: the parenthetical “formerly PCOS” has been removed from the headline. The new visible hierarchy is promise first, plain-language naming second, then only the facts required to understand the model.
- Interaction and accessibility: the registration CTA scrolls to the real form, the form remains keyboard- and label-accessible, the early demo route remains available, and the synthetic-profile disclosure is visible before the hero.
- Browser console: no warnings or errors were present during the checked path.

## Comparison history

### Pass 1

- P1: the original introduction used a long medical sentence as the hero, including a parenthetical rename, so the core promise was difficult to scan.
- P2: the first revised desktop hero aligned both text groups to the bottom, leaving unearned empty space above the promise.

Fixes made:

- Replaced the hero with “Helping South Asian women find answers earlier.”
- Moved PCOS naming into one supporting sentence: “PMOS — the condition long known as PCOS”.
- Anchored the main statement to the upper part of the hero while retaining the low, quiet registration action from the reference composition.
- Reduced every following section to one statement, one short supporting thought and only the minimum useful detail.

Post-fix evidence:

- `qa/main-intro-desktop-final.png`
- `qa/main-intro-desktop-statement.png`
- `qa/main-intro-mobile-final.png`
- `qa/main-intro-mobile-register.png`

## Follow-up polish

- P3: owned community-session photography could later replace some negative space, but only once authentic imagery exists; it should not be simulated for this early-stage page.

## Final result

final result: passed

# Minimalism review — matching surfaces (O11, 2026-08-18)

Scope: every UI the matching pipeline renders through — the finder's results, clarifier,
profile and listening screens (`app/care-finder.tsx`) and the console's matching audit
(`app/console/matching/page.tsx`). Reviewed against the screenshots in `qa/matching-o10/`.

## Verdict

The surfaces are already spare: one field, one dual-function control, one count line, one
quality banner that only renders when it has something to add, rows that carry exactly one
distinguishing reason each. The earlier collapse (eleven screens to seven) is holding. One
real defect and no removable elements were found.

## The defect, fixed

- **The count line claimed a ranking beside the banner denying one.** On an unmatched query
  the screen read "2 of 2, ranked on what you asked for." two lines above "this is everyone
  we list rather than an order." — two sentences about the same fact, one false. The count
  line now claims "ranked on what you asked for" only when `matchQuality` is `informed`;
  otherwise the count stands alone and the quality banner owns the explanation. (The
  nearest-first variant is exempt: since O3, an unmatched query with an origin genuinely IS
  distance-sorted, so that sentence is true in every quality state.)

## Reviewed and kept, with reasons

- **Quality banner + clarifier block stacking** (unmatched state shows both): not
  duplication — the banner says what happened, the questions are the way out. Removing
  either orphans the other.
- **Top-tie note (O3)**: renders only when `informed` with a tied first band, which the
  quality banner cannot say; never stacks with it.
- **Closed-books line (O4)**: one sentence, only on affected rows, only claiming fit when
  fit exists (Codex P2 fix).
- **Profile**: eyebrow flips between "Why this fit" / "About this GP" on evidence; signal
  pills deduplicate against the row reasons; no repeated sentence found.
- **Console audit table**: the O2 "Declares" column and O8 "books closed" tag each add one
  cell of operator-facing fact; the table remains the only place scores render.

## Evidence

`qa/matching-o10/*.png` (before), refreshed after the count-line fix by re-running
`e2e/matching-verification.spec.ts`.

final result: passed, one fix applied
