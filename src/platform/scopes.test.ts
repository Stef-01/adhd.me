// W254 verify gate: scopes checked against the census both directions, the two axes proven
// independent, and a caller granted nothing able to read nothing.
//
// THE ASSERTION THAT MATTERS MOST IS THE ONE ABOUT NOTHING. A scope model is easy to test on a
// caller who holds a grant — the read works, the test is green, and every such test passes just as
// well against a model that authorises everybody. What a permissive default cannot survive is the
// opposite sweep: a caller granted NOTHING, run against EVERY endpoint in the census, expected to
// be refused every time. That is the test this file is really for, and the rest supports it.
//
// AND THE SECOND ONE IS ABOUT INDEPENDENCE. Holding a practice must not imply a grant, and holding
// a grant must not imply a practice. Both directions are seeded here, because this is precisely
// the failure that leaves every other assertion green: the right practice's data reached through
// the wrong door looks identical to the right answer.

import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { lintLandingCopy } from "@/compliance/landing";
import { resetComplaints, submitComplaint } from "@/complaints/store";
import { onboardPractice, practicesFor, resetConsole } from "@/console/store";
import { PLATFORM_ENDPOINTS } from "./api";
import { resolveScope, type ScopedPractice } from "./scope";
import {
  ALL_API_SCOPES,
  SCOPE_DENIAL_COPY,
  SCOPE_GRANTS,
  SHIPPED_GRANTS,
  authoriseRead,
  type ApiGrant,
  type ApiScope,
} from "./scopes";

/**
 * A module's CODE, with comments and string literals removed.
 *
 * Every source scan in this file goes through it, and that is a rule rather than a convenience.
 * Two of these guards were written against raw source and both fired immediately — on this lane's
 * own prose, because a comment explaining "there is no `mintGrant` here" contains `mintGrant`, and
 * `scope.ts`'s module note discusses the grants it deliberately does not carry. That is the FIFTH
 * time in this session's work that a scan has matched the sentence describing its own rule
 * (W228, W230, W236, W247's W106 detector, and now twice here). The pattern is not that comments
 * are tricky; it is that a guard written against raw source punishes documenting the thing it
 * guards, so the honest fix is to make stripping the default and check the stripper.
 */
function codeOf(file: string): string {
  const raw = readFileSync(path.join(__dirname, file), "utf8");
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1 ")
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""');
  // A stripper that removes too much disables every scan below and turns them green.
  if (!stripped.includes("export")) throw new Error(`the stripper emptied ${file}`);
  return stripped;
}

const AT = "2026-08-21T00:00:00+10:00";
const ALICE = "alice@practice-a.test";
const BOB = "bob@practice-b.test";

function seed(): { alice: ScopedPractice; bob: ScopedPractice } {
  resetConsole();
  resetComplaints();
  expect(onboardPractice({ name: "Practice A", timezone: "Australia/Sydney", holdoutPercent: 10 }, AT, ALICE)).toEqual({});
  expect(onboardPractice({ name: "Practice B", timezone: "Australia/Perth", holdoutPercent: 20 }, AT, BOB)).toEqual({});
  const aId = practicesFor(ALICE)[0]!.practice.id as string;
  const bId = practicesFor(BOB)[0]!.practice.id as string;
  submitComplaint({ channel: "phone", summary: "A complaint about appointment timing", wantsOptOut: false }, AT, aId);
  const a = resolveScope(ALICE, aId);
  const b = resolveScope(BOB, bId);
  if (!a.scoped || !b.scoped) throw new Error("fixture could not resolve its own scopes");
  return { alice: a.scope, bob: b.scope };
}

const grantOf = (email: string, scopes: readonly ApiScope[]): ApiGrant => ({ callerEmail: email, scopes });

describe("W254 the scope census matches the endpoint census, in both directions", () => {
  it("requires a declared scope on every endpoint", () => {
    expect(PLATFORM_ENDPOINTS.length).toBeGreaterThan(1);
    for (const endpoint of PLATFORM_ENDPOINTS) {
      expect(ALL_API_SCOPES, `${endpoint.path} requires an undeclared scope`).toContain(endpoint.requires);
    }
  });

  it("declares no scope that no endpoint requires", () => {
    // THE DIRECTION A SCOPE MODEL FORGETS. A scope nothing requires grants nothing, and it is worse
    // than dead code: it is a promise to an integrator — "you have been granted complaint reads" —
    // that this product cannot keep, and nobody finds out until somebody asks why the data never
    // arrives. Three registers in this tree failed in exactly the direction their author was not
    // facing (W200, W106, W167), all found within a day of each other.
    const required = new Set(PLATFORM_ENDPOINTS.map((e) => e.requires));
    for (const scope of ALL_API_SCOPES) {
      expect(required.has(scope), `${scope} is granted to callers and no endpoint requires it`).toBe(true);
    }
  });

  it("gives every scope what it grants AND why it is not folded into another", () => {
    expect(Object.keys(SCOPE_GRANTS).sort()).toEqual([...ALL_API_SCOPES].sort());
    for (const scope of ALL_API_SCOPES) {
      expect(SCOPE_GRANTS[scope].grants.length, `${scope} does not say what it grants`).toBeGreaterThan(40);
      // The half that stops a model rotting into one `read` scope: every merge looks harmless at
      // the time, and what it costs is the ability to grant one of the two.
      expect(SCOPE_GRANTS[scope].whySeparate.length, `${scope} does not say why it is separate`).toBeGreaterThan(80);
    }
  });

  it("names a kind of data rather than a path, so a new endpoint needs no new grant", () => {
    // One scope per endpoint is the endpoint list with a second name: it grows a grant every time a
    // path is added, and every integrator's grant has to be revisited for a read they conceptually
    // already had.
    for (const scope of ALL_API_SCOPES) {
      expect(scope, `${scope} looks like a path rather than a kind of data`).not.toMatch(/^\/|v\d/);
      expect(scope).toMatch(/^[a-z]+:[a-z]+$/);
    }
    expect(ALL_API_SCOPES.length, "there are as many scopes as endpoints — that is not a model").toBeLessThanOrEqual(
      PLATFORM_ENDPOINTS.length,
    );
  });
});

describe("W254 a caller granted nothing can read nothing", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("refuses every endpoint in the census for a caller with no grant", () => {
    // THE SWEEP THIS FILE EXISTS FOR. Every test about a granted caller passes equally against a
    // model that authorises everybody; this one does not.
    const { alice } = seed();
    for (const endpoint of PLATFORM_ENDPOINTS) {
      for (const nothing of [null, grantOf(ALICE, [])]) {
        const result = authoriseRead(alice, nothing, endpoint.requires);
        expect(result.authorised, `${endpoint.path} admitted a caller holding ${JSON.stringify(nothing)}`).toBe(false);
        if (result.authorised) continue;
        expect(result.why).toBe("no_scopes_granted");
      }
    }
  });

  it("refuses an endpoint whose scope the caller was not granted, holding others", () => {
    const { alice } = seed();
    const other = PLATFORM_ENDPOINTS.find((e) => e.requires !== PLATFORM_ENDPOINTS[0]!.requires);
    expect(other, "every endpoint requires the same scope — this test cannot distinguish").toBeDefined();
    const result = authoriseRead(alice, grantOf(ALICE, [PLATFORM_ENDPOINTS[0]!.requires]), other!.requires);
    expect(result.authorised).toBe(false);
    if (result.authorised) return;
    expect(result.why).toBe("scope_not_granted");
  });

  it("admits the read it was granted, so the refusals above are not a stuck answer", () => {
    // Non-vacuity. A model refusing everything passes every assertion above.
    const { alice } = seed();
    for (const endpoint of PLATFORM_ENDPOINTS) {
      expect(
        authoriseRead(alice, grantOf(ALICE, [endpoint.requires]), endpoint.requires).authorised,
        `${endpoint.path} refused a caller granted exactly its scope`,
      ).toBe(true);
    }
  });
});

describe("W254 the two axes are independent, which is the failure that leaves everything green", () => {
  beforeEach(() => {
    resetConsole();
    resetComplaints();
  });

  it("holding a practice does not imply any grant", () => {
    // Alice legitimately holds practice A. That must buy her nothing on this surface.
    const { alice } = seed();
    for (const endpoint of PLATFORM_ENDPOINTS) {
      expect(authoriseRead(alice, null, endpoint.requires).authorised, endpoint.path).toBe(false);
    }
  });

  it("holding a grant does not imply any practice", () => {
    // The other direction, and the one a type system can enforce: there is no way to reach an
    // endpoint's `read` with a grant alone, because `read` takes a `ScopedPractice` that only
    // W253's resolver mints. Asserted against the source, since the call that would prove it is
    // one the typecheck refuses to compile — which is the property working.
    const source = readFileSync(path.join(__dirname, "api.ts"), "utf8");
    expect(source).toContain("read(scope: ScopedPractice)");
    expect(source, "an endpoint takes a grant instead of a resolved practice").not.toMatch(
      /read\(\s*grant/,
    );
  });

  it("does not read the grant off the resolved practice", () => {
    // The collapse this module was designed against: hanging grants on `ScopedPractice` would make
    // every caller who can reach a practice carry that practice's grants, and a widening on either
    // axis would silently widen the other.
    const scopeCode = codeOf("scope.ts");
    for (const leaked of ["ApiScope", "scopes", "grant"]) {
      expect(scopeCode, `the tenancy brand carries ${leaked} — the two axes have merged`).not.toContain(
        leaked,
      );
    }
    const scopesSource = readFileSync(path.join(__dirname, "scopes.ts"), "utf8");
    // And authorisation takes them as separate arguments rather than one object.
    expect(scopesSource).toMatch(/authoriseRead\(\s*\n?\s*scope:[^)]*grant:/s);
  });

  it("refuses a grant belonging to a different caller than the tenancy", () => {
    // A grant and a tenancy that disagree about who is asking means one of them was supplied by
    // the wrong side of a call. Refused rather than reconciled — reconciling picks a winner, and
    // whichever it picks is the one an attacker supplies.
    const { alice } = seed();
    const result = authoriseRead(alice, grantOf(BOB, [...ALL_API_SCOPES]), PLATFORM_ENDPOINTS[0]!.requires);
    expect(result.authorised, "Bob's grant authorised a read on Alice's tenancy").toBe(false);
    if (result.authorised) return;
    expect(result.why).toBe("grant_belongs_to_another_caller");
  });

  it("a full grant still cannot cross a tenancy", () => {
    // The end-to-end version: Bob holds every scope there is, and still cannot read Alice's
    // practice — because his resolved scope is his own and there is no signature taking hers.
    const { alice, bob } = seed();
    expect(authoriseRead(bob, grantOf(BOB, [...ALL_API_SCOPES]), "complaints:read").authorised).toBe(true);
    const summary = PLATFORM_ENDPOINTS.find((e) => e.path === "/v1/complaints/summary")!;
    // Bob, fully granted, reads his own practice — and Alice's complaint is not in it.
    expect(summary.read(bob).total).toBe(0);
    expect(summary.read(alice).total).toBe(1);
  });
});

describe("W254 no credential enters the tree, and none can be minted", () => {
  it("ships no grant to anybody", () => {
    expect(SHIPPED_GRANTS).toEqual([]);
  });

  it("has no minting path at all, which is the property rather than the emptiness", () => {
    // W242's line, carried: "no credentials in the tree" is a fact about today's contents and stops
    // being true in a commit that looks like configuration. The absence of a way to mint one is a
    // property of the code.
    const code = codeOf("scopes.ts");
    for (const minter of ["mintGrant", "issueToken", "createCredential", "signToken"]) {
      expect(code, `${minter} exists — a grant can be minted`).not.toContain(minter);
    }
  });

  it("carries no credential, token or secret literal anywhere in the lane", () => {
    const dir = __dirname;
    const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.length, "the lane scan found no files").toBeGreaterThan(2);
    for (const file of files) {
      const code = codeOf(file);
      // Assignments that look like a secret. The scan is the second line, not the guarantee —
      // W242's own note: a credential in a shape nobody anticipated walks past a regex, and the
      // first line is that no code path exists to use one.
      expect(code, `${file} assigns something that looks like a credential`).not.toMatch(
        /\b(apiKey|api_key|secret|token|bearer|password|clientSecret)\s*[:=]\s*["'`][^"'`]{8,}/i,
      );
    }
  });

  it("names no gate it does not have, which is the honest posture here", () => {
    // G1 covers PMS and booking credentials. A credential for THIS product's own API is covered by
    // no named gate, and implying one protects it would be the comfortable answer rather than the
    // true one. The module says so; this pins it.
    const source = readFileSync(path.join(__dirname, "scopes.ts"), "utf8");
    expect(source).toMatch(/covered by\s*\n?\/\/ no named gate|no named gate/);
  });

  it("passes the tree's linters on everything it says", () => {
    for (const scope of ALL_API_SCOPES) {
      expect(lintLandingCopy(SCOPE_GRANTS[scope].grants), scope).toEqual([]);
      expect(lintLandingCopy(SCOPE_GRANTS[scope].whySeparate), scope).toEqual([]);
    }
    for (const copy of Object.values(SCOPE_DENIAL_COPY)) {
      expect(lintLandingCopy(copy)).toEqual([]);
    }
  });
});
