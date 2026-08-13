// W98: group rollout tooling — onboard N sites from one config.
//
// The whole risk of a bulk operation is that it half-succeeds. Onboarding twelve sites and
// having site seven fail leaves a group in a state nobody described: six configured, one
// broken, five untouched, and an operator who has to work out which is which from an error
// message. So the design question is not "how do we onboard N sites" but "what happens when
// one of them fails", and the answer is fixed before anything is written:
//
//   VALIDATE EVERYTHING FIRST, THEN APPLY. `planRollout` checks every site against every
//   rule and returns a plan; `applyRollout` refuses to run a plan that has any error. There
//   is no partial-apply path, because the recovery story for one is worse than the failure
//   it avoids.
//
//   A DRY RUN IS THE SAME CODE. `planRollout` is what the operator previews and what
//   `applyRollout` consumes — not a second implementation that can drift from the real one.
//   The W40 playbook's "dry run in shadow mode" habit, in code.
//
// The per-site config is deliberately shallow: name, timezone, holdout. Everything a site
// actually needs to differ on (eligibility rules, participating clinicians, protected
// capacity) is left to the site's own setup, because a group-level default that silently
// governs who gets contacted at twelve practices is precisely the ambient authority W97
// refuses.

export interface SiteRolloutInput {
  practiceId: string;
  name: string;
  timezone: string;
  holdoutPercent: number;
  ownerEmail: string;
}

export interface GroupRolloutConfig {
  groupId: string;
  sites: readonly SiteRolloutInput[];
  /** Applied where a site does not state its own. Never applied silently to eligibility. */
  defaults?: { timezone?: string; holdoutPercent?: number };
}

export type RolloutError =
  | "duplicate_practice_id"
  | "name_too_short"
  | "invalid_timezone"
  | "holdout_out_of_range"
  | "owner_email_invalid"
  | "practice_already_exists";

export interface PlannedSite {
  practiceId: string;
  resolved: SiteRolloutInput;
  /** Empty when this site is ready to apply. */
  errors: RolloutError[];
  /** Which fields came from group defaults rather than the site's own row. */
  defaulted: string[];
}

export interface RolloutPlan {
  groupId: string;
  sites: PlannedSite[];
  /** True only when EVERY site is clean. A plan is all-or-nothing. */
  applicable: boolean;
  errorCount: number;
}

const TIMEZONE = /^[A-Za-z_]+\/[A-Za-z_]+$/;

/**
 * Validate every site and resolve group defaults. Pure — writes nothing, so it doubles as
 * the dry run an operator previews before committing to a rollout.
 */
export function planRollout(
  config: GroupRolloutConfig,
  existingPracticeIds: readonly string[] = [],
): RolloutPlan {
  const seen = new Set<string>();
  const existing = new Set(existingPracticeIds);

  const sites: PlannedSite[] = config.sites.map((site) => {
    const errors: RolloutError[] = [];
    const defaulted: string[] = [];

    const timezone = site.timezone || config.defaults?.timezone || "";
    if (!site.timezone && config.defaults?.timezone) defaulted.push("timezone");

    const holdoutPercent =
      site.holdoutPercent ?? config.defaults?.holdoutPercent ?? Number.NaN;
    if (site.holdoutPercent === undefined && config.defaults?.holdoutPercent !== undefined) {
      defaulted.push("holdoutPercent");
    }

    if (seen.has(site.practiceId)) errors.push("duplicate_practice_id");
    seen.add(site.practiceId);
    if (existing.has(site.practiceId)) errors.push("practice_already_exists");
    if (site.name.trim().length < 2) errors.push("name_too_short");
    if (!TIMEZONE.test(timezone)) errors.push("invalid_timezone");
    if (!Number.isFinite(holdoutPercent) || holdoutPercent < 0 || holdoutPercent > 50) {
      errors.push("holdout_out_of_range");
    }
    if (!site.ownerEmail.includes("@")) errors.push("owner_email_invalid");

    return {
      practiceId: site.practiceId,
      resolved: { ...site, timezone, holdoutPercent },
      errors,
      defaulted,
    };
  });

  const errorCount = sites.reduce((n, s) => n + s.errors.length, 0);
  return { groupId: config.groupId, sites, applicable: errorCount === 0, errorCount };
}

export interface RolloutResult {
  applied: string[];
  /** Populated only when the plan was refused; nothing was written in that case. */
  refusedBecause: RolloutError[] | null;
}

/**
 * Apply a plan. Refuses outright if any site has an error — nothing is written, so there is
 * no half-configured group to reconcile afterwards.
 *
 * `commit` performs the per-site write. It is injected rather than imported so the caller
 * decides what "onboard" means (console store today, a real transaction later) and so this
 * module has no opinion about persistence.
 */
export function applyRollout(
  plan: RolloutPlan,
  commit: (site: SiteRolloutInput) => void,
): RolloutResult {
  if (!plan.applicable) {
    return {
      applied: [],
      refusedBecause: [...new Set(plan.sites.flatMap((s) => s.errors))].sort(),
    };
  }
  const applied: string[] = [];
  for (const site of plan.sites) {
    commit(site.resolved);
    applied.push(site.practiceId);
  }
  return { applied, refusedBecause: null };
}

/** Operator-facing preview. Every error names the site it belongs to. */
export function renderPlan(plan: RolloutPlan): string {
  const lines = [
    `# Group rollout plan — ${plan.groupId}`,
    ``,
    plan.applicable
      ? `${plan.sites.length} site(s) ready to onboard.`
      : `**Refused.** ${plan.errorCount} problem(s) across ${plan.sites.filter((s) => s.errors.length > 0).length} site(s). Nothing will be written until every site is clean.`,
    ``,
    `| Site | Name | Timezone | Holdout | Status |`,
    `|---|---|---|---|---|`,
  ];
  for (const site of plan.sites) {
    const status =
      site.errors.length === 0
        ? site.defaulted.length > 0
          ? `ready (defaulted: ${site.defaulted.join(", ")})`
          : "ready"
        : `**${site.errors.join(", ")}**`;
    lines.push(
      `| ${site.practiceId} | ${site.resolved.name} | ${site.resolved.timezone || "—"} | ${Number.isFinite(site.resolved.holdoutPercent) ? `${site.resolved.holdoutPercent}%` : "—"} | ${status} |`,
    );
  }
  lines.push(
    ``,
    `Eligibility rules, participating clinicians and protected capacity are NOT set here.`,
    `Each site configures its own: a group-level default silently governing who gets contacted`,
    `at every site is the ambient authority W97 refuses.`,
    ``,
  );
  return lines.join("\n");
}
