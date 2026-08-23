// AR6: e2e/support/measured.ts — one non-vacuity harness, replacing per-spec floors
// (docs/AESTHETIC-REVIEW-PLAN.md AR6, Phase 2: "a check that cannot fail is not a check").
//
// Every route/control/text sweep in this suite has, up to now, hand-rolled the same three lines:
// accumulate a population count while it walks, `console.log` it under a name nobody else reads,
// then assert it against a hardcoded floor so a selector that stopped matching (O168, O170, O171,
// O174) cannot pass by measuring nothing. The declaring-and-reporting half of that pattern is
// identical everywhere it appears (touch-floor, contrast, semantics, keyboard-focus, finder-flow);
// this is the one place it is written, so a new sweep gets it by calling `measured()` instead of
// inventing its own console.log line.
//
// The FLOOR VALUE itself — what count is "collapsed" for a given sweep — is deliberately not this
// module's job: AR7 derives those from the route list at run time instead of transcribing them, and
// folding that logic in here would make this harness reproduce the exact staleness it exists to
// fix. `measured()` only refuses the one thing no hand-picked floor should ever have to catch on
// its own: zero.

export interface Measurement {
  readonly label: string;
  readonly count: number;
}

export class NonVacuityError extends Error {
  constructor(label: string, count: number) {
    super(`measured("${label}") counted ${count} — a sweep that touches nothing must not pass`);
    this.name = "NonVacuityError";
  }
}

/**
 * Declares what a sweep measured. Throws `NonVacuityError` when `count` is not a positive finite
 * number — the one floor every sweep needs and none should have to write by hand — otherwise
 * reports the number (visible in the Playwright run log, prefixed so it can be grepped across
 * specs) and returns it.
 */
export function measured(label: string, count: number): Measurement {
  if (!Number.isFinite(count) || count <= 0) {
    throw new NonVacuityError(label, count);
  }
  // eslint-disable-next-line no-console -- the whole point is a grep-able, human-visible report.
  console.log(`MEASURED ${label}: ${count}`);
  return { label, count };
}
