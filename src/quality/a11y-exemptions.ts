// AR33: the a11y sweep completed to WCAG 2.2 AA, "every exemption named and dated" — the
// AUDIT_ALLOWLIST shape (W53) applied to axe findings instead of dependency advisories. Today's
// scan (all 47 routes, wcag2a+wcag2aa+wcag21a+wcag21aa+wcag22aa) is genuinely clean, so this
// register starts empty — but empty is not the same as absent. Without this module the only way
// to make a future finding disappear is to delete the assertion or drop the tag, which is exactly
// the "silence a finding by not looking" this lane exists to prevent (its own central law: a
// sweep that cannot be made to go red is vacuous). With it, a future violation either gets fixed
// or gets a named, dated, reviewable reason here — never a silent pass.

/** One accepted axe finding: which rule, on which scanned surface, and why. */
export interface A11yExemption {
  /** axe's rule id, e.g. "target-size". */
  ruleId: string;
  /** The label `e2e/a11y.spec.ts` scans this surface under — a route path for most tests, a
   * descriptive state label for the dynamic ones ("booking confirmation page"). */
  surface: string;
  /** Why this finding is accepted rather than fixed. Long enough to argue the case, not just name it. */
  reason: string;
  /** ISO date (YYYY-MM-DD): when this exemption should be re-examined, not left standing forever. */
  reviewBy: string;
}

/** Deliberately empty — the day this shipped, the WCAG 2.2 AA scan found nothing to exempt. */
export const A11Y_EXEMPTIONS: readonly A11yExemption[] = [];

/** Pinned exactly, the AR-lane's own census law: a silent add or drop must move this number. */
export const A11Y_EXEMPTION_COUNT = 0;

/** The minimum an axe report actually carries — kept narrow so this module has no dependency on axe-core's types. */
export interface AxeViolationLike {
  id: string;
  nodes: readonly unknown[];
}

export interface A11yFilterResult {
  /** Violations no exemption covers — real findings, must fail the test. */
  unexempted: AxeViolationLike[];
  /** Exemptions scoped to this surface that matched no violation this run — stale, remove them. */
  unusedExemptions: A11yExemption[];
}

/**
 * Both directions, this lane's standing shape: a violation with no matching exemption stays a
 * failure, and an exemption that matched nothing this run is itself reported — an exemption is a
 * claim about a REAL, currently-present finding, and one that stops matching is a stale claim,
 * not a quietly-earned pass.
 */
export function filterExemptViolations(
  surface: string,
  violations: readonly AxeViolationLike[],
  exemptions: readonly A11yExemption[] = A11Y_EXEMPTIONS,
): A11yFilterResult {
  const applicable = exemptions.filter((e) => e.surface === surface);
  const usedRuleIds = new Set<string>();

  const unexempted = violations.filter((v) => {
    const match = applicable.find((e) => e.ruleId === v.id);
    if (!match) return true;
    usedRuleIds.add(match.ruleId);
    return false;
  });

  const unusedExemptions = applicable.filter((e) => !usedRuleIds.has(e.ruleId));
  return { unexempted, unusedExemptions };
}
