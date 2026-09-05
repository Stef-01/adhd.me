# 2. A close is not an open played backwards

Date: 2026-09-05

## Status

Accepted.

## Context

The house motion vocabulary (`app/globals.css`) named three durations — `--dur-tap` 150ms for
feedback under the finger, `--dur-move` 180ms for a short move it will return from, `--dur-enter`
240ms for something arriving or leaving — and three curves: `--ease-ui` for a press, `--ease-spring`
for an arrival or a release, `--ease-soft` for something large and slow.

Measured against the transitions.dev motion scale (Jakub Antalik), the durations line up almost
exactly: `--dur-tap` is its `--duration-quick`, `--dur-enter` its `--duration-fast` (250ms). One
rung was missing entirely — nothing said how fast a thing **leaves**. `--dur-enter` was documented
as "arriving on screen *or leaving it*", one number for both directions, so every open/close pair
in the tree used one duration both ways because the vocabulary offered no alternative.

That is visible in the app's primary modal idiom. `app/sheet.tsx` opened and closed on the same
spring (stiffness 420, damping 40, mass 0.9). A spring overshoots in both directions, so a dismissed
sheet dipped past the screen edge and came back up a few pixels before settling out of view — the
sheet appearing to hesitate about whether it had really been asked to close — and it took as long
going as coming, so the fastest way to get rid of it was as slow as the decision to open it.

Two other rule violations came out of the same audit. `story-landing.tsx` staggered six children at
80ms, a 480ms cascade: past roughly 300ms the last item arrives after the reader has read the first
and looked away, and the sequence stops reading as one gesture. And the cv2 console carried about a
dozen bare `160ms ease` / `180ms ease` declarations — the browser default curve wearing a number,
which is exactly what the house `--ease-ui` was introduced to remove from the rest of the tree.

## Decision

1. **Add `--dur-exit: 150ms`** — a dismissal, always shorter than the open it undoes.
2. **A close never overshoots.** An entrance may bounce; a close may not, or the thing appears to be
   pulled back before it goes. The sheet's exit is a plain tween on the press curve; the scrim
   leaves on the same beat so the two do not separate on the way out.
3. **Add `--dur-stagger: 40ms`**, with the rule that matters attached: the cap is on the *total*
   (offset × items, under ~300ms), not on the offset.
4. **Match on usage, never on the nearest number.** Tokenising the console's literals was decided
   per declaration by what the motion *does* — a stage arriving takes `--dur-enter` on `--ease-soft`,
   a control acknowledging a press takes `--dur-tap` on `--ease-ui` — not by rounding 160 to 150.
5. **The story page's choreography stays a timeline.** Its 0.62s / 1.9s sequences are not vocabulary
   and were left alone; only its hover values, which are vocabulary, were tokenised, and
   `cubic-bezier(0.16, 1, 0.3, 1)` was replaced by `--ease-soft`, which it already was.

## Consequences

- No bare `<n>ms ease` declarations remain in `app/globals.css`.
- The house scale keeps its own names rather than adopting transitions.dev's. The two agree on
  values where they overlap; renaming would have churned every call site to gain nothing, and the
  house names carry usage ("tap", "move", "enter") where the imported ones carry size.
