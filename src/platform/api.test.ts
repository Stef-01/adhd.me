// W253 verify gate: the read surface cannot return another practice's data, and the assertion is
// the one Y4-1 should have had.
//
// WHAT Y4-1'S ASSERTION SHOULD HAVE BEEN IS THE WHOLE DESIGN OF THIS FILE. `Complaint.practiceId`
// existed from W43 and the reads were unscoped, and W206's diagnosis is the part that matters:
// "the readers were unscoped BECAUSE the writer was" — intake stamped a literal id no console
// mints, so every complaint belonged to nobody and a scoped read would have returned NOTHING. Two
// consequences for a test:
//
//   1. A test that asserts "the read takes a practice" would have passed throughout. The signature
//      was never the problem. So the sweep below seeds TWO practices with REAL data through the
//      real writers and asserts each caller sees only their own — which fails on an unscoped read
//      and equally on a writer that stamps the wrong id.
//   2. It runs over the WHOLE census rather than a sample. Y4-1 lived in one of several reads; a
//      spot check on the others would have reported the store clean.

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintLandingCopy } from "@/compliance/landing";
import { resetComplaints, submitComplaint } from "@/complaints/store";
import { onboardPractice, practicesFor, resetConsole } from "@/console/store";
import { PLATFORM_ENDPOINTS, REFUSED_READS } from "./api";
import { SCOPE_REFUSAL_COPY, resolveScope, type ScopedPractice } from "./scope";

const AT = "2026-08-21T00:00:00+10:00";
const ALICE = "alice@practice-a.test";
const BOB = "bob@practice-b.test";

/** Two practices, each with its own owner and its own complaints. Through the real writers. */
function seedTwoPractices(): { a: ScopedPractice; b: ScopedPractice } {
  resetConsole();
  resetComplaints();
  expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
  expect(onboardPractice({ name: "Practice B", timezone: "Australia/Perth", holdoutPercent: 20 }, AT, BOB)).toEqual({});

  const aId = practicesFor(ALICE)[0]!.practice.id as string;
  const bId = practicesFor(BOB)[0]!.practice.id as string;
  expect(aId, "the two practices got the same id — the fixture proves nothing").not.toBe(bId);

  // Different counts on purpose: equal counts would let a cross-practice read pass by coincidence.
  submitComplaint({ channel: "phone", summary: "A first complaint about timing", wantsOptOut: false }, AT, aId);
  submitComplaint({ channel: "phone", summary: "B first complaint about timing", wantsOptOut: false }, AT, bId);
  submitComplaint({ channel: "phone", summary: "B second complaint about timing", wantsOptOut: false }, AT, bId);
  submitComplaint({ channel: "phone", summary: "B third complaint about timing", wantsOptOut: false }, AT, bId);

  const a = resolveScope(ALICE, aId);
  const b = resolveScope(BOB, bId);
  expect(a.scoped && b.scoped, "the fixture could not resolve its own scopes").toBe(true);
  if (!a.scoped || !b.scoped) throw new Error("unreachable");
  return { a: a.scope, b: b.scope };
}

describe("W253 no endpoint returns another practice's data — over the census, not a sample", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("has a census with endpoints in it, so everything below is sweeping something", () => {
    expect(PLATFORM_ENDPOINTS.length).toBeGreaterThan(1);
    expect(new Set(PLATFORM_ENDPOINTS.map((e) => e.path)).size).toBe(PLATFORM_ENDPOINTS.length);
  });

  it("declares every endpoint the module defines — the direction a census usually forgets", () => {
    // BOTH DIRECTIONS, and this tree learned why three times in one day: W200 enforced modules and
    // not their exports, W106 found stores by a keyword that missed the module that mattered, W167
    // matched three fold shapes and missed a fourth. Every one checked the direction its author was
    // facing. So: nothing declared that has gone (the census is the list, and every entry is
    // exercised by the sweeps below), and nothing DEFINED here that is missing from the census.
    const source = readFileSync(path.join(__dirname, "api.ts"), "utf8");
    const defined = [...source.matchAll(/^const (\w+): PlatformEndpoint = \{/gm)].map((m) => m[1]!);
    expect(defined.length, "the scanner found no endpoint definitions at all").toBeGreaterThan(1);
    const censusBody = source.slice(source.indexOf("export const PLATFORM_ENDPOINTS"));
    for (const name of defined) {
      expect(censusBody, `${name} is defined and not in PLATFORM_ENDPOINTS`).toContain(name);
    }
    expect(defined.length, "an endpoint is defined but not declared").toBe(PLATFORM_ENDPOINTS.length);
  });

  it("gives each caller their own practice's answers and never the other's", () => {
    const { a, b } = seedTwoPractices();
    for (const endpoint of PLATFORM_ENDPOINTS) {
      const forA = endpoint.read(a);
      const forB = endpoint.read(b);
      // Every endpoint carries the practice it answered for, and it is the one asked about.
      expect(forA.practiceId, endpoint.path).toBe(a.practiceId as string);
      expect(forB.practiceId, endpoint.path).toBe(b.practiceId as string);
      // And no value in A's answer mentions B's id, however it got there.
      expect(JSON.stringify(forA), `${endpoint.path} leaked the other practice's id`).not.toContain(
        b.practiceId as string,
      );
      expect(JSON.stringify(forB), endpoint.path).not.toContain(a.practiceId as string);
    }
  });

  it("counts only its own rows — the assertion that catches an unscoped read", () => {
    // THE ONE Y4-1 NEEDED. A is seeded with one complaint and B with three, so an unscoped read
    // returns four for both and the difference is visible. Equal counts would hide it.
    const { a, b } = seedTwoPractices();
    const summary = PLATFORM_ENDPOINTS.find((e) => e.path === "/v1/complaints/summary")!;
    expect(summary.read(a).total, "A saw more than its own complaints").toBe(1);
    expect(summary.read(b).total).toBe(3);
  });

  it("catches a writer that stamps the wrong practice, which is how Y4-1 actually happened", () => {
    // The half a signature check cannot see. Here the WRITER is given B's id while A's caller
    // reads: the read is perfectly scoped and the row is simply in the wrong place. A test that
    // only checked "the read takes a practice" passes; this one does not.
    const { a, b } = seedTwoPractices();
    const summary = PLATFORM_ENDPOINTS.find((e) => e.path === "/v1/complaints/summary")!;
    const before = summary.read(a).total;
    submitComplaint(
      { channel: "phone", summary: "This one is really A's but gets stamped B", wantsOptOut: false },
      AT,
      b.practiceId as string,
    );
    // A's count does not move, because the row went to B — which is the correct behaviour of the
    // READ and the reason a misdirected write is invisible to it. The count that moves is B's.
    expect(summary.read(a).total).toBe(before);
    expect(summary.read(b).total).toBe(4);
  });

  it("returns nothing at all for a practice that holds no rows, rather than everything", () => {
    // The failure shape W206 describes: with a literal id, every row belonged to nobody, so an
    // honest scoped read returned zero and somebody "fixed" it by unscoping. A zero here is the
    // right answer and this test exists so that nobody reads it as a broken endpoint.
    resetConsole();
    resetComplaints();
    expect(onboardPractice({ name: "Lonely Practice", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
    const only = resolveScope(ALICE, practicesFor(ALICE)[0]!.practice.id as string);
    expect(only.scoped).toBe(true);
    if (!only.scoped) return;
    const summary = PLATFORM_ENDPOINTS.find((e) => e.path === "/v1/complaints/summary")!;
    expect(summary.read(only.scope).total).toBe(0);
  });
});

describe("W253 a practice id from the caller is a request, not an authorisation", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("refuses a practice the caller does not hold", () => {
    const { b } = seedTwoPractices();
    const result = resolveScope(ALICE, b.practiceId as string);
    expect(result.scoped, "Alice resolved a scope for Bob's practice").toBe(false);
    if (result.scoped) return;
    expect(result.why).toBe("not_a_member");
  });

  it("says the same thing whether the practice exists or not", () => {
    // A refusal that distinguished them would answer questions about other practices to anybody
    // willing to ask repeatedly.
    seedTwoPractices();
    const real = resolveScope(ALICE, "prac-2");
    const imaginary = resolveScope(ALICE, "prac-99999");
    expect(real.scoped).toBe(false);
    expect(imaginary.scoped).toBe(false);
    if (real.scoped || imaginary.scoped) return;
    expect(real.why).toBe(imaginary.why);
    expect(real.copy).toBe(imaginary.copy);
  });

  it("never defaults to the caller's only practice", () => {
    // Defaulting is how a read acquires an answer that changes the day somebody joins a second
    // practice — and the caller relying on it never finds out.
    resetConsole();
    expect(onboardPractice({ name: "Only Practice", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
    expect(practicesFor(ALICE).length, "the fixture gave Alice more than one practice").toBe(1);
    for (const nothing of [null, undefined, "", "   "]) {
      const result = resolveScope(ALICE, nothing);
      expect(result.scoped, `resolved a scope from ${JSON.stringify(nothing)}`).toBe(false);
      if (result.scoped) continue;
      expect(result.why).toBe("no_practice_requested");
    }
  });

  it("distinguishes holding nothing from being refused a particular practice", () => {
    seedTwoPractices();
    const stranger = resolveScope("nobody@nowhere.test", "prac-1");
    expect(stranger.scoped).toBe(false);
    if (stranger.scoped) return;
    expect(stranger.why).toBe("caller_holds_nothing");
  });

  it("cannot be constructed without the resolver, which is the actual guarantee", () => {
    // The brand is not exported, so `{ practiceId, callerEmail }` is not a `ScopedPractice` and an
    // endpoint cannot be called with one. Asserted against the module's SOURCE, because the type
    // error this prevents cannot be written down in a runtime test — writing it would fail the
    // typecheck, which is the property working.
    const source = readFileSync(path.join(__dirname, "scope.ts"), "utf8");
    expect(source).toContain("declare const scopeBrand: unique symbol");
    expect(source, "the brand is exported — anybody can mint a scope").not.toMatch(
      /export\s+(const|declare const)\s+scopeBrand/,
    );
    // And exactly one place CONSTRUCTS one. The first version of this counted `scoped: true`,
    // which matches the result type's own declaration as well as the return — a guard firing on
    // the shape of the thing it guards, which is the fourth time this tree has hit that. The cast
    // is the construction, so the cast is what is counted.
    const constructions = source.match(/as unknown as ScopedPractice/g) ?? [];
    expect(constructions.length, "more than one place constructs a scope").toBe(1);
    // Non-vacuity: a pattern matching nothing would make the assertion above unfalsifiable in the
    // direction that matters, so the construction is confirmed to be inside the resolver.
    expect(source.slice(source.indexOf("export function resolveScope"))).toContain(
      "as unknown as ScopedPractice",
    );
  });
});

describe("W253 the surface is read-only and holds no patient identity", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("returns no patient identity from any endpoint", () => {
    // Seeded WITH a patient id attached to a complaint, so the sweep has something to find. A
    // sweep over data containing no patients proves nothing about whether patients would leak.
    resetConsole();
    resetComplaints();
    expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
    const aId = practicesFor(ALICE)[0]!.practice.id as string;
    submitComplaint(
      { channel: "sms_reply", summary: "Do not message me again", patientId: "pat-secret-1", wantsOptOut: true },
      AT,
      aId,
    );
    const scope = resolveScope(ALICE, aId);
    expect(scope.scoped).toBe(true);
    if (!scope.scoped) return;
    for (const endpoint of PLATFORM_ENDPOINTS) {
      const body = JSON.stringify(endpoint.read(scope.scope));
      expect(body, `${endpoint.path} returned a patient id`).not.toContain("pat-secret-1");
      expect(body, `${endpoint.path} returned complaint text`).not.toContain("Do not message me again");
    }
  });

  it("returns only scalars, so a future field cannot smuggle a row in", () => {
    const { a } = seedTwoPractices();
    for (const endpoint of PLATFORM_ENDPOINTS) {
      for (const [key, value] of Object.entries(endpoint.read(a))) {
        expect(
          ["number", "string", "boolean"].includes(typeof value) || value === null,
          `${endpoint.path}.${key} is not a scalar — a nested value is a row`,
        ).toBe(true);
      }
    }
  });

  it("reaches no writer, checked against the module's source", () => {
    const source = readFileSync(path.join(__dirname, "api.ts"), "utf8");
    const code = source
      .split("\n")
      .filter((line) => {
        const trimmed = line.trimStart();
        return !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
      })
      .join("\n");
    expect(code, "the comment stripper removed the code too").toContain("PLATFORM_ENDPOINTS");
    // The writers in the stores this module reads from. "It only has getters" is true until
    // somebody adds one, so the names are checked rather than the intent.
    for (const writer of [
      "submitComplaint",
      "onboardPractice",
      "updateRules",
      "saveClinicians",
      "saveSessionConfig",
      "completeSetup",
      "resolveInStore",
      "triageInStore",
      "scrubPatientFromComplaints",
    ]) {
      expect(code, `${writer} is reachable from a read-only surface`).not.toContain(writer);
    }
  });

  it("says what it refuses to answer, with a reason, as data rather than documentation", () => {
    expect(REFUSED_READS.length).toBeGreaterThan(3);
    for (const refused of REFUSED_READS) {
      expect(refused.why.length, `${refused.what} is refused without a reason`).toBeGreaterThan(80);
    }
    // The gates are named where they apply, so a reader can check the claim rather than believe it.
    expect(REFUSED_READS.some((r) => r.why.includes("G2"))).toBe(true);
  });

  it("passes the tree's linters on everything it says", () => {
    for (const endpoint of PLATFORM_ENDPOINTS) {
      expect(lintLandingCopy(endpoint.summary), endpoint.path).toEqual([]);
    }
    for (const copy of Object.values(SCOPE_REFUSAL_COPY)) {
      expect(lintLandingCopy(copy)).toEqual([]);
    }
  });
});
