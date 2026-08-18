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

# Low-vision audit — matcher and results screens (O14, 2026-08-18)

Audience audited for: a visually impaired elderly reader — the person most likely to be
choosing a GP with someone else's phone in their hand. Method: measured contrast ratios of
every text pair on the matcher/results screens, type sizes against what each element is FOR,
touch targets, focus visibility, and the two platform behaviours (iOS input zoom, sticky
hover) visible in the production screenshot that triggered O13.

## Contrast: passes AA, measured

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#191a17` on paper `#fbfaf7` (body) | 16.75:1 | AAA |
| accent `#8A5A16` on paper (links, distance, closed-books) | 5.66:1 | AA |
| faint `#6b6c67` on paper (count line) | 5.07:1 | AA |
| muted `#6e706a` on paper (row reasons, clarify lead) | 4.80:1 | AA |
| ink on accent-soft `#f7efe3` (clarifier chips) | 15.32:1 | AAA |

No contrast fixes needed; the token discipline (`--faint`'s own comment pins its floor) held.

## The real defect: an inverted size hierarchy

AA contrast at 12px is compliant and still unreadable for this audience — and the 12px text
was exactly the text the screen turns on: the match REASON on each row (the one line that
decides between GPs), the match-quality banner ("this is not a ranking"), and the
closed-books warning. Meanwhile the decorative headline runs at 27px serif. The reader with
the least vision was given the least legibility on the most consequential sentences.

Fixed: row reasons 12→14px, row names 15→16px, count line 12→14px, match-quality banner and
tie note 12→15px in `--muted`, clarify lead 13→14px, clarifier chips 13.5→15px.

## Platform behaviours fixed

- **iOS force-zoom on the suburb field**: any input under 16px makes iOS zoom the whole page
  on focus — disorienting for a reader who has already zoomed where they want. 15→16px.
- **Sticky hover**: after a touch, iOS keeps `:hover` styles until the next tap, so one
  clarifier chip stayed white-with-border and read as a selected state meaning nothing —
  visible in the production screenshot. Hover styles now apply only under
  `@media (hover: hover)`.

## Verified and kept

- Touch targets: clarifier chips `min-height: 44px`; clinician rows ~100px; the suburb field
  46px. All at or above the 44px floor.
- Focus: `:focus-visible` outlines (2px accent) on chips, rows and the field.
- Screen reader: the banner, tie note and count line carry `role="status"`; rows are real
  buttons named by their content; the results heading order is h1-first.
- Minimalism for this audience: fewer, larger elements is the same direction O11 pushed;
  nothing needed removing — the screen's element count was already minimal, only its
  emphasis was upside down.

## Known bound, recorded

Type is sized in px throughout the tree, so browser zoom scales everything but a user's
OS/browser font-size *preference* does not. A rem migration is a tree-wide unit refactor —
out of an audit's scope, filed here so it is a decision rather than a discovery.

final result: passed after fixes; evidence `qa/matching-o10/` (re-rendered)
