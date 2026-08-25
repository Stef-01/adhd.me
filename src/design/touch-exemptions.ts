// AR22: per-element touch-floor exemptions — declared, never inferred.
//
// O14's 44px floor is enforced by the AR10 detector (e2e/support/touch-load.ts), which carries
// three PRINCIPLED CATEGORY exclusions — a link inline in prose (WCAG 2.5.8's own exemption),
// an explicit tabindex="-1", and .sr-only inputs whose affordance lives elsewhere. Those are
// rules about kinds of control. What no mechanism existed for was the taste register's other
// clause: "decorative smaller visuals may render smaller but the hit area meets the floor" —
// and the day a deliberate decorative exception is genuinely needed, the alternative to this
// register is somebody widening a category exclusion to smuggle one element through.
//
// SHIPPED EMPTY, and a test pins the emptiness (the W55/W56/W68 pattern): the register is the
// container for a decision that has not been made. An entry cannot arrive without flipping the
// pin in the same commit, naming ONE element by selector, and writing a rationale a reviewer
// can reject. The detector counts exemptions it applies — a skipped control is never silent.

export type TouchExemption = {
  /** A selector matching exactly the element exempted — never a class shared by many. */
  readonly selector: string;
  /** The route(s) it renders on, so the reviewer can look at it. */
  readonly where: string;
  /** Why THIS element's hit area may sit under 44px — a claim the reviewer can reject. */
  readonly rationale: string;
};

/**
 * EMPTY, deliberately, and pinned so. Every control on every surface today meets the floor at
 * real hit-area (the sweep is green with zero findings), so the first entry here is a design
 * decision that must be argued, not a migration.
 */
export const TOUCH_EXEMPTIONS: readonly TouchExemption[] = [];
