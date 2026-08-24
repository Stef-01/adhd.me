// AR11: the mutation probe for the semantics sweep (docs/AESTHETIC-REVIEW-PLAN.md Phase 2,
// "a check that cannot fail is not a check").
//
// O160's own header records that the sweep "found nothing, and that is recorded rather than
// dressed up: this gate holds ground rather than fixing a defect." A gate that has NEVER fired
// is precisely the one whose ability to fire needs proving — nothing in its history separates
// "the site is clean" from "the probe stopped looking". This spec breaks each of the four checks
// on a real page and requires the real detector — `semanticFindings`/`semanticsFinding` from
// `e2e/support/semantics-load.ts`, the same functions the sweep now calls — to notice.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PUBLIC_ROUTES, revealCollapsedSurfaces } from "../site-routes";
import { probeVerdict } from "./probe";
import { SEMANTICS_RULE_ID, semanticFindings, semanticsFinding } from "./semantics-load";

const PROBED_ROUTE = PUBLIC_ROUTES[0]!;

async function openProbedRoute(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PROBED_ROUTE, { waitUntil: "networkidle" });
  await revealCollapsedSurfaces(page);
  await page.evaluate(() => document.fonts.ready);
}

test("each of the four checks goes red when its rule is broken, naming the route and the rule id", async ({
  page,
}) => {
  await openProbedRoute(page);

  const clean = await semanticFindings(page);
  // The detector must be reading something real before a mutation means anything (AR10's guard):
  // a page reporting no headings and no fields would let every injection "work" against a
  // detector that sees only its own probe.
  expect(clean.headings, `${PROBED_ROUTE} reports no headings at all — the detector is blind`).toBeGreaterThan(0);
  const cleanFinding = semanticsFinding(PROBED_ROUTE, clean.out);

  // All four mutations on one page, asserted individually — the sweep reports defects as a list,
  // so four-at-once is the sweep's own shape, and each check is still pinned to its own message.
  await page.evaluate(() => {
    const h1 = document.createElement("h1");
    h1.textContent = "ar11 second h1";
    document.body.appendChild(h1);
    const h2 = document.createElement("h2");
    h2.textContent = "ar11 jump base";
    document.body.appendChild(h2);
    const h4 = document.createElement("h4");
    h4.textContent = "ar11 jumped heading";
    document.body.appendChild(h4);
    const input = document.createElement("input");
    input.setAttribute("name", "ar11-unnamed-probe");
    input.style.cssText = "display:block;width:120px;height:30px;";
    document.body.appendChild(input);
    const main = document.querySelector("main");
    if (main) {
      const div = document.createElement("div");
      while (main.firstChild) div.appendChild(main.firstChild);
      main.replaceWith(div);
    }
  });

  const mutated = await semanticFindings(page);
  expect(mutated.out.filter((f) => f.startsWith("h1 count = 2"))).toHaveLength(1);
  expect(mutated.out.filter((f) => f.includes("heading jump h2->h4"))).toHaveLength(1);
  expect(mutated.out.filter((f) => f.includes("no <main> landmark"))).toHaveLength(1);
  expect(mutated.out.filter((f) => f.includes("unnamed <input> name=ar11-unnamed-probe"))).toHaveLength(1);
  // And the populations grew by exactly the injections — a detector that dropped a real heading
  // while gaining the probes would pass the four lines above and still be broken (AR10's guard).
  expect(mutated.headings).toBe(clean.headings + 3);
  expect(mutated.fields).toBe(clean.fields + 1);

  const probedFinding = semanticsFinding(PROBED_ROUTE, mutated.out);
  const verdict = probeVerdict(SEMANTICS_RULE_ID, PROBED_ROUTE, probedFinding, cleanFinding);
  expect(
    verdict.kind,
    verdict.kind === "discriminates" ? "" : (verdict as { reason: string }).reason,
  ).toBe("discriminates");
  expect(probedFinding).toContain(PROBED_ROUTE);
  expect(probedFinding).toContain(SEMANTICS_RULE_ID);
});

test("the checks fire for the right reasons: a named field and a stepped heading stay green", async ({
  page,
}) => {
  await openProbedRoute(page);
  expect(semanticsFinding(PROBED_ROUTE, (await semanticFindings(page)).out)).toBeNull();

  // The counterpart mutations that must NOT fire (AR10's label-rule guard, this family's
  // version): an aria-labelled input, and an h2 followed by an h3 — one level, not a jump.
  // A probe suite that only proves "broken thing fails" would reward a detector that flags
  // every injected element; these make that regression fail instead.
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "ar11 named probe field");
    input.style.cssText = "display:block;width:120px;height:30px;";
    document.body.appendChild(input);
    const h2 = document.createElement("h2");
    h2.textContent = "ar11 step base";
    document.body.appendChild(h2);
    const h3 = document.createElement("h3");
    h3.textContent = "ar11 stepped heading";
    document.body.appendChild(h3);
  });
  const after = await semanticFindings(page);
  expect(
    semanticsFinding(PROBED_ROUTE, after.out),
    "a named field or a one-level heading step was flagged — the detector fires for the wrong reasons",
  ).toBeNull();
});
