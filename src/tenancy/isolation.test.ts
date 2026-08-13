import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "@/engine/eligibility";
import { generatePractice } from "@/synthetic/generate";
import { getConsole, onboardPractice, resetConsole, updateRules } from "@/console/store";
import {
  ALL_ACTIONS,
  ALL_ROLES,
  authorize,
  can,
  scopeToPractice,
  type Membership,
} from "./tenancy";

const A = "prac-a";
const B = "prac-b";

const MEMBERS: Membership[] = [
  { practiceId: A, email: "owner@a.example", role: "owner" },
  { practiceId: A, email: "manager@a.example", role: "manager" },
  { practiceId: A, email: "gp@a.example", role: "clinician" },
  { practiceId: B, email: "owner@b.example", role: "owner" },
];

// W166: ids are generated, so the practice under test is looked up rather than named.
const rec = () => getConsole().practices[0]!;
const pid = () => rec().practice.id;

describe("W18 multi-tenancy — cross-tenant access is impossible", () => {
  it("every member of practice A is denied every action at practice B, whatever their role", () => {
    for (const member of MEMBERS.filter((m) => m.practiceId === A)) {
      for (const action of ALL_ACTIONS) {
        expect(authorize(MEMBERS, member.email, B, action)).toEqual({
          allowed: false,
          reason: "no_membership",
        });
      }
    }
  });

  it("an unknown email is denied everywhere", () => {
    for (const action of ALL_ACTIONS) {
      expect(authorize(MEMBERS, "stranger@nowhere.example", A, action).allowed).toBe(false);
    }
  });

  it("membership at two practices grants each side independently, never transitively", () => {
    const dual: Membership[] = [
      ...MEMBERS,
      { practiceId: B, email: "gp@a.example", role: "manager" },
    ];
    // Same person: clinician at A (no rules grant), manager at B (rules grant).
    expect(authorize(dual, "gp@a.example", A, "edit_rules").allowed).toBe(false);
    expect(authorize(dual, "gp@a.example", B, "edit_rules").allowed).toBe(true);
  });

  it("role grants are strictly nested: owner ⊇ manager ⊇ clinician", () => {
    for (const action of ALL_ACTIONS) {
      if (can("clinician", action)) expect(can("manager", action)).toBe(true);
      if (can("manager", action)) expect(can("owner", action)).toBe(true);
    }
    expect(can("clinician", "edit_rules")).toBe(false);
    expect(can("manager", "manage_members")).toBe(false);
    expect(can("owner", "manage_members")).toBe(true);
  });

  it("scopeToPractice returns rows of exactly one tenant on real synthetic data", () => {
    const practice = generatePractice({
      seed: 1,
      patientCount: 500,
      clinicianCount: 4,
      scheduleWeeks: 1,
      todayIso: "2026-08-08",
    });
    // Second tenant's rows mixed into the same collection.
    const foreign = practice.patients.slice(0, 100).map((p) => ({ ...p, practiceId: B as typeof p.practiceId }));
    const mixed = [...practice.patients, ...foreign];
    const scoped = scopeToPractice(mixed, practice.practice.id);
    expect(scoped).toHaveLength(practice.patients.length);
    expect(scoped.every((p) => p.practiceId === practice.practice.id)).toBe(true);
    expect(scopeToPractice(mixed, B)).toHaveLength(100);
  });
});

describe("W18 console enforcement", () => {
  beforeEach(() => resetConsole());
  const NOW = "2026-08-08T22:00:00Z";
  const VALID = { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 10 };

  it("onboarding seats the signer as owner", () => {
    onboardPractice(VALID, NOW, "owner@demo.example");
    expect(getConsole().memberships).toEqual([
      { practiceId: getConsole().practices[0]!.practice.id, email: "owner@demo.example", role: "owner" },
    ]);
  });

  it("a non-member cannot change rules; the owner can", () => {
    onboardPractice(VALID, NOW, "owner@demo.example");
    const denied = updateRules(pid(), 
      { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 240 },
      NOW,
      "outsider@elsewhere.example",
    );
    expect(denied).toHaveProperty("form");
    expect(rec().rulesVersion).toBe(1);
    const allowed = updateRules(pid(), 
      { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 240 },
      NOW,
      "owner@demo.example",
    );
    expect(allowed).toEqual({});
    expect(rec().rulesVersion).toBe(2);
  });

  it("a clinician member is refused the rules grant", () => {
    onboardPractice(VALID, NOW, "owner@demo.example");
    getConsole().memberships.push({
      practiceId: "prac-console",
      email: "gp@demo.example",
      role: "clinician",
    });
    const denied = updateRules(pid(), { ...DEFAULT_CONFIG, chronicCareOnly: true }, NOW, "gp@demo.example");
    expect(denied).toHaveProperty("form");
    expect(rec().rulesVersion).toBe(1);
  });
});
