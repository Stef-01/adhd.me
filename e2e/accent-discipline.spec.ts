// O176: the accent carries at most one meaning per screen, across every public surface.
// AR9: the measurement itself now lives in `e2e/support/accent-load.ts`, so the mutation probe in
// `e2e/support/accent-probe.spec.ts` drives THIS detector rather than a copy of it.
//
// `adhdme-taste` reserves the accent for LIVE TOKENS — "the value that changes, the word that
// matters" — and says outright: "If everything is accented, nothing is." O166 enforced that on the
// clinician profile, where a canvas sweep found the accent painting SIX elements in FOUR unrelated
// meanings, and that was the whole reason the screen read as noise. The rule was then enforced on
// exactly one screen and nowhere else. This is the site-wide half.
//
// A CAP, NOT AN ALLOW-LIST, AND THE DISTINCTION IS THE DESIGN. O166 could name its one permitted
// site because it audited one screen. Listing every accent site that exists today across fifteen
// surfaces would be a transcription of the current state wearing a rule's clothes — the detector
// tuned until it agrees with the code. A cap cannot be satisfied that way: adding a fourth accented
// thing fails whatever it is called.
//
// WHERE THE PROXY DISAGREES WITH A READER, STATED RATHER THAN HIDDEN. "Meaning" is counted by
// class, and class is a rough proxy. `/finder` paints `dual-input-field` and `dual-input-action` —
// two classes, but one meaning to anybody looking at it ("the thing you are doing right now").
// `/clinicians/join` paints `mix-percent` and `mix-condition`, which are two halves of the mix
// hero — the taste law's own example of a live token. So the cap is 2 rather than 1: it permits one
// meaning expressed in a pair of classes, and refuses a genuine third. The rationale behind the
// number, and the two blind spots that made O176 set it twice, are recorded beside `MEANINGS_CAP`.

// taste-rule: type.accent-live-tokens

import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./site-routes";
import { accentSites, meaningsOf, overCapFinding } from "./support/accent-load";
import { measured } from "./support/measured";

test("no public surface lets the accent carry more than one meaning", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(PUBLIC_ROUTES.length, "the derived route list collapsed").toBeGreaterThan(12);

  const report: string[] = [];
  const over: string[] = [];
  let totalSites = 0;

  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const sites = await accentSites(page);
    const meanings = meaningsOf(sites);
    totalSites += sites.length;
    report.push(`${route} sites=${sites.length} meanings=${meanings.length} [${meanings.join(", ")}]`);
    const finding = overCapFinding(route, meanings);
    if (finding) over.push(finding);
  }

  console.log("ACCENT_LOAD\n  " + report.join("\n  "));

  // NON-VACUITY, AND IT IS LOAD-BEARING HERE MORE THAN ANYWHERE. A cap is satisfied perfectly by a
  // detector that finds nothing — and "nothing" would also mean the live tokens had lost their own
  // accent, which is a different regression this same sweep should catch.
  //
  // TWO CHECKS, NOT ONE REPLACING THE OTHER. `measured()` is AR6's harness and refuses ZERO; this
  // sweep's own floor of 4 is stricter and stays exactly as O176 wrote it. Letting the harness
  // stand in for it would have quietly relaxed a live floor during a refactor that was supposed to
  // change nothing — the precise shape this lane keeps finding. (The migration to `measured()` is
  // incidental: AR6 moved five specs and missed this one, which did not exist under that name when
  // its list was drawn.)
  //
  // AND THE FLOOR STAYS A RUN TOTAL RATHER THAN AR7'S PER-ROUTE RATE, deliberately: seven of the
  // fifteen public surfaces paint no accent at all and are RIGHT to, so a per-route minimum would
  // assert something false about this rule. AR7's rate fits sweeps where every route must
  // contribute; this one measures a colour that is supposed to be scarce.
  measured("accent-discipline.public-sites", totalSites);
  expect(totalSites, "no element on any public surface paints the accent — the sweep is looking at nothing").toBeGreaterThan(4);
  expect(over, `the accent is carrying more than one meaning:\n${over.join("\n")}`).toEqual([]);
});
