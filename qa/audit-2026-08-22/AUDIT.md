# Product-flow audit — finder to booking, 22 August 2026

Viewport: 390 × 844 CSS px, in-app browser, local production-shaped Next.js route.

## Scope and path

1. Finder entry and privacy disclosure — `01-finder-entry-mobile.png`
2. Multi-constraint results — `02-results-mobile.png`
3. Dr Anusha Saxena profile — `03-anusha-profile-mobile.png`
4. Expanded “Why matched” disclosure — `04-profile-why-matched-mobile.png`
5. Side-by-side comparison — `05-compare-mobile.png`
6. Booking handoff — `06-booking-handoff-mobile.png`

Post-fix accepted evidence:

- corrected results, mobile — `07-results-corrected-mobile.jpg`
- corrected profile grouping, mobile — `08-profile-corrected-mobile.jpg`
- corrected missed-ask explanation and tucked-away compare action — `09-why-matched-corrected-mobile.jpg`
- corrected booking handoff, mobile — `10-booking-corrected-mobile.jpg`
- corrected results, desktop — `11-results-corrected-desktop.jpg`

The test request was: “I need a woman GP who speaks Urdu and offers telehealth.” It is adversarial
on purpose: one listed GP matches woman + Urdu, the other Urdu + telehealth, and neither matches all
three. That makes false completeness visible.

## Findings

### 1. Finder entry — needs correction in baseline capture

- P1: the footer said availability was synthetic and all but one profile was invented, which was
  stale after the roster became two real clinicians.
- Fixed: the disclosure now says profiles describe real clinicians and delegates live times and
  directions to the booking destination.

### 2. Results — critical defect in baseline capture

- P0: “These 2 GPs do what you asked for” was false. The compare table showed the roster only
  covered the three asks collectively.
- P1: “Nearest first” overstated geography; distance only breaks complete fit/capacity ties.
- Fixed: per-clinician completeness is computed explicitly, and geo copy states its real tie-break
  role. Constraint count is now the first ordering key.

### 3. Profile — healthy after implementation

- The removed ADHD-training and online-booking pills are not replaced by loose text.
- Highlights are a short, divider-grouped icon-and-text list. Telehealth appears only when verified.
- No map or directions duplicate the booking provider.
- About text is visible; deeper biography, match explanation, access, and credentials use native
  progressive disclosure.

### 4. Why matched / compare entry — healthy

- Comparison remains available but is tucked inside “Why matched”, so it does not compete with the
  primary booking action.
- Missed access and language asks are now named on the individual profile.

### 5. Comparison — healthy

- The table shows every recognised ask with literal declared/not-declared states and names neither
  a winner nor a quality score.
- This screen exposed the P0 results-copy contradiction and is therefore retained as a valuable
  verification surface.

### 6. Booking handoff — healthy

- One external handoff, no fabricated appointment time, no local map or directions, and an explicit
  statement that ADHD.ME does not hold availability.

## Current health

The inspected path is healthy after the fixes at 390 × 844 and 1280 × 900, with no horizontal
overflow in the desktop results check. Residual product risk is concentrated in validation,
not visible layout: the roster is only two clinicians, the language vocabulary is closed, and no
prospective evidence yet establishes patient-reported usefulness or equitable outcomes. The
three-month execution plan in `docs/MATCHING-YEAR-PLAN.md` sets the evaluation and pilot gates.
