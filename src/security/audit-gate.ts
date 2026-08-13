// W53: dependency-advisory gate (W51 finding A2 — `pnpm audit` had never been run).
//
// The evaluation is a pure function over a parsed `pnpm audit --json` report so the
// gate's own behaviour is unit-testable without a network round trip: the unit's
// verification ("fails on a seeded new advisory, passes with the current allowlist")
// is an assertion in audit-gate.test.ts, not a manual observation.
//
// Posture is fail-closed throughout: an advisory we cannot classify blocks, an
// allowlist entry we cannot parse blocks, and an expired acceptance blocks. A gate
// that degrades to "pass" under uncertainty is not a gate.

export const SEVERITY_ORDER = ["info", "low", "moderate", "high", "critical"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

/** Advisories at or above this severity must be fixed or explicitly accepted. */
export const DEFAULT_THRESHOLD: Severity = "moderate";

/** The subset of pnpm's advisory shape this gate depends on. */
export interface AuditAdvisory {
  readonly github_advisory_id: string;
  readonly module_name: string;
  readonly severity: string;
  readonly title: string;
  readonly url: string;
  /** pnpm reports `<0.0.0` when no patched release exists. */
  readonly patched_versions: string;
  readonly findings: readonly { readonly paths: readonly string[] }[];
}

export interface AuditReport {
  readonly advisories: Readonly<Record<string, AuditAdvisory>>;
}

/**
 * An accepted-risk advisory. Every field is required, so the compiler — not a
 * reviewer's diligence — is what guarantees each acceptance carries a rationale
 * and a review date.
 */
/**
 * W107: one recorded re-review of an acceptance.
 *
 * `reviewBy` alone made an acceptance expire, but nothing stopped the date being pushed
 * forward on its own — the cheapest possible response to a failing gate, and indistinguishable
 * in a diff from an acceptance that was genuinely re-argued. `extendedTo` closes that: the
 * evaluator requires `reviewBy` to equal the newest review's `extendedTo`, so moving the
 * deadline without writing down what you checked leaves the two out of step and the acceptance
 * stops working.
 */
export interface AllowlistReview {
  /** YYYY-MM-DD the review was carried out. */
  readonly on: string;
  /** Who or what carried it out — a unit id is fine, "someone" is not. */
  readonly by: string;
  /** What was checked and what was concluded. Not a restatement of `reason`. */
  readonly finding: string;
  /** The `reviewBy` this review set. Unchanged when a review extends nothing. */
  readonly extendedTo: string;
}

export interface AllowlistEntry {
  /** GitHub advisory id (GHSA-…). Stable, unlike pnpm's numeric registry id. */
  readonly advisory: string;
  /** Must match the advisory's package, so an entry cannot drift onto another one. */
  readonly module: string;
  /** Why this exposure is accepted rather than fixed. */
  readonly reason: string;
  /** YYYY-MM-DD (inclusive). Past this date the acceptance stops working. */
  readonly reviewBy: string;
  /**
   * Every review of this acceptance, oldest first. The tuple type requires at least one, so
   * an acceptance cannot exist without someone having looked at it once.
   */
  readonly reviews: readonly [AllowlistReview, ...AllowlistReview[]];
}

export type BlockReason =
  | "not_allowlisted"
  | "acceptance_expired"
  | "module_mismatch"
  | "unparseable_review_date"
  | "review_date_unexplained"
  | "unknown_severity";

export interface BlockingAdvisory {
  readonly advisory: string;
  readonly module: string;
  readonly severity: string;
  readonly title: string;
  readonly url: string;
  readonly patchedVersions: string;
  readonly paths: readonly string[];
  readonly reason: BlockReason;
}

export interface AuditVerdict {
  readonly ok: boolean;
  /** Advisories that fail the gate, each with the reason it was not accepted. */
  readonly blocking: readonly BlockingAdvisory[];
  /** Allowlist entries matching nothing in the report — stale, prune them. */
  readonly unused: readonly AllowlistEntry[];
  /** How many advisories were accepted by a live allowlist entry. */
  readonly acceptedCount: number;
}

function severityRank(severity: string): number {
  return SEVERITY_ORDER.indexOf(severity as Severity);
}

/** Inclusive end of the review date, in UTC. Returns null if unparseable. */
function reviewDeadline(reviewBy: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewBy)) return null;
  const parsed = new Date(`${reviewBy}T23:59:59.999Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function evaluateAudit(
  report: AuditReport,
  allowlist: readonly AllowlistEntry[],
  now: Date,
  threshold: Severity = DEFAULT_THRESHOLD,
): AuditVerdict {
  const byAdvisory = new Map(allowlist.map((entry) => [entry.advisory, entry]));
  const minRank = severityRank(threshold);

  const blocking: BlockingAdvisory[] = [];
  const seen = new Set<string>();
  let acceptedCount = 0;

  for (const advisory of Object.values(report.advisories)) {
    const rank = severityRank(advisory.severity);
    // An unrecognised severity is never quietly dropped — it is treated as in-scope
    // and blocks, so a registry adding a new level cannot silently widen the gate.
    if (rank !== -1 && rank < minRank) continue;

    seen.add(advisory.github_advisory_id);
    // The report is parsed JSON asserted into this shape, so treat every field as
    // possibly absent: a malformed advisory must block, not throw past the gate.
    const paths = (advisory.findings ?? []).flatMap((finding) => finding?.paths ?? []);
    const block = (reason: BlockReason): void => {
      blocking.push({
        advisory: advisory.github_advisory_id,
        module: advisory.module_name,
        severity: advisory.severity,
        title: advisory.title,
        url: advisory.url,
        patchedVersions: advisory.patched_versions,
        paths,
        reason,
      });
    };

    if (rank === -1) {
      block("unknown_severity");
      continue;
    }

    const entry = byAdvisory.get(advisory.github_advisory_id);
    if (!entry) {
      block("not_allowlisted");
      continue;
    }
    if (entry.module !== advisory.module_name) {
      block("module_mismatch");
      continue;
    }
    const deadline = reviewDeadline(entry.reviewBy);
    if (!deadline) {
      block("unparseable_review_date");
      continue;
    }
    if (now > deadline) {
      block("acceptance_expired");
      continue;
    }
    // W107: the deadline must be the one a recorded review set. Bumping `reviewBy` without
    // adding a review leaves these out of step, and the acceptance stops working — which is
    // the same fail-closed direction as every other check here.
    const newest = entry.reviews[entry.reviews.length - 1];
    if (!newest || newest.extendedTo !== entry.reviewBy) {
      block("review_date_unexplained");
      continue;
    }
    acceptedCount += 1;
  }

  // A stale entry is reported but does not block: fixing a vulnerability should
  // never break the build. Expiry is what keeps the list from rotting.
  const unused = allowlist.filter((entry) => !seen.has(entry.advisory));

  return { ok: blocking.length === 0, blocking, unused, acceptedCount };
}

const BLOCK_EXPLANATION: Record<BlockReason, string> = {
  not_allowlisted: "not in the allowlist — fix it, or accept it with a rationale and review date",
  acceptance_expired: "the accepted-risk entry has passed its review date — re-review it",
  module_mismatch: "the allowlist entry names a different package",
  unparseable_review_date: "the allowlist entry's reviewBy is not a YYYY-MM-DD date",
  review_date_unexplained:
    "the allowlist entry's reviewBy does not match the date its newest review set — record what you checked, do not just move the date",
  unknown_severity: "unrecognised severity — treated as in-scope",
};

/** Human-readable gate report. Kept next to the rules so the two cannot drift. */
export function formatVerdict(verdict: AuditVerdict, allowlistPath: string): string {
  const lines: string[] = [];

  for (const entry of verdict.unused) {
    lines.push(
      `note: ${entry.advisory} (${entry.module}) is allowlisted but no longer reported — ` +
        `remove it from ${allowlistPath}`,
    );
  }

  if (verdict.ok) {
    const accepted = verdict.acceptedCount === 1 ? "1 accepted advisory" : `${verdict.acceptedCount} accepted advisories`;
    lines.push(`audit gate: PASS (${accepted}, 0 unaccepted)`);
    return lines.join("\n");
  }

  lines.push(`audit gate: FAIL — ${verdict.blocking.length} advisory/advisories block the build`);
  for (const item of verdict.blocking) {
    lines.push("");
    lines.push(`  ${item.severity.toUpperCase()}  ${item.module}: ${item.title}`);
    lines.push(`    ${item.advisory}  ${item.url}`);
    lines.push(`    path: ${item.paths.join(", ") || "(unreported)"}`);
    // pnpm reports an empty patched range as `<0.0.0`, which reads as nonsense.
    const patched = item.patchedVersions === "<0.0.0" ? "no patched release yet" : item.patchedVersions;
    lines.push(`    patched: ${patched}`);
    lines.push(`    why: ${BLOCK_EXPLANATION[item.reason]}`);
  }
  lines.push("");
  lines.push(`Accept a risk by adding an entry to ${allowlistPath} with a reason and a reviewBy date.`);
  return lines.join("\n");
}
