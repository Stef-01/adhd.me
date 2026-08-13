// W188 verify gate: membership is a recorded practice decision, never inferred from activity
// (W57's rule); no clinician is ranked.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { foldIsOrderIndependent } from "@/quality/order-independence";
import * as mod from "./membership";
import {
  JOIN_REFUSAL_COPY,
  MEMBERSHIP_BASIS_COPY,
  type MembershipEvent,
  REFUSED_BASES,
  SHIPPED_MEMBERSHIPS,
  currentMembers,
  isMember,
  joinNetwork,
  leaveNetwork,
} from "./membership";

const join = (practiceId: string, at: string, decidedBy = "manager@a.example"): MembershipEvent => ({
  practiceId,
  basis: "joined",
  at,
  decidedBy,
});
const leave = (practiceId: string, at: string): MembershipEvent => ({
  practiceId,
  basis: "left",
  at,
  decidedBy: "manager@a.example",
});

describe("W188 membership is a decision somebody made", () => {
  it("records who decided and when", () => {
    const result = joinNetwork([], "prac-1", "manager@a.example", "2026-03-01");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.event).toEqual({
      practiceId: "prac-1",
      basis: "joined",
      at: "2026-03-01",
      decidedBy: "manager@a.example",
    });
  });

  it("refuses a membership with no decider", () => {
    // A membership with no decider is an assertion with a date on it, which is the shape a
    // derived membership would arrive in.
    const result = joinNetwork([], "prac-1", "  ", "2026-03-01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toContain("decider_missing");
  });

  it("returns every problem rather than the first", () => {
    // W108's rule: a reviewer fixing one error per round stops reviewing carefully.
    const result = joinNetwork([], "", "", "not-a-date");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.sort()).toEqual([
      "date_missing_or_unreadable",
      "decider_missing",
      "practice_missing",
    ]);
  });

  it("refuses to join a practice that is already listed", () => {
    const result = joinNetwork([join("prac-1", "2026-03-01")], "prac-1", "m@a.example", "2026-04-01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["already_a_member"]);
    expect(JOIN_REFUSAL_COPY.already_a_member).toContain("could not see the first one");
  });

  it("refuses to remove a practice that is not listed", () => {
    const result = leaveNetwork([], "prac-1", "m@a.example", "2026-03-01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(["not_a_member"]);
  });
});

describe("W188 nothing infers membership from activity", () => {
  it("has no basis that is an observation rather than an act", () => {
    // W57's move, and the reason it matters more here: a derived register membership gives a
    // practice a wrong internal list; a derived DIRECTORY membership publishes their name in a
    // network they never joined. Guarantee-as-absence — the type has nowhere to put one.
    const bases = Object.keys(MEMBERSHIP_BASIS_COPY).sort();
    expect(bases).toEqual(["joined", "left"]);
  });

  it("exports no function that could derive a membership", () => {
    expect(Object.keys(mod).sort()).toEqual([
      "JOIN_REFUSAL_COPY",
      "MEMBERSHIP_BASIS_COPY",
      "REFUSED_BASES",
      "SHIPPED_MEMBERSHIPS",
      "currentMembers",
      "isMember",
      "joinNetwork",
      "leaveNetwork",
    ]);
    for (const name of Object.keys(mod)) {
      expect(name, `${name} sounds derived`).not.toMatch(/infer|derive|activity|score|rank|suggest/i);
    }
  });

  it("names each refused basis with the reason, as data a test can read", () => {
    for (const [basis, why] of Object.entries(REFUSED_BASES)) {
      expect(why.length, `${basis} is refused without a reason`).toBeGreaterThan(80);
    }
    expect(Object.keys(REFUSED_BASES)).toContain("referral_activity");
    expect(REFUSED_BASES.referral_activity).toMatch(/never joined/);
  });

  it("imports nothing from the referral rail, so it could not derive one if asked", () => {
    // Structural, not aspirational. The referral rail is right there and is exactly what a
    // derivation would read; this module cannot see it.
    const source = readFileSync(path.join(__dirname, "membership.ts"), "utf8");
    const imports = [...source.matchAll(/from "([^"]+)"/g)].map((m) => m[1]!);
    // Zero imports is the whole guarantee: a module that imports nothing cannot read the
    // referral rail, whatever anybody later decides membership ought to mean. Scanning the
    // source text for "referral" as well was the first version and it failed on this module's
    // OWN refusal — `REFUSED_BASES.referral_activity` explains why the rail is not a basis.
    // W184 hit the identical collision an hour earlier: a scan that cannot tell a refusal from
    // the thing refused fails on the sentence doing the refusing.
    expect(imports).toEqual([]);
    // Non-vacuous: the matcher does find an import when there is one.
    expect([...'import { x } from "@/referrals/store";'.matchAll(/from "([^"]+)"/g)]).toHaveLength(1);
  });

  it("ships nobody, because a network with members is a published network", () => {
    // G6, the same posture as SHIPPED_DIRECTORY_PROFILES.
    expect(SHIPPED_MEMBERSHIPS).toEqual([]);
    expect(currentMembers(SHIPPED_MEMBERSHIPS, "2026-12-31")).toEqual([]);
  });
});

describe("W188 leaving keeps history", () => {
  const history = [join("prac-1", "2026-01-01"), leave("prac-1", "2026-03-01")];

  it("a departure is a new event, not a deleted row", () => {
    expect(history).toHaveLength(2);
    expect(isMember(history, "prac-1", "2026-02-01")).toBe(true);
    expect(isMember(history, "prac-1", "2026-04-01")).toBe(false);
  });

  it("answers as at a date rather than only as at now", () => {
    // "Was in the network until March" is the fact an audit needs, and a deleted row cannot be
    // told from one that never existed.
    expect(isMember(history, "prac-1", "2025-12-31")).toBe(false);
    expect(isMember(history, "prac-1", "2026-01-01")).toBe(true);
  });

  it("a rejoining starts a new tenure rather than restoring the old one", () => {
    const rejoined = [...history, join("prac-1", "2026-06-01")];
    expect(currentMembers(rejoined, "2026-07-01")).toEqual([
      { practiceId: "prac-1", since: "2026-06-01", decidedBy: "manager@a.example" },
    ]);
  });

  it("W188 a join and a leave on the same day resolve to NOT a member, either way round", () => {
    // The tie declared in W167's register. Day-granular dates cannot order two decisions within
    // a day, so this is a decision about which way to be wrong: between "they joined" and "they
    // left", the safe reading is the one that does not publish a practice's name.
    const tied = [join("prac-1", "2026-03-01"), leave("prac-1", "2026-03-01")];
    const { stable, forward } = foldIsOrderIndependent(
      (events: readonly MembershipEvent[]) => isMember(events, "prac-1", "2026-03-02"),
      tied,
    );
    expect(stable).toBe(true);
    expect(forward).toBe(false);
    expect(foldIsOrderIndependent((e: readonly MembershipEvent[]) => currentMembers(e, "2026-03-02"), tied).stable).toBe(true);
  });
});

describe("W188 the list ranks nobody", () => {
  const history = [join("prac-c", "2026-01-01"), join("prac-a", "2026-02-01"), join("prac-b", "2026-03-01")];

  it("orders by practice id and by nothing else", () => {
    // Not by tenure, not by anything derived. W83 refused ranking clinicians internally and W184
    // refused comparative claims in copy; a membership list is where an order would read as an
    // endorsement by the network itself.
    expect(currentMembers(history, "2026-04-01").map((m) => m.practiceId)).toEqual([
      "prac-a",
      "prac-b",
      "prac-c",
    ]);
  });

  it("gives the same list whichever order the events arrive in", () => {
    expect(currentMembers([...history].reverse(), "2026-04-01")).toEqual(
      currentMembers(history, "2026-04-01"),
    );
  });

  it("carries no count, score or position on a membership", () => {
    const [first] = currentMembers(history, "2026-04-01");
    expect(Object.keys(first!).sort()).toEqual(["decidedBy", "practiceId", "since"]);
  });

  it("mentions no clinician anywhere — a network lists practices", () => {
    const source = readFileSync(path.join(__dirname, "membership.ts"), "utf8");
    expect(JSON.stringify(currentMembers(history, "2026-04-01"))).not.toMatch(/clinician/i);
    // The word appears in the module only inside the refusals that explain why it is absent.
    for (const line of source.split("\n").filter((l) => /clinician/i.test(l))) {
      expect(line, `unexpected clinician reference: ${line.trim()}`).toMatch(/W83|ranked|ranking/);
    }
  });
});
