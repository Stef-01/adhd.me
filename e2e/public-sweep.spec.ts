// W192 verify gate (e2e half): no clinical claim on any public surface, checked against what the
// pages actually SERVE. The axe half is e2e/a11y.spec.ts, which already scans every path here.
//
// Rendered text rather than source, and the reason is concrete rather than tidy: scanning the
// source of /clinicians reports a `no-ratings` hit on the word "review", which turns out to be the
// identifier `is-reviewed` in a className. A source scan measures the code. Only a rendered scan
// measures what a stranger reads, and the stranger is who the rules are about.
// taste-rule: honesty.no-testimonials

import { expect, test } from "@playwright/test";
import {
  ACCEPTED_FINDINGS,
  PUBLIC_SURFACES,
  STANDING_FLAGS,
  sweepSurface,
  unaccepted,
} from "../src/compliance/public-surfaces";
import { NETWORK_CLINICIANS } from "../src/network/gallery";

/** The booking page needs a token, so it is swept through a seeded invitation below. */
const STATIC_SURFACES = PUBLIC_SURFACES.filter((s) => !s.path.includes("["));

/**
 * O165: the dynamic public routes the filter above skips.
 *
 * They are NOT unswept — `/book/[token]` has its own test below, which mints a real token and
 * applies the full patient rule set. I claimed otherwise on the strength of reading the filter
 * line alone, and the unit is recorded in the ledger as the correction it turned into.
 *
 * What was genuinely missing is this: the booking test hardcodes one path, so a SECOND dynamic
 * public surface could be added and swept by nothing, with every test still green. This list is
 * asserted to be exactly what the suite covers, so that cannot happen quietly.
 *
 * That closes the last link in the chain. `public-surfaces.test.ts` already pins the register
 * against the filesystem in both directions, so a new page cannot exist unclassified; the loop
 * above covers every static entry; this covers every dynamic one. Route handlers that render no
 * copy (`/go/[clinician]` is the only one) are outside the register by design — `discoverSurfaces`
 * keeps `kind === "page"` — and there is nothing on them for a copy linter to read.
 */
const DYNAMIC_SURFACES = PUBLIC_SURFACES.filter((s) => s.path.includes("["));

test("every public surface serves copy its audience's rules allow", async ({ page }) => {
  test.setTimeout(90_000);
  expect(STATIC_SURFACES.length).toBeGreaterThan(5);
  const seen: ReturnType<typeof sweepSurface> = [];

  for (const surface of STATIC_SURFACES) {
    await page.goto(surface.path);
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    // Vacuity guard per page: a blank render would satisfy every rule.
    expect(text.length, `${surface.path} rendered nothing`).toBeGreaterThan(200);

    const findings = sweepSurface(surface.path, surface.audience, text);
    expect(
      unaccepted(findings).map((f) => `${f.rule}: "${f.match}"`),
      `${surface.path} (${surface.audience}) serves copy its rules refuse`,
    ).toEqual([]);
    seen.push(...findings);
  }

  // Both directions, W102's shape. An acceptance for a finding the page no longer produces is
  // stale, and a stale acceptance reads as coverage while silently permitting something else.
  for (const accepted of ACCEPTED_FINDINGS) {
    expect(
      seen.some((f) => f.path === accepted.path && f.rule === accepted.rule && f.match === accepted.match),
      `${accepted.path} no longer serves "${accepted.match}" — delete the acceptance rather than leaving it`,
    ).toBe(true);
    expect(accepted.why.length).toBeGreaterThan(80);
    expect(accepted.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the patient booking page serves no clinical claim either", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as {
    invitations: Array<{ token: string }>;
  };
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await page.waitForLoadState("networkidle");
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(100);

  // The most patient-facing surface in the product, and the only one reached by somebody who was
  // contacted rather than somebody who went looking — so it gets the full patient rule set.
  expect(
    unaccepted(sweepSurface("/book/[token]", "patient", text)).map((f) => `${f.rule}: "${f.match}"`),
  ).toEqual([]);

  // O165: the dynamic surfaces are swept by NAMED tests rather than by the loop above, so the list
  // of them is pinned here. A third dynamic public route would otherwise be added, swept by
  // nothing, with the suite still green — the filter at the top of this file drops it from the loop
  // by construction. O192 added the second entry and the test below that earns it.
  expect(
    DYNAMIC_SURFACES.map((surface) => surface.path),
    "a dynamic public surface exists that no test sweeps",
  ).toEqual(["/book/[token]", "/network/[clinician]"]);
});

/**
 * Findings accepted on a GP's own network page, held HERE rather than in `ACCEPTED_FINDINGS`.
 *
 * Not squeamishness about the register — arithmetic. The first test's both-directions check
 * collects `seen` from the STATIC surfaces only, so an acceptance naming a dynamic path could
 * never be found and would fail as stale on every run. `profile-sweep.spec.ts` hit the same wall
 * and answered it the same way: a local list with its own stale check, immediately below.
 */
const ACCEPTED_ON_PROFILE: ReadonlyArray<{ clinician: string; rule: string; match: string; why: string }> = [
  {
    clinician: "anubhav-saxena",
    rule: "no-clinical-claims",
    match: "treats",
    why:
      "The same sentence profile-sweep.spec.ts already argues, reaching a reader by the network road instead of the finder one: 'He treats a substance history as a safety question rather than a character one.' Ordinary English — regards, handles — not a claim to treat a condition; the rule's rationale is that naming a TREATMENT to a patient is therapeutic advertising, and this names an attitude.",
  },
  {
    clinician: "anubhav-saxena",
    rule: "no-condition-targeting",
    match: "Cancer",
    why:
      "'Beecroft Family & Skin Cancer Clinic' — a registered business name, matched inside a proper noun. Worth stating why it is not simply deleted from the identity block: the same words also appear in his DECLARED INTEREST ('Dr Saxena owns Beecroft Family & Skin Cancer Clinic, which is ADHD.ME's first clinic partner'), which is the one paragraph on this page that exists to be read before booking. Removing the practice name from the header would leave the finding standing and cost a reader the plainest answer to 'where would I be going', so the honest move is to accept the match and say what it is.",
  },
  // ── The two open founder gates, reached by the network road. NOT decided here: `openAt` for both
  //    is e2e/profile-sweep.spec.ts, and O192's only contribution to them is stated in the gate
  //    register — the same declarations now reach a reader in the server HTML of an indexable page
  //    rather than in client state behind a query, which is the version worth ruling on.
  {
    clinician: "anusha-saxena",
    rule: "no-clinical-claims",
    match: "prescriber",
    why:
      "FOUNDER DECISION OUTSTANDING — gate `prescriber-on-profile`, unchanged in kind since O163. 'She has completed an endorsed ADHD prescriber course' is a founder-relayed credential about a real named doctor, and the regex matches `prescrib\\w*` inside a COURSE TITLE rather than a claim to prescribe for anybody. Accepted so the sweep reports what it found; NOT a judgement that the copy is fine.",
  },
  {
    clinician: "anusha-saxena",
    rule: "no-condition-targeting",
    match: "mental health",
    why:
      "FOUNDER DECISION OUTSTANDING — gate `mental-health-on-profile`, unchanged in kind since O163. 'Her clinical interests are ADHD, mental health, women's health…' is her own declaration, and the rule's rationale is that naming a condition TO A PATIENT targets them, where naming what a GP does on their own listing is what a directory is for. Accepted so the finding cannot be lost; NOT a judgement that the copy is fine.",
  },
];

test("every GP's own page in the network serves copy the patient rules allow", async ({ page }) => {
  // O192's half of the dynamic-surface coverage. `/network/[clinician]` is one route and N pages,
  // and the interesting text — everything a doctor says about how they work — differs on every one
  // of them, so sweeping the route means sweeping the roster rather than sampling it.
  //
  // Deliberately NOT delegated to profile-sweep.spec.ts, which reads the same strings through
  // /finder. That spec proves the FINDER renders them acceptably; this one proves the network does.
  // Same words reaching a reader by a different road is the whole reason this unit exists, and
  // O192 already found the roads differ in a way that matters: on /finder these sentences live in
  // client state behind a query, and here they are in the served HTML of an indexable page.
  test.setTimeout(90_000);
  expect(NETWORK_CLINICIANS.length, "an empty roster would sweep nothing").toBeGreaterThan(0);
  const seen: Array<{ clinician: string; rule: string; match: string }> = [];

  for (const clinician of NETWORK_CLINICIANS) {
    await page.goto(`/network/${clinician.id}`);
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    expect(text.length, `/network/${clinician.id} rendered nothing`).toBeGreaterThan(200);

    // Their own name is the vacuity guard with teeth: a 404 shell would clear the length check.
    expect(text).toContain(clinician.shortName);

    const findings = sweepSurface("/network/[clinician]", "patient", text);
    const excused = ACCEPTED_ON_PROFILE.filter((a) => a.clinician === clinician.id);
    expect(
      findings
        .filter((f) => !excused.some((a) => a.rule === f.rule && a.match === f.match))
        .map((f) => `${f.rule}: "${f.match}"`),
      `/network/${clinician.id} serves copy the patient rules refuse`,
    ).toEqual([]);
    seen.push(...findings.map((f) => ({ clinician: clinician.id, rule: f.rule, match: f.match })));
  }

  // Both directions, W102's shape: an acceptance for a finding the page no longer produces reads
  // as coverage while silently permitting something else, so it fails rather than lingering.
  for (const accepted of ACCEPTED_ON_PROFILE) {
    expect(
      seen.some(
        (f) => f.clinician === accepted.clinician && f.rule === accepted.rule && f.match === accepted.match,
      ),
      `/network/${accepted.clinician} no longer serves "${accepted.match}" — delete the acceptance`,
    ).toBe(true);
    expect(accepted.why.length).toBeGreaterThan(80);
  }
});

test("the sweep would notice a violation, so a clean run means something", async ({ page }) => {
  // Non-vacuous end to end: the same function, over text that should fail, on a real page's
  // audience. If this ever passes, the sweep above is decorative.
  await page.goto("/");
  const planted = "We treat diabetes and guarantee better health. Our patients love us. Rated 5/5.";
  const findings = sweepSurface("/", "patient", planted);
  expect(findings.length).toBeGreaterThan(2);
  expect(findings.map((f) => f.rule)).toContain("no-clinical-claims");
});

test("the professional surfaces are the ones with a standing flag on them", async ({ page }) => {
  // /clinicians passes because it is classified professional, NOT because it carries no clinical
  // content — it names differential diagnosis, cardiac screening and titration review. The flag is
  // asserted here so a green sweep cannot be read as the stronger claim.
  await page.goto("/clinicians");
  await page.waitForLoadState("networkidle");
  const text = await page.locator("body").innerText();

  expect(sweepSurface("/clinicians", "professional", text)).toEqual([]);
  // And the same text under the patient rules would NOT pass — which is what the classification
  // is doing, stated rather than implied.
  expect(sweepSurface("/clinicians", "patient", text).length).toBeGreaterThan(0);
  expect(STANDING_FLAGS["/clinicians"]).toBeDefined();
});
