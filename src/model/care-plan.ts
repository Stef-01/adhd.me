// The care plan, on the map (docs/adhd-life/CARE-PLAN-PRD.md).
//
// A GP-written chronic condition management plan is the mechanism that turns "you should see an
// occupational therapist" into subsidised sessions. This module holds one person's plan and works
// out which providers their own map says to spend it on. It has no UI and no opinions about money.
//
// THE APP DOES NOT KNOW HOW MANY SERVICES ANYBODY HAS. Their plan does, because their GP wrote it
// there. So `allows` is data the person confirms rather than a constant this file asserts. The
// figure in the founder's brief — ten — looks like two numbers added together: five individual
// allied-health services a calendar year, which is the general entitlement, plus five group
// services, which are type 2 diabetes specific and so not available on a plan written for ADHD.
// The scheme also moved in July 2025, when the GP Management Plan and Team Care Arrangements
// became one plan. A hard-coded 5 is wrong for somebody; a hard-coded 10 is wrong for almost
// everybody; data is right either way and does not go stale at the next MBS change. PRD §1, D1.
//
// NO MONEY, ANYWHERE. `src/directory/fees.ts` refuses `rebateCents` because "a rebate is a fact
// about the patient's Medicare entitlement rather than about the practice", and this module is
// made of facts about the patient's entitlement — so the line is drawn rather than inherited by
// vibe. A COUNT of services left on a person's own plan is their own record and lives here. A SUM
// OF MONEY — a rebate, a gap, a total saved, "five sessions is worth $N" — is the arithmetic
// `REFUSED_FEE_FIELDS` exists to prevent, and there is nowhere in `CarePlan` to put one.
// `care-plan.test.ts` asserts that structurally, over keys and exports, because fees.ts's own
// method note is that a scan whose subject matter IS the thing it bans will match the sentence
// doing the banning.
//
// NO ELIGIBILITY CLAIM. Whether a person's ADHD qualifies for a plan is their GP's clinical
// judgement. Nothing here returns "eligible", and the only thing the product says about getting
// one is a question to ask a GP.

import { ASPECT_LABELS, ASPECT_OF, ASPECTS, type Aspect } from "./matrix";
import { deriveNeeds } from "./needs";
import { professionsFor } from "./recommend";
import type { ModelRecord } from "./store";
import { isProfession, type Profession } from "@/support/professions";

/**
 * The allied-health kinds a chronic condition management plan can refer to, pending the clinical
 * confirmation the PRD tracks as D2. Of the eleven professions the product knows, these are the
 * four; a GP writes the plan rather than being a service under it, a counsellor is claimable only
 * as a registered mental health worker (D4, excluded until confirmed), and a psychiatrist attracts
 * separate items. An ADHD coach is not a Medicare provider of any kind, which matters more than it
 * looks — see `suggestFor`.
 *
 * One array, one test. When a clinician corrects this, one line changes.
 */
export const CLAIMABLE: readonly Profession[] = [
  "psychologist",
  "occupational-therapist",
  "exercise-physiologist",
  "dietitian",
];

const CLAIMABLE_SET = new Set<Profession>(CLAIMABLE);

/** Whether a plan can pay for this kind of provider. */
export function claimable(kind: Profession): boolean {
  return CLAIMABLE_SET.has(kind);
}

export interface CarePlan {
  /** What the person's own plan allows. Their GP wrote it; this app never infers it. */
  readonly allows: number;
  /** Services already used. Never inferred from bookings this app cannot see. */
  readonly used: number;
  /** The calendar year the allowance belongs to, so a new year reads as a new allowance. */
  readonly year: number;
  /** When the person last confirmed these numbers, because a count is perishable. */
  readonly confirmedOn: string;

  // THE HELPER (PRD §14). What a GP needs on the day, asked as a tap each and held as the person's
  // own answers. `null` on each is "not asked yet"; an empty list is an answer.

  /** Going on six months or more: the person's own answer, never this app's reading of them. */
  readonly sixMonths: boolean | null;
  /** The axes they want to change first, in the order they chose them. At most `GOALS_MAX`. */
  readonly goals: readonly Aspect[] | null;
  /** The goal in their own words. Verbatim; never rewritten. */
  readonly goalNote: string;
  /** Who they already see. Empty means nobody, which is an answer. */
  readonly providers: readonly Profession[] | null;
  /** Names, in their own words. Verbatim; never rewritten. */
  readonly providerNote: string;
  /** The kinds they want on the plan, chosen from the map's own proposal (`teamFor`). */
  readonly team: readonly Profession[] | null;
}

/** The two bounds a person editing by hand can reach, so the steppers and the model agree. */
export const PLAN_MAX = 20;
/** Three goals: a plan a GP writes has room for a few, and a list of six is not a choice. */
export const GOALS_MAX = 3;
/** The four claimable kinds are the most a proposal can hold, one service each. */
export const TEAM_MAX = 4;

export function emptyCarePlan(): CarePlan {
  return { allows: 0, used: 0, year: 0, confirmedOn: "", sixMonths: null, goals: null, goalNote: "", providers: null, providerNote: "", team: null };
}

const ASPECT_SET = new Set<string>(ASPECTS);
const isAspect = (v: unknown): v is Aspect => typeof v === "string" && ASPECT_SET.has(v);

/**
 * A plan read back off the device, with each field held to its own shape. An old record has none
 * of the helper's fields and reads as "not asked yet", which is the truth about it.
 */
export function sanitisePlan(raw: unknown): CarePlan {
  const base = emptyCarePlan();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const r = raw as Partial<Record<keyof CarePlan, unknown>>;
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const kinds = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter(isProfession))] : null);
  return {
    allows: num(r.allows, 0),
    used: num(r.used, 0),
    year: num(r.year, 0),
    confirmedOn: str(r.confirmedOn),
    sixMonths: typeof r.sixMonths === "boolean" ? r.sixMonths : null,
    goals: Array.isArray(r.goals) ? [...new Set(r.goals.filter(isAspect))].slice(0, GOALS_MAX) : null,
    goalNote: str(r.goalNote),
    providers: kinds(r.providers),
    providerNote: str(r.providerNote),
    // A plan can never pay for an uncovered kind, so one can never be on the team the GP reads.
    team: kinds(r.team)?.filter(claimable) ?? null,
  };
}

/**
 * The five steps of the helper, in the order the sheet lists them: the four a person answers
 * before the visit, then the numbers only a written plan can give them.
 */
export const STEPS = ["duration", "goals", "providers", "team", "services"] as const;
export type Step = (typeof STEPS)[number];

/** Each step's name on the sheet: one to three words, because the row is a row. */
export const STEP_LABELS: Readonly<Record<Step, string>> = {
  duration: "Six months",
  goals: "Goals",
  providers: "Who I see",
  team: "My team",
  services: "Services",
};

/** Whether the person has answered a step. Answered, not agreed: "nobody" and "not yet" count. */
export function done(plan: CarePlan, step: Step): boolean {
  switch (step) {
    case "services":
      return hasPlan(plan);
    case "duration":
      return plan.sixMonths !== null;
    case "goals":
      return plan.goals !== null;
    case "providers":
      return plan.providers !== null;
    case "team":
      return plan.team !== null;
  }
}

/** A plan a person has actually told us about, as opposed to the empty one every record starts with. */
export function hasPlan(plan: CarePlan): boolean {
  return plan.allows > 0 && plan.confirmedOn !== "";
}

/**
 * Services left. Floors at zero: a person can set `used` above `allows` by hand, and the honest
 * reading of that is "none left" rather than a negative number on a screen.
 */
export function remaining(plan: CarePlan, today = new Date()): number {
  if (!hasPlan(plan)) return 0;
  // A plan from an earlier year has a fresh allowance this year, and the app does not edit the
  // person's record behind them to say so — it just reads the old `used` as spent last year.
  const used = plan.year === today.getFullYear() ? plan.used : 0;
  return Math.max(0, plan.allows - Math.min(used, PLAN_MAX));
}

/** The dot row: one entry per service the plan allows, true for spent. Length is always `allows`. */
export function spent(plan: CarePlan, today = new Date()): readonly boolean[] {
  const allows = Math.max(0, Math.min(plan.allows, PLAN_MAX));
  const left = remaining(plan, today);
  return Array.from({ length: allows }, (_, i) => i < allows - left);
}

/** The year this allowance runs out. A fact, said once — never a countdown (PRD §9). */
export function lapses(plan: CarePlan, today = new Date()): number {
  return (plan.year || today.getFullYear()) + 1;
}

export interface Suggestion {
  readonly kind: Profession;
  /**
   * The AXIS the person's own map pointed at — "Starting", "Organisation" — which is what makes
   * this their plan rather than a list of professions. One or two words, because the axes are:
   * `Need.label` is a whole sentence ("Starting long independent work.") and the sheet's cell has
   * room for a word.
   */
  readonly because: string;
  /** Whether a plan can pay for this kind. False rows are shown, marked — never dropped. */
  readonly covered: boolean;
}

/**
 * Who to spend the plan on, from the map the person already has.
 *
 * No new taxonomy: this is the chain `/support` already walks — the axes become needs in
 * `needs.ts`, ordered by the person's own cost, and `professionsFor` ranks the professions for a
 * need — with one filter and one cap on the end.
 *
 * WHY AN UNCOVERED ROW SURVIVES THE FILTER. `MAP-CONNECTIONS.md` measured `adhd-coach` as the
 * profession the map points at for 13 of the 17 subdomains no real provider can serve, and a coach
 * is the one kind a plan can never pay for. So the map's FIRST answer is often not claimable, and
 * a plan screen that silently dropped it would disagree with the support screen for no visible
 * reason and read as broken. The single highest-ranked uncovered kind is kept, in its own place in
 * the order, marked; deeper uncovered kinds are noise and go. Covered rows are capped at
 * `remaining`, because those are the ones that spend a service.
 */
export function suggestFor(record: ModelRecord, plan: CarePlan, today = new Date()): readonly Suggestion[] {
  const left = remaining(plan, today);
  if (left === 0) return [];
  return teamFor(record, left);
}

/**
 * The map's proposal for a plan that may not exist yet: the same rows `suggestFor` spends a plan
 * on, capped at `cap` covered kinds instead of at what is left. This is what the helper's "My
 * team" step offers before a GP has written anything, because the whole point of preparing is
 * that there is no plan yet.
 */
export function teamFor(record: ModelRecord, cap = TEAM_MAX): readonly Suggestion[] {
  const left = Math.max(0, Math.min(cap, TEAM_MAX));
  if (left === 0) return [];

  const ordered: Suggestion[] = [];
  const seen = new Set<Profession>();
  for (const need of deriveNeeds(record)) {
    for (const kind of professionsFor(need)) {
      // A GP WRITES THE PLAN AND IS NOT A SERVICE UNDER IT, so "see a GP" on a care-plan screen is
      // circular — and `professionsFor` returns `["gp"]` as its fallback whenever no module targets
      // a need, which put it straight onto the sheet. Skipped rather than marked "Not covered",
      // because it is not a thing a person was offered and then denied.
      if (kind === "gp") continue;
      if (seen.has(kind)) continue;
      seen.add(kind);
      ordered.push({ kind, because: ASPECT_LABELS[ASPECT_OF[need.subdomain]], covered: claimable(kind) });
      break; // One kind per need: the need's own first answer, not its whole list.
    }
  }

  const out: Suggestion[] = [];
  let covered = 0;
  let uncovered = 0;
  for (const s of ordered) {
    if (s.covered) {
      if (covered >= left) continue;
      covered += 1;
    } else {
      if (uncovered >= 1) continue;
      uncovered += 1;
    }
    out.push(s);
  }
  return out;
}
