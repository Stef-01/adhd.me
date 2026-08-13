// W97: multisite tenancy — group-level roles, cross-site reporting, per-site isolation.
//
// A practice group owns several sites. The temptation is to model that as "a group is a big
// practice", which quietly destroys the property W18 exists to hold: a membership at site A
// grants exactly nothing at site B. So group membership is a SEPARATE grant that resolves
// DOWN to per-site decisions, never a bypass of them.
//
// Three rules, each of which is a decision that could have gone the other way:
//
// 1. A group role grants access to the sites in the group AT THE TIME OF THE CHECK. Adding a
//    site to a group therefore extends existing group members to it — which is what a group
//    owner expects, and is exactly why adding a site is an auditable act rather than a
//    config edit.
//
// 2. A group role NEVER exceeds what the equivalent site role would grant. A group owner is
//    an owner at each site, not a superuser above them: every decision still runs through
//    W18's `authorize`, so a grant that does not exist at site level does not exist at group
//    level either. There is no group-only permission.
//
// 3. Cross-site reporting is the one place group scope is wider than site scope, and it is
//    deliberately AGGREGATE-ONLY. A group manager may see that site B booked 40 appointments;
//    they may not page through site B's patients. Per-site row access still requires a
//    decision at that site.
//
// The failure this is written against: a group hierarchy that starts as convenience and ends
// as an ambient superuser role nobody remembers granting.

import {
  authorize,
  type AuthzDecision,
  type Membership,
  type Role,
  type TenancyAction,
} from "./tenancy";

export interface Site {
  practiceId: string;
  groupId: string;
}

/** A role held across a group. Same role vocabulary as W18 — deliberately not a new tier. */
export interface GroupMembership {
  groupId: string;
  email: string;
  role: Role;
}

export interface MultisiteContext {
  sites: readonly Site[];
  siteMemberships: readonly Membership[];
  groupMemberships: readonly GroupMembership[];
}

export type MultisiteDecision = AuthzDecision & { via?: "site" | "group" };

function sitesInGroup(ctx: MultisiteContext, groupId: string): string[] {
  return ctx.sites.filter((s) => s.groupId === groupId).map((s) => s.practiceId);
}

function groupOf(ctx: MultisiteContext, practiceId: string): string | null {
  return ctx.sites.find((s) => s.practiceId === practiceId)?.groupId ?? null;
}

/**
 * Can `email` perform `action` at `practiceId`?
 *
 * Site membership is checked first, then group membership resolved down to this site. Both
 * paths end in W18's `authorize`, so the role→action mapping has exactly one definition.
 */
export function authorizeAtSite(
  ctx: MultisiteContext,
  email: string,
  practiceId: string,
  action: TenancyAction,
): MultisiteDecision {
  const direct = authorize(ctx.siteMemberships, email, practiceId, action);
  if (direct.allowed) return { ...direct, via: "site" };

  const groupId = groupOf(ctx, practiceId);
  if (groupId === null) return direct; // a site in no group has no second path

  const group = ctx.groupMemberships.find((g) => g.groupId === groupId && g.email === email);
  if (!group) return direct;

  // Resolve the group role down to a site decision: a synthetic site membership, run through
  // the same authorize(). A group role can therefore never grant more than the same role
  // would grant at the site — there is no group-only permission, by construction.
  const resolved = authorize(
    [{ practiceId, email, role: group.role }],
    email,
    practiceId,
    action,
  );
  return resolved.allowed ? { ...resolved, via: "group" } : direct;
}

/** Every site this person may act at for `action`. The list a group console renders. */
export function sitesFor(
  ctx: MultisiteContext,
  email: string,
  action: TenancyAction,
): string[] {
  return ctx.sites
    .map((s) => s.practiceId)
    .filter((practiceId) => authorizeAtSite(ctx, email, practiceId, action).allowed)
    .sort();
}

export interface SiteTotals {
  practiceId: string;
  invitationsSent: number;
  booked: number;
  attended: number;
}

export interface GroupReport {
  groupId: string;
  /** Aggregate only — see rule 3. No row-level data crosses a site boundary here. */
  sites: SiteTotals[];
  total: Omit<SiteTotals, "practiceId">;
  /** Sites in the group this caller may NOT see, so the report never silently omits. */
  withheldSites: string[];
}

/**
 * Cross-site report for a group.
 *
 * Two properties matter more than the arithmetic. It reports only sites the caller may view,
 * and it SAYS how many it withheld — a total that quietly excludes sites is worse than no
 * total, because it looks complete. And it carries aggregates only: `SiteTotals` has no
 * patient-, clinician- or appointment-level field, so there is nothing here to leak even if
 * a future caller forgets to scope.
 */
export function groupReport(
  ctx: MultisiteContext,
  email: string,
  groupId: string,
  totalsBySite: readonly SiteTotals[],
): GroupReport {
  const inGroup = new Set(sitesInGroup(ctx, groupId));
  const visible = new Set(sitesFor(ctx, email, "view_dashboard"));

  const sites: SiteTotals[] = [];
  const withheldSites: string[] = [];
  for (const practiceId of [...inGroup].sort()) {
    if (!visible.has(practiceId)) {
      withheldSites.push(practiceId);
      continue;
    }
    const totals = totalsBySite.find((t) => t.practiceId === practiceId);
    sites.push(totals ?? { practiceId, invitationsSent: 0, booked: 0, attended: 0 });
  }

  return {
    groupId,
    sites,
    total: {
      invitationsSent: sites.reduce((n, s) => n + s.invitationsSent, 0),
      booked: sites.reduce((n, s) => n + s.booked, 0),
      attended: sites.reduce((n, s) => n + s.attended, 0),
    },
    withheldSites,
  };
}

/**
 * Add a site to a group. Returns the new site list plus who this newly grants access to —
 * because extending a group is a privilege change, and the audit trail should say whose
 * access changed rather than only that a row was added.
 */
export function addSiteToGroup(
  ctx: MultisiteContext,
  practiceId: string,
  groupId: string,
): { sites: Site[]; newlyGranted: string[] } {
  const already = ctx.sites.some((s) => s.practiceId === practiceId);
  const sites = already
    ? ctx.sites.map((s) => (s.practiceId === practiceId ? { ...s, groupId } : s))
    : [...ctx.sites, { practiceId, groupId }];

  const before = new Set(
    ctx.siteMemberships.filter((m) => m.practiceId === practiceId).map((m) => m.email),
  );
  const newlyGranted = [
    ...new Set(
      ctx.groupMemberships.filter((g) => g.groupId === groupId && !before.has(g.email)).map((g) => g.email),
    ),
  ].sort();

  return { sites, newlyGranted };
}
