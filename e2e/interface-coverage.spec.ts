// O208 rendered half: a surface that owes an account of both interfaces actually names both.
//
// WHY RENDERED RATHER THAN SOURCE. W184's lesson, which W192's honesty sweep already learned the
// hard way: a rule applied to a copy bundle is not a rule applied to what the page serves. `/faq`'s
// answers are also its FAQPage JSON-LD; `/privacy`'s claims are prose assembled from several
// components. Only the served page shows what a reader — or a search engine — actually gets.
//
// THE PROXY IS WEAK AND SAYS SO. Naming a thing is not describing it well: a page could satisfy this
// by saying "network" once, meaninglessly. See the header of `src/compliance/interface-coverage.ts`
// — the REGISTER carries the weight, and this sweep is a backstop for the one failure that actually
// happened three times in three units (a page that names one interface and has never heard of the
// other). A green run here is not evidence that any surface describes the product well.

import { expect, test } from "@playwright/test";
import { INTERFACE_STANCES } from "../src/compliance/interface-coverage";

/** The words each interface is called on a patient-facing page. */
const INTERFACES = [
  { name: "the network", pattern: /\bnetwork\b/i },
  { name: "the finder", pattern: /\bfinder\b/i },
] as const;

test("every surface that describes the product names both interfaces", async ({ page }) => {
  test.setTimeout(240_000);
  const owing = INTERFACE_STANCES.filter((s) => s.stance === "describes-both");
  expect(owing.length, "no surface owes an account — the register collapsed").toBeGreaterThan(4);

  const report: string[] = [];
  for (const surface of owing) {
    const res = await page.goto(surface.path, { waitUntil: "networkidle" });
    if (res && res.status() === 404) {
      // O155's precedent: a founder-gated page is skipped and NAMED, never judged.
      report.push(`${surface.path} gated (404) — skipped`);
      continue;
    }
    const text = await page.locator("main").innerText();
    const missing = INTERFACES.filter((i) => !i.pattern.test(text)).map((i) => i.name);
    report.push(`${surface.path} ${missing.length === 0 ? "both" : `MISSING ${missing.join(", ")}`}`);
    expect(
      missing,
      `${surface.path} describes the product but never mentions ${missing.join(" or ")}. Either the ` +
        `page has gone stale the way /faq, /privacy and /examples each did, or its stance in ` +
        `src/compliance/interface-coverage.ts is wrong and should be argued down.`,
    ).toEqual([]);
  }
  console.log("INTERFACE_COVERAGE\n  " + report.join("\n  "));
});

test("the declared debt is still debt, so a fixed page cannot sit in the register unnoticed", async ({ page }) => {
  // The other direction. `/` and `/approach` are recorded as one-sided by a founder decision that is
  // pending. If somebody answers that decision and fixes a page, this fails — the entry has stopped
  // describing anything and must move to `describes-both`, which is how the register stays a
  // statement about the tree rather than a memory of it.
  const debt = INTERFACE_STANCES.filter((s) => s.stance === "declared-debt");
  expect(debt.length).toBeGreaterThan(0);

  for (const surface of debt) {
    await page.goto(surface.path, { waitUntil: "networkidle" });
    const text = await page.locator("main").innerText();
    const named = INTERFACES.filter((i) => i.pattern.test(text)).map((i) => i.name);
    expect(
      named.length,
      `${surface.path} is recorded as declared debt — naming one interface and not the other — but ` +
        `it now names ${named.length === 2 ? "both" : "neither"}. The debt is paid or the page ` +
        `changed: move it to the right stance in src/compliance/interface-coverage.ts.`,
    ).toBe(1);
  }
});
