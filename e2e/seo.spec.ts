// O241: what a search result would actually say, read off the production build.
//
// The register decides the words and `src/seo/pages.test.ts` measures them, but a register is a
// claim about source. O167 is the reason this file exists at all: the site-wide copy sweep read
// `document.body.innerText` and therefore could not see a `<title>` or a description, and two
// pages carried a retired word in their head for months while every sweep stayed green. So this
// proves the head — title, description, canonical, breadcrumb markup — on the served page.

import { expect, test } from "@playwright/test";
import { needsBreadcrumbs, renderedTitle, SEO_PAGES } from "../src/seo/pages";

interface BreadcrumbListLd {
  "@type": string;
  itemListElement?: { position: number; name: string; item: string }[];
}

test.describe("O241 the head of every indexable page", () => {
  for (const page of SEO_PAGES) {
    test(`${page.path} serves the register's title, description and canonical`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);

      await expect(browserPage).toHaveTitle(renderedTitle(page));
      await expect(browserPage.locator('meta[name="description"]')).toHaveAttribute("content", page.description);

      // Self-referencing, and absolute — a relative canonical is a canonical that means something
      // different on every host that serves the page.
      const canonical = await browserPage.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical, `${page.path} must carry a canonical`).toBeTruthy();
      expect(canonical).toMatch(/^https?:\/\//);
      expect(new URL(canonical!).pathname).toBe(page.path);

      // One H1. The rule the audit calls the commonest on-page defect, and the one this tree can
      // hold today — see the register's header for the keyword-in-H1 rule it cannot hold yet.
      await expect(browserPage.locator("h1")).toHaveCount(1);
    });
  }
});

test.describe("O241 where a page sits, said once and read twice", () => {
  const paths = new Set(SEO_PAGES.map((page) => page.path));

  for (const page of SEO_PAGES.filter((entry) => needsBreadcrumbs(entry.path))) {
    test(`${page.path} publishes a BreadcrumbList ending on itself`, async ({ page: browserPage }) => {
      await browserPage.goto(page.path);
      const blocks = await browserPage.locator('script[type="application/ld+json"]').allTextContents();
      const trails = blocks
        .map((block) => JSON.parse(block) as BreadcrumbListLd)
        .filter((data) => data["@type"] === "BreadcrumbList");
      expect(trails, `${page.path} is two segments deep and publishes no BreadcrumbList`).toHaveLength(1);

      const items = trails[0]?.itemListElement ?? [];
      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.map((item) => item.position)).toEqual(items.map((_, i) => i + 1));
      expect(new URL(items[items.length - 1]!.item).pathname).toBe(page.path);

      // Every crumb has to be somewhere a reader can actually go, or the trail is decoration.
      for (const item of items) {
        const crumb = new URL(item.item).pathname;
        expect(item.name.length, `${page.path}: a crumb with no label`).toBeGreaterThan(0);
        expect(crumb === "/" || paths.has(crumb), `${page.path}: the crumb ${crumb} is not a page`).toBe(true);
      }

      // The same trail the reader is shown, from the same list — not a second markup-only copy.
      const visible = await browserPage.locator('nav[aria-label="Breadcrumb"] li').allInnerTexts();
      expect(visible.map((text) => text.trim())).toEqual(items.map((item) => item.name));
    });
  }
});
