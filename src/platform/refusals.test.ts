// W255 verify gate: every refusal branch, discovered by exercising the lane, carries nothing from
// the request.
//
// THE GATE SAYS "OVER EVERY REFUSAL BRANCH RATHER THAN SAMPLED", so the branches cannot be a list
// in this file. A test checking the refusals its author remembered is a sample whatever it is
// called, and the branch that leaks will be the one added after the test was written. So the sweep
// DISCOVERS them: it drives the real functions into every refusal they can produce and works with
// what comes out, and a both-directions check fails when the discovered set and the declared set
// disagree in either direction.
//
// AND THE PROPERTY IS THE STRONG ONE. "No patient data in refusals" is easy to pass and does not
// catch the failure that matters: a refusal that ECHOES the request leaks whatever the caller put
// in the field, which on a public API is whatever an attacker chose to put there — the product did
// not put a patient id in the error, the caller did, and the product handed it back. The property
// asserted here is that a refusal is BYTE-IDENTICAL for a reason whatever it was called with,
// which subsumes both and holds against inputs nobody thought of.

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { lintLandingCopy } from "@/compliance/landing";
import { resetComplaints, submitComplaint } from "@/complaints/store";
import { onboardPractice, practicesFor, resetConsole } from "@/console/store";
import { PLATFORM_ENDPOINTS } from "./api";
import { resolveScope } from "./scope";
import { ALL_API_SCOPES, authoriseRead, type ApiGrant, type ApiScope } from "./scopes";
import {
  ALL_PLATFORM_REFUSALS,
  MUST_NOT_DISCLOSE_EXISTENCE,
  PLATFORM_REFUSALS,
  refuse,
  type PlatformRefusal,
} from "./refusals";

const AT = "2026-08-21T00:00:00+10:00";
const ALICE = "alice@practice-a.test";
const BOB = "bob@practice-b.test";

/**
 * Inputs chosen to be the worst thing a caller could put in a field.
 *
 * A patient id, because that is the thing this tree must never reflect. A script tag and a path
 * traversal, because a refusal that echoes any of them echoes all of them — the distinction
 * between "leaks patient data" and "reflects input" is one the attacker chooses, not the product.
 * A very long string, because truncation is a common way an echo survives review. And a terminal
 * escape, because a refusal reaches logs and support consoles as often as it reaches a client.
 */
const HOSTILE = [
  "pat-88213",
  "<script>alert(1)</script>",
  "../../etc/passwd",
  "x".repeat(400),
  "prac-1' OR '1'='1",
  "[31mred",
];

function seed(): { aliceId: string; bobId: string } {
  resetConsole();
  resetComplaints();
  expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
  expect(onboardPractice({ name: "Practice B", timezone: "Australia/Perth", holdoutPercent: 20 }, AT, BOB)).toEqual({});
  const aliceId = practicesFor(ALICE)[0]!.practice.id as string;
  const bobId = practicesFor(BOB)[0]!.practice.id as string;
  submitComplaint({ channel: "phone", summary: "A complaint about appointment timing", wantsOptOut: false }, AT, aliceId);
  return { aliceId, bobId };
}

/**
 * Every refusal the lane actually produces, by driving the real functions into each branch.
 *
 * Not a list of reasons — a list of `{reason, copy}` that came OUT of `resolveScope` and
 * `authoriseRead`. If a branch stops being reachable, or a new one appears, this changes and the
 * both-directions check below fails.
 */
function producedRefusals(): { reason: string; copy: string }[] {
  const { aliceId, bobId } = seed();
  const out: { reason: string; copy: string }[] = [];

  const collectScope = (email: string, requested: string | null) => {
    const result = resolveScope(email, requested);
    if (!result.scoped) out.push({ reason: result.why, copy: result.copy });
  };
  collectScope(ALICE, null);
  collectScope("nobody@nowhere.test", aliceId);
  collectScope(ALICE, bobId);
  // AND THE HOSTILE CORPUS, because discovery is only as good as its drivers. A seeded existence
  // oracle escaped this sweep once: the seed only fired on an id that did NOT look like a practice
  // id, and every driver here supplied one that did. A branch reachable only by inputs nobody
  // thought to try is a branch this file cannot see, so the drivers include the ugly ones.
  for (const hostile of HOSTILE) {
    collectScope(ALICE, hostile);
    collectScope(hostile, aliceId);
    collectScope("nobody@nowhere.test", hostile);
  }

  const alice = resolveScope(ALICE, aliceId);
  if (!alice.scoped) throw new Error("fixture could not resolve Alice");
  const grant = (email: string, scopes: readonly ApiScope[]): ApiGrant => ({ callerEmail: email, scopes });
  const collectGrant = (g: ApiGrant | null, required: ApiScope) => {
    const result = authoriseRead(alice.scope, g, required);
    if (!result.authorised) out.push({ reason: result.why, copy: result.copy });
  };
  collectGrant(null, "practice:read");
  collectGrant(grant(BOB, [...ALL_API_SCOPES]), "practice:read");
  collectGrant(grant(ALICE, ["practice:read"]), "complaints:read");

  return out;
}

describe("W255 the branches are discovered, not listed", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("produces a refusal for every declared reason", () => {
    const produced = new Set(producedRefusals().map((r) => r.reason));
    expect(produced.size, "the sweep drove no branches at all").toBeGreaterThan(4);
    for (const declared of ALL_PLATFORM_REFUSALS) {
      expect(produced.has(declared), `${declared} is declared and no code path produces it`).toBe(true);
    }
  });

  it("declares every reason it produces", () => {
    // THE OTHER DIRECTION, which is where a new branch slips past. Three registers in this
    // session's work failed in exactly the direction their author was not facing.
    const declared = new Set<string>(ALL_PLATFORM_REFUSALS);
    for (const { reason } of producedRefusals()) {
      expect(declared.has(reason), `${reason} is produced and not declared in PLATFORM_REFUSALS`).toBe(true);
    }
  });

  it("carries the copy from the module that owns it rather than restating it", () => {
    // A second wording of one refusal is a second thing to keep in step, and the copy is always
    // what drifts (W177). The register's value must BE the producing module's value.
    for (const { reason, copy } of producedRefusals()) {
      expect(copy, `${reason}: the register's copy differs from what the lane produced`).toBe(
        PLATFORM_REFUSALS[reason as PlatformRefusal],
      );
    }
  });
});

describe("W255 a refusal carries nothing from the request", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("returns byte-identical copy for a reason whatever it was called with", () => {
    // THE LOAD-BEARING TEST. Stronger than "contains no patient id" and it holds against inputs
    // nobody thought of: if the answer cannot vary with the argument, it cannot carry the argument.
    const { aliceId } = seed();
    const baseline = new Map<string, string>();
    const record = (reason: string, copy: string) => {
      const seen = baseline.get(reason);
      if (seen === undefined) baseline.set(reason, copy);
      else expect(copy, `${reason} varies with its input`).toBe(seen);
    };

    for (const hostile of HOSTILE) {
      // Tenancy: a hostile practice id, from a caller who holds something and one who holds nothing.
      for (const email of [ALICE, "nobody@nowhere.test"]) {
        const result = resolveScope(email, hostile);
        expect(result.scoped, `${hostile} resolved a scope`).toBe(false);
        if (result.scoped) continue;
        record(result.why, result.copy);
      }
      // And a hostile CALLER identity, which is the field an attacker controls on a public API.
      const asHostile = resolveScope(hostile, aliceId);
      expect(asHostile.scoped).toBe(false);
      if (!asHostile.scoped) record(asHostile.why, asHostile.copy);
    }

    const alice = resolveScope(ALICE, aliceId);
    if (!alice.scoped) throw new Error("fixture could not resolve Alice");
    for (const hostile of HOSTILE) {
      const result = authoriseRead(alice.scope, { callerEmail: hostile, scopes: [...ALL_API_SCOPES] }, "practice:read");
      expect(result.authorised, `${hostile} authorised a read`).toBe(false);
      if (!result.authorised) record(result.why, result.copy);
    }

    expect(baseline.size, "no refusals were recorded — the loop above ran empty").toBeGreaterThan(2);
  });

  it("never contains anything the caller sent, over every branch and every hostile input", () => {
    // The direct form of the same property, kept because it names the failure a reader recognises.
    const { aliceId, bobId } = seed();
    const everything: string[] = [];
    for (const hostile of HOSTILE) {
      for (const email of [ALICE, hostile, "nobody@nowhere.test"]) {
        const result = resolveScope(email, hostile);
        if (!result.scoped) everything.push(result.copy);
      }
    }
    const alice = resolveScope(ALICE, aliceId);
    if (!alice.scoped) throw new Error("fixture");
    for (const hostile of HOSTILE) {
      const result = authoriseRead(alice.scope, { callerEmail: hostile, scopes: [] }, "practice:read");
      if (!result.authorised) everything.push(result.copy);
    }
    expect(everything.length, "nothing was collected — the assertion below is vacuous").toBeGreaterThan(10);
    const joined = everything.join("\n");
    for (const hostile of [...HOSTILE, aliceId, bobId, ALICE, BOB]) {
      expect(joined, `a refusal echoed ${JSON.stringify(hostile.slice(0, 30))}`).not.toContain(hostile);
    }
  });

  it("takes the reason and nothing else, so there is no request in scope to echo", () => {
    // The structural half. `refuse` has one parameter and no `detail` — a much stronger position
    // than remembering not to interpolate one, and the reason the function exists at all rather
    // than each caller formatting its own refusal.
    const source = readFileSync(path.join(__dirname, "refusals.ts"), "utf8");
    expect(source).toMatch(/export function refuse\(reason: PlatformRefusal\)/);
    for (const reason of ALL_PLATFORM_REFUSALS) {
      expect(refuse(reason).copy).toBe(PLATFORM_REFUSALS[reason]);
    }
    // And no copy in the register is a template.
    for (const [reason, copy] of Object.entries(PLATFORM_REFUSALS)) {
      expect(copy, `${reason} is a template — it can be filled with a request`).not.toMatch(/\$\{|%s|\{\{/);
    }
  });

  it("returns no patient identity even when a patient is in the data", () => {
    // The obvious property, asserted with a patient deliberately present so it is not vacuous.
    resetConsole();
    resetComplaints();
    expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
    const aliceId = practicesFor(ALICE)[0]!.practice.id as string;
    submitComplaint(
      { channel: "sms_reply", summary: "Do not message me again", patientId: "pat-secret-9", wantsOptOut: true },
      AT,
      aliceId,
    );
    for (const copy of Object.values(PLATFORM_REFUSALS)) {
      expect(copy).not.toContain("pat-secret-9");
      expect(copy).not.toMatch(/\bpat-\w+/);
    }
  });
});

describe("W255 a refusal discloses no existence", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("answers identically for a practice that exists and one that does not", () => {
    // THE FIRST VERSION OF THIS TEST COMPARED TWO IDS THAT BOTH LOOKED LIKE PRACTICE IDS, and a
    // seeded existence oracle walked straight past it — the seed distinguished ids by SHAPE, and
    // both fixtures had the same shape. So the ids compared here differ in every way a real
    // implementation might branch on: one exists and is held by somebody else, one is well-formed
    // and does not exist, one is not even shaped like an id, and one is empty-ish.
    const { bobId } = seed();
    const candidates = [
      bobId, // exists, held by Bob
      "prac-99999", // well-formed, does not exist
      "not-a-practice-id-at-all", // wrong shape entirely
      "prac-", // the prefix and nothing else
      "PRAC-2", // right id, wrong case
    ];
    const answers = candidates.map((id) => {
      const result = resolveScope(ALICE, id);
      expect(result.scoped, `${id} resolved a scope for Alice`).toBe(false);
      return result.scoped ? null : { why: result.why, copy: result.copy };
    });
    const distinct = new Set(answers.map((a) => JSON.stringify(a)));
    expect(
      distinct.size,
      `refusals differ across ids that Alice cannot read: ${[...distinct].join(" | ")} — that is an existence oracle`,
    ).toBe(1);
  });

  it("declares which branches must not disclose existence, and why", () => {
    expect(MUST_NOT_DISCLOSE_EXISTENCE.length).toBeGreaterThan(1);
    for (const pair of MUST_NOT_DISCLOSE_EXISTENCE) {
      expect(ALL_PLATFORM_REFUSALS, `${pair.reason} is declared and is not a refusal`).toContain(pair.reason);
      expect(
        pair.wouldOtherwiseReveal.length,
        `${pair.reason} does not say what it would otherwise reveal`,
      ).toBeGreaterThan(80);
    }
  });

  it("refuses a read whole rather than narrowing it", () => {
    // Narrowing is the subtler oracle: returning a smaller payload with the ungranted fields
    // missing lets a caller map the surface by watching which fields disappear.
    const { aliceId } = seed();
    const alice = resolveScope(ALICE, aliceId);
    if (!alice.scoped) throw new Error("fixture");
    const result = authoriseRead(alice.scope, { callerEmail: ALICE, scopes: ["practice:read"] }, "complaints:read");
    expect(result.authorised).toBe(false);
    if (result.authorised) return;
    // A refusal, not a partial answer: the result carries no data field at all.
    expect(Object.keys(result).sort()).toEqual(["authorised", "copy", "why"]);
  });

  it("says the same thing about a practice that holds no rows as one that does", () => {
    // The count endpoints answer zero for an empty practice rather than refusing, which is W253's
    // position — a zero is the right answer and must not become a refusal that reveals emptiness.
    const { aliceId, bobId } = seed();
    const alice = resolveScope(ALICE, aliceId);
    const bob = resolveScope(BOB, bobId);
    if (!alice.scoped || !bob.scoped) throw new Error("fixture");
    const summary = PLATFORM_ENDPOINTS.find((e) => e.path === "/v1/complaints/summary")!;
    expect(summary.read(alice.scope).total).toBe(1);
    expect(summary.read(bob.scope).total).toBe(0);
    // Same shape both times: emptiness is a value, never a different kind of answer.
    expect(Object.keys(summary.read(alice.scope)).sort()).toEqual(
      Object.keys(summary.read(bob.scope)).sort(),
    );
  });

  it("passes the tree's linters on every refusal it can produce", () => {
    for (const [reason, copy] of Object.entries(PLATFORM_REFUSALS)) {
      expect(lintLandingCopy(copy), reason).toEqual([]);
    }
  });
});
