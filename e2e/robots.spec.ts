// U7 (O229): what a crawler is actually told, read off the production build — the header and the
// meta tag on every route the register hides, robots.txt and the sitemap agreeing, and a public
// page carrying none of it. robots.test.ts holds the four places to the register in source; this
// proves the register reaches the wire.

import { expect, test } from "@playwright/test";
import { HIDDEN_FROM_CRAWLERS, X_ROBOTS_TAG } from "../src/security/robots";

test.describe("U7 crawlers told the truth about the finder", () => {
  for (const { path } of HIDDEN_FROM_CRAWLERS) {
    test(`${path} answers noindex, nofollow in the header and the meta tag`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["x-robots-tag"]).toBe(X_ROBOTS_TAG);
      const html = await response.text();
      expect(html).toMatch(/<meta name="robots" content="noindex, nofollow"\s*\/?>/);
    });
  }

  test("robots.txt disallows every hidden route and the sitemap announces none of them", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const { path } of HIDDEN_FROM_CRAWLERS) {
      expect(robots, `robots.txt must disallow ${path}`).toContain(`Disallow: ${path}\n`);
      expect(sitemap, `the sitemap must not announce ${path}`).not.toContain(`${path}</loc>`);
    }
    // The operator prefixes stayed.
    expect(robots).toContain("Disallow: /console/");
    expect(robots).toContain("Disallow: /book/");
  });

  test("a public page carries none of it — the register hides only what it names", async ({ request }) => {
    const response = await request.get("/faq");
    expect(response.headers()["x-robots-tag"]).toBeUndefined();
    expect(await response.text()).not.toMatch(/<meta name="robots"/);
    expect(await (await request.get("/robots.txt")).text()).not.toContain("Disallow: /faq");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("/faq</loc>");
  });
});
