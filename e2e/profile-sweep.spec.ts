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
import { demoResultsRealRosterOnly } from "./support/real-roster";

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
  // O178 removed the practice name from the patient profile's visible identity block. The former
  // "Cancer" acceptance was deleted with it; the both-directions check below guards against stale
  // exceptions surviving after their text no longer renders.
  // O164 deleted the `no-ratings` "reviews" acceptance from here: the rule was narrowed at source
  // so clinical review no longer trips it, and this list's own stale-acceptance check is what
  // forced the deletion rather than leaving a comfortable entry behind.

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
    // O226: rows are clicked by real name, and the shipped default shows the example roster —
    // a real GP can sit below the five-row fold, so the examples go off at the door.
    await demoResultsRealRosterOnly(page);
    await page.locator(".clinician-row").filter({ hasText: clinician.name }).first().click();
    await expect(page.locator(".profile-content")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Progressive disclosure changes what is initially visible, not what the product can serve.
    // Sweep every open state so a prohibited claim cannot hide behind a collapsed row.
    await page.locator(".profile-content details").evaluateAll((items) => {
      for (const item of items) (item as HTMLDetailsElement).open = true;
    });

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
