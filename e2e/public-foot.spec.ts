// O207: every public page ends somewhere, and the reader can leave from there.
//
// THE MIRROR OF `public-nav.spec.ts`, AND THE REASON IT WAS NEEDED. O189 found eight public
// surfaces that "carried breadcrumbs but NO wordmark and nothing shaped like a control", gave every
// one of them `PublicHeader`, and made the top permanent with that sweep — "EVERY public route must
// show the ADHD.ME mark and give the reader a way home from it", derived from the route list so a
// new page cannot ship headerless. Nobody asked the same question about the FOOT of the page, so
// the same class of defect survived at the other end: `/clinicians/join`, `/privacy` and
// `/privacy/automated-decisions` each carried a header and then simply stopped — zero `<footer>`
// elements, the Acknowledgement band abutting the copy, and on the join page about 350px of dead
// space with no way onward at all. It is the page the founder said "feels disconnected from the
// site", and it was: there was no site navigation on it below the header.
//
// THE EXCEPTIONS ARE NAMED AND ARGUED RATHER THAN SKIPPED, which is the whole difference between a
// census and an allowlist. Two kinds legitimately carry no site footer: the app's TAB routes,
// derived from `APP_TABS` for one shared reason (O241 — see the note on `isAppTabRoute`), and three
// one-off surfaces that each say why here. Another shape — a page with a footer of its OWN rather than the shared one — is accepted as
// satisfying the rule, because the rule is "the reader can leave from the bottom", not "this exact
// component is present".
// NO `taste-rule:` TAG, DELIBERATELY. `public-nav.spec.ts`, the sweep this mirrors, carries none
// either: "every page has a way out" is a navigation-completeness property rather than one of the
// 21 rules in `adhdme-taste`, and AR2's register checks that every tag is claimed by an entry — so
// tagging this with the nearest-looking rule would put a false claim into the coverage document.
// A first draft tagged `interaction.hover-focus` and AR2 refused it, which is the register working.

import { expect, test } from "@playwright/test";
import { APP_TABS } from "../src/app-shell/tabs";
import { PUBLIC_ROUTES } from "./site-routes";

/**
 * O241: THE APP'S TAB ROUTES ARE ONE EXEMPTION, NOT THREE, and deriving them is what kept the
 * exemption list from becoming the allowlist the test below refuses.
 *
 * `/` and `/profile` were listed here by hand (O230, O233). `/approach` was not, because O239
 * rebuilt the Learn tab into the same app shell — the finder's header, wordmark, settings control
 * and tab bar — and nobody re-typed the entry, so the sweep went red on it and stayed red. That is
 * the failure a hand-typed list has by construction, and the tree already holds the answer: the
 * tab bar's own register. A route in `APP_TABS` renders `AppTabs`, which IS its way onward; a site
 * footer beneath it would be two navigations stacked. A fourth tab is exempt the day it is added,
 * and a route that stops being a tab loses the exemption in the same commit.
 */
function isAppTabRoute(route: string): boolean {
  return APP_TABS.some((tab) => tab.href === route);
}

/** The remaining one-off exemptions: pages that are not tabs and still carry no footer. */
const NO_FOOTER: Readonly<Record<string, string>> = {
  "/demo": "The presenter view. It resets every store on launch and is driven by somebody standing in a room talking; it carries the demo navigator instead, which is the way between stops. Not linked from any patient surface.",
  "/clinicians": "A stage machine like the finder, with its own header carrying the demo map and a 'Patient view' exit link. Its way out is that exit, which public-nav.spec.ts walks. The founder-directed funnel it leads to — /clinicians/join — is a document and does carry the footer.",
  "/book/[token]": "Reached only by invitation, and the one surface where a reader is mid-task on something that expires. Excluded from the derived list here because it is dynamic; noted so the exclusion is a decision rather than a filter's side effect.",
};

test("every public page gives the reader a way onward from the bottom", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const shapes: string[] = [];
  let judged = 0;

  for (const route of PUBLIC_ROUTES) {
    const res = await page.goto(route, { waitUntil: "networkidle" });
    // O155's precedent, as public-nav.spec.ts uses it: a founder-gated page renders notFound() on
    // purpose. Skipped and NAMED, never judged footerless and never silently.
    if (res && res.status() === 404) {
      shapes.push(`${route} gated (404) — skipped`);
      continue;
    }
    if (isAppTabRoute(route)) {
      shapes.push(`${route} exempt (app tab)`);
      continue;
    }
    if (route in NO_FOOTER) {
      shapes.push(`${route} exempt`);
      continue;
    }
    judged += 1;

    const footers = page.locator("body footer");
    await expect(
      footers.first(),
      `${route}: no footer at all — the page stops and the reader has nowhere to go. Add ` +
        `<SiteFooter />, or, if this surface genuinely should not have one, say why in NO_FOOTER.`,
    ).toBeVisible();

    // A footer with nothing in it would satisfy the line above and strand the reader just as well.
    const links = footers.locator("a[href]");
    const count = await links.count();
    expect(count, `${route}: the footer holds no links`).toBeGreaterThan(0);
    shapes.push(`${route} footer(${count})`);
  }

  console.log("PUBLIC_FOOT\n  " + shapes.join("\n  "));
  expect(shapes.length).toBe(PUBLIC_ROUTES.length);
  // Non-vacuity, public-nav.spec.ts's own guard: a sweep that exempted or skipped everything would
  // satisfy the line above while judging nothing.
  expect(judged, "every public route was skipped or exempt — the sweep judged nothing").toBeGreaterThan(8);
});

test("exempts nothing that is not a real route, and argues every exemption", async () => {
  // Both directions, W102's shape. An exemption naming a route that has moved reads as a decision
  // somebody made about a page that exists.
  const known = new Set<string>([...PUBLIC_ROUTES, "/book/[token]"]);
  for (const [route, why] of Object.entries(NO_FOOTER)) {
    expect(known.has(route), `${route} is exempt but is not a public route`).toBe(true);
    expect(why.length, `${route} is exempt without an argument`).toBeGreaterThan(100);
  }
  // Every tab route is exempt by derivation, so it is still a real route by the tab register's own
  // both-directions test — asserted here too, because this sweep is what would silently skip a
  // route the tab bar named by mistake.
  for (const tab of APP_TABS) {
    expect(known.has(tab.href), `${tab.href} is a tab but is not a public route`).toBe(true);
  }
  // Three, down from five: the cap now measures what it was written to measure — the exemptions
  // nobody can derive — rather than a list that grows by one every time the app gains a tab.
  expect(Object.keys(NO_FOOTER).length, "the exemption list has grown into an allowlist").toBeLessThan(4);
});
