// O163: the compliance sweep, extended to the one patient surface it could never reach.
//
// `public-sweep.spec.ts` lints every public ROUTE. The clinician profile is not a route — it is
// reached by typing a query, getting results, and clicking a row. So the surface carrying the most
// clinical free text about real named doctors (`about`, `experience`, `focus`, `matchLine`,
// `fitSignals`) is the one surface no compliance sweep has ever read.
//
// What was hiding there: the word "prescriber", rendered twice on Dr Anusha Saxena's profile,
// while `roster.ts` asserted in prose that it "never renders on a patient surface". A rule that
// cannot see a surface is not a rule about that surface.
//
// It reuses `sweepSurface` rather than re-implementing the rules — W139's law: a second copy of a
// rule set starts identical and drifts silently.

import { expect, test } from "@playwright/test";
import { sweepSurface } from "../src/compliance/public-surfaces";
import { clinicians } from "../src/demo/clinicians";

/**
 * Findings accepted with a reason, in the shape `public-sweep.spec.ts` uses. Both directions: a
 * stale acceptance — one the page no longer produces — fails, because a stale acceptance reads as
 * coverage while silently permitting something else.
 */
const ACCEPTED: ReadonlyArray<{ clinician: string; rule: string; match: string; why: string }> = [
  // ── Regex over-matches on ordinary clinical language. Named individually, because "the linter is
  //    too broad" applied as a blanket is how a compliance gate becomes decoration.
  {
    clinician: "anubhav-saxena",
    rule: "no-clinical-claims",
    match: "treats",
    why:
      "'He treats a substance history as a safety question rather than a character one.' Here 'treats' is the ordinary English verb — regards, handles — not a claim to treat a condition. The rule's own rationale is that naming a TREATMENT to a patient is therapeutic advertising; this names an attitude.",
  },
  {
    clinician: "anubhav-saxena",
    rule: "no-condition-targeting",
    match: "Cancer",
    why:
      "'Beecroft Family & Skin Cancer Clinic' is the practice's own registered name. The rule exists to stop targeting patients by condition, not to ban a business's legal name — and rewriting a real practice's name on a listing would be a worse problem than the one it solved.",
  },
  {
    clinician: "tushar-yadav",
    rule: "no-condition-targeting",
    match: "Cancer",
    why: "The same practice name, on the second doctor who works there.",
  },
  {
    clinician: "anubhav-saxena",
    rule: "no-ratings",
    match: "reviews",
    why:
      "'Long first appointment, scheduled reviews' and 'review at set intervals'. A clinical review, not a patient rating. WORTH RAISING AT SOURCE: `no-ratings` matching /review/ is very broad, and scheduled review is core language this product uses on every surface — the rule will keep producing this finding wherever the product describes what it actually does.",
  },

  // ── Genuinely undecided, and marked so rather than resolved by me.
  {
    clinician: "anusha-saxena",
    rule: "no-clinical-claims",
    match: "prescriber",
    why:
      "FOUNDER DECISION OUTSTANDING (O163). 'She has completed an endorsed ADHD prescriber course' is a founder-relayed credential about a real named doctor, and the regex matches `prescrib\\w*` inside a COURSE TITLE rather than a claim to prescribe for anybody. The two readings — the rule is right and her copy must change, or it over-matches a proper noun and needs an exemption — change either what is said about a named person or a compliance rule. Accepted so the gate is honest about what it found and the finding cannot be lost; NOT a judgement that the copy is fine. roster.ts asserted this word 'never renders on a patient surface'; it renders twice, and that comment is corrected in this unit.",
  },
  {
    clinician: "anusha-saxena",
    rule: "no-condition-targeting",
    match: "mental health",
    why:
      "FOUNDER DECISION OUTSTANDING (O163). 'Her clinical interests are ADHD, mental health, women's health…' — her own declared interests, and a care area this product matches on. The rule's rationale is that naming a condition TO A PATIENT targets them; naming what a GP does on their own listing is what a directory is for. This is the closest of the six to the rule's actual intent and the one most worth a deliberate answer.",
  },
];

const REAL = clinicians.filter((c) => c.realPerson);

test("no clinician profile serves copy the patient rules refuse", async ({ page }) => {
  test.setTimeout(120_000);
  // Non-vacuity: the roster having real people is the premise of the whole sweep.
  expect(REAL.length).toBeGreaterThan(1);

  const seen: Array<{ clinician: string; rule: string; match: string }> = [];

  for (const clinician of REAL) {
    await page.goto("/finder");
    await page.getByRole("button", { name: "Try a demo scenario" }).click();
    await page.getByRole("button", { name: "Try this scenario" }).click();
    await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
    await page.locator(".clinician-row").filter({ hasText: clinician.name }).first().click();
    await expect(page.locator(".profile-content")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const text = await page.locator(".profile-content").innerText();
    // Per-profile vacuity guard: a blank profile satisfies every rule ever written.
    expect(text.length, `${clinician.id}'s profile rendered nothing`).toBeGreaterThan(200);

    const findings = sweepSurface(`profile:${clinician.id}`, "patient", text);
    for (const f of findings) seen.push({ clinician: clinician.id, rule: f.rule, match: f.match });

    const unaccepted = findings.filter(
      (f) => !ACCEPTED.some((a) => a.clinician === clinician.id && a.rule === f.rule && a.match === f.match),
    );
    expect(
      unaccepted.map((f) => `${f.rule}: "${f.match}"`),
      `${clinician.id}'s profile serves copy the patient rules refuse`,
    ).toEqual([]);
  }

  // Both directions, W102's shape.
  for (const accepted of ACCEPTED) {
    expect(
      seen.some((f) => f.clinician === accepted.clinician && f.rule === accepted.rule && f.match === accepted.match),
      `stale acceptance: ${accepted.clinician} no longer produces ${accepted.rule} "${accepted.match}"`,
    ).toBe(true);
  }
});
