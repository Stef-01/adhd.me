// W97 verify gate: isolation tests at group scale.
//
// The property under test is that adding a group layer did not weaken W18. Every test is a
// way of asking "can this person reach a site they were never granted?" — including the ones
// a group hierarchy makes newly possible: a group role at the wrong group, a site in no
// group, and a group role that would exceed its site equivalent.

import { describe, expect, it } from "vitest";
import type { Membership } from "./tenancy";
import {
  addSiteToGroup,
  authorizeAtSite,
  groupReport,
  sitesFor,
  type GroupMembership,
  type MultisiteContext,
  type SiteTotals,
} from "./multisite";

const SITES = [
  { practiceId: "site-a", groupId: "group-1" },
  { practiceId: "site-b", groupId: "group-1" },
  { practiceId: "site-c", groupId: "group-2" },
  { practiceId: "site-solo", groupId: "" },
];

const siteMemberships: Membership[] = [
  { practiceId: "site-a", email: "gp@a", role: "clinician" },
  { practiceId: "site-c", email: "owner@c", role: "owner" },
];

const groupMemberships: GroupMembership[] = [
  { groupId: "group-1", email: "groupowner@1", role: "owner" },
  { groupId: "group-1", email: "groupclin@1", role: "clinician" },
  { groupId: "group-2", email: "groupmgr@2", role: "manager" },
];

const ctx: MultisiteContext = { sites: SITES, siteMemberships, groupMemberships };

describe("W97 a group role resolves down to its sites", () => {
  it("grants at every site in the group", () => {
    expect(authorizeAtSite(ctx, "groupowner@1", "site-a", "edit_rules")).toMatchObject({ allowed: true, via: "group" });
    expect(authorizeAtSite(ctx, "groupowner@1", "site-b", "edit_rules")).toMatchObject({ allowed: true, via: "group" });
  });

  it("grants NOTHING at a site in another group", () => {
    // The property W18 exists to hold, restated at group scale.
    expect(authorizeAtSite(ctx, "groupowner@1", "site-c", "view_dashboard").allowed).toBe(false);
  });

  it("grants nothing at a site that belongs to no group", () => {
    expect(authorizeAtSite(ctx, "groupowner@1", "site-solo", "view_dashboard").allowed).toBe(false);
  });

  it("direct site membership still works and is reported as such", () => {
    expect(authorizeAtSite(ctx, "gp@a", "site-a", "view_dashboard")).toMatchObject({ allowed: true, via: "site" });
  });
});

describe("W97 a group role never exceeds its site equivalent", () => {
  it("a group CLINICIAN cannot edit rules anywhere, because a site clinician cannot", () => {
    // There is no group-only permission: both paths end in the same authorize().
    expect(authorizeAtSite(ctx, "groupclin@1", "site-a", "view_dashboard").allowed).toBe(true);
    expect(authorizeAtSite(ctx, "groupclin@1", "site-a", "edit_rules").allowed).toBe(false);
    expect(authorizeAtSite(ctx, "groupclin@1", "site-a", "manage_members").allowed).toBe(false);
  });

  it("a group MANAGER cannot manage members, matching the site manager grant exactly", () => {
    expect(authorizeAtSite(ctx, "groupmgr@2", "site-c", "pause_sending").allowed).toBe(true);
    expect(authorizeAtSite(ctx, "groupmgr@2", "site-c", "manage_members").allowed).toBe(false);
  });

  it("a stranger with no membership of any kind is refused everywhere", () => {
    for (const site of SITES.map((s) => s.practiceId)) {
      expect(authorizeAtSite(ctx, "stranger@elsewhere", site, "view_dashboard").allowed).toBe(false);
    }
  });
});

describe("W97 site listing", () => {
  it("lists exactly the sites a caller may act at", () => {
    expect(sitesFor(ctx, "groupowner@1", "view_dashboard")).toEqual(["site-a", "site-b"]);
    expect(sitesFor(ctx, "gp@a", "view_dashboard")).toEqual(["site-a"]);
    expect(sitesFor(ctx, "owner@c", "view_dashboard")).toEqual(["site-c"]);
    expect(sitesFor(ctx, "stranger@elsewhere", "view_dashboard")).toEqual([]);
  });

  it("narrows as the action gets stronger", () => {
    expect(sitesFor(ctx, "groupclin@1", "view_dashboard")).toEqual(["site-a", "site-b"]);
    expect(sitesFor(ctx, "groupclin@1", "edit_rules")).toEqual([]);
  });
});

describe("W97 cross-site reporting is aggregate-only and never silently partial", () => {
  const totals: SiteTotals[] = [
    { practiceId: "site-a", invitationsSent: 100, booked: 20, attended: 18 },
    { practiceId: "site-b", invitationsSent: 50, booked: 12, attended: 11 },
    { practiceId: "site-c", invitationsSent: 999, booked: 999, attended: 999 },
  ];

  it("totals only the sites the caller may see", () => {
    const report = groupReport(ctx, "groupowner@1", "group-1", totals);
    expect(report.sites.map((s) => s.practiceId)).toEqual(["site-a", "site-b"]);
    expect(report.total).toEqual({ invitationsSent: 150, booked: 32, attended: 29 });
    // site-c belongs to another group and its numbers must not appear at all.
    expect(JSON.stringify(report)).not.toContain("999");
  });

  it("SAYS which sites it withheld — a total that quietly excludes is worse than none", () => {
    // gp@a is a clinician at site-a only, so site-b is in the group but not visible.
    const report = groupReport(ctx, "gp@a", "group-1", totals);
    expect(report.sites.map((s) => s.practiceId)).toEqual(["site-a"]);
    expect(report.withheldSites).toEqual(["site-b"]);
    expect(report.total.invitationsSent).toBe(100);
  });

  it("reports zeroes for a visible site with no data rather than dropping it", () => {
    const report = groupReport(ctx, "groupowner@1", "group-1", [totals[0]!]);
    expect(report.sites.find((s) => s.practiceId === "site-b")).toEqual({
      practiceId: "site-b", invitationsSent: 0, booked: 0, attended: 0,
    });
  });

  it("carries no row-level fields at all", () => {
    // Nothing here to leak even if a future caller forgets to scope.
    const report = groupReport(ctx, "groupowner@1", "group-1", totals);
    const keys = new Set(report.sites.flatMap((s) => Object.keys(s)));
    expect([...keys].sort()).toEqual(["attended", "booked", "invitationsSent", "practiceId"]);
  });
});

describe("W97 adding a site to a group is a privilege change", () => {
  it("reports whose access it newly grants, not just that a row moved", () => {
    const { sites, newlyGranted } = addSiteToGroup(ctx, "site-solo", "group-1");
    expect(sites.find((s) => s.practiceId === "site-solo")?.groupId).toBe("group-1");
    // Both group-1 members gain access to a site they previously could not reach.
    expect(newlyGranted).toEqual(["groupclin@1", "groupowner@1"]);
  });

  it("does not count someone who already had direct site membership", () => {
    const { newlyGranted } = addSiteToGroup(
      { ...ctx, groupMemberships: [...groupMemberships, { groupId: "group-1", email: "gp@a", role: "owner" }] },
      "site-a",
      "group-1",
    );
    expect(newlyGranted).not.toContain("gp@a");
  });

  it("moving a site between groups takes its access with it", () => {
    const moved = addSiteToGroup(ctx, "site-c", "group-1");
    const next: MultisiteContext = { ...ctx, sites: moved.sites };
    expect(authorizeAtSite(next, "groupowner@1", "site-c", "view_dashboard").allowed).toBe(true);
    expect(authorizeAtSite(next, "groupmgr@2", "site-c", "view_dashboard").allowed).toBe(false);
    // The site's own owner is unaffected by group churn.
    expect(authorizeAtSite(next, "owner@c", "site-c", "edit_rules").allowed).toBe(true);
  });
});
