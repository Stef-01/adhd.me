// W105 verify gate (unit half): the ADHD.ME-staff gate ships closed and cannot be reached
// through the practice role model. The surface half is e2e/interest.spec.ts.

import { describe, expect, it } from "vitest";
import { ALL_ROLES, authorize, type Membership, type Role } from "./tenancy";
import { ADHDME_STAFF, type StaffGrant, isAdhdMeStaff } from "./staff";

const grants: StaffGrant[] = [
  { email: "ops@adhd-me.example", grantedBy: "founder@adhd-me.example", grantedAt: "2026-08-10T00:00:00Z" },
];

describe("W105 the gate ships closed", () => {
  it("nobody is ADHD.ME staff by default", () => {
    // The W68/W121 posture, pinned: an entry here is a founder decision made in a commit,
    // and a unit that quietly added one would fail this.
    expect(ADHDME_STAFF).toEqual([]);
    expect(isAdhdMeStaff("owner@demo.practice.example")).toBe(false);
    expect(isAdhdMeStaff("founder@adhd-me.example")).toBe(false);
  });

  it("refuses absent, empty and whitespace identities", () => {
    for (const value of [null, undefined, "", "   "]) {
      expect(isAdhdMeStaff(value, grants)).toBe(false);
    }
  });

  it("matches a granted email regardless of case or surrounding space", () => {
    expect(isAdhdMeStaff("ops@adhd-me.example", grants)).toBe(true);
    expect(isAdhdMeStaff("  OPS@ADHD-ME.Example  ", grants)).toBe(true);
    expect(isAdhdMeStaff("ops@adhd-me.example.evil", grants)).toBe(false);
    expect(isAdhdMeStaff("someone-else@adhd-me.example", grants)).toBe(false);
  });
});

describe("W105 no practice role can reach it", () => {
  it("is not a member of the practice role union", () => {
    // The structural claim. If `adhdme_staff` were ever added to Role, it would flow through
    // authorize() and a practice owner holding manage_members could grant it to themselves —
    // W97's lesson run backwards. This asserts the two systems stay separate.
    expect(ALL_ROLES).toEqual(["owner", "manager", "clinician"]);
    expect(ALL_ROLES as readonly string[]).not.toContain("adhdme_staff");
  });

  it("no role at any practice makes anyone staff", () => {
    for (const role of ALL_ROLES) {
      const memberships: Membership[] = [
        { practiceId: "prac-1", email: "person@demo.practice.example", role: role as Role },
      ];
      // They are a legitimate console user...
      expect(authorize(memberships, "person@demo.practice.example", "prac-1", "view_dashboard").allowed).toBe(
        role === "owner" || role === "manager" || role === "clinician",
      );
      // ...and that grants nothing here.
      expect(isAdhdMeStaff("person@demo.practice.example", grants)).toBe(false);
    }
  });
});
