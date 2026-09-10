// The share surface as it is SERVED: what a link to any indexable page unfurls to in a message,
// a feed or a search result. `src/seo/share.test.ts` holds the metadata each page exports; this
// reads the head Next actually renders, because the two can disagree — a layout field a page
// silently replaced, an image route that 500s under the edge runtime — and only the rendered
// page shows it. The image is fetched, not just named: an `og:image` that points at a broken
// route is a card with a grey box, and nothing but a fetch finds that.

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { SEO_PAGES, SHARED_OPEN_GRAPH, SHARE_IMAGE } from "../src/seo/pages";

const meta = async (page: import("@playwright/test").Page, attr: "property" | "name", key: string) =>
  page.locator(`head meta[${attr}="${key}"]`).getAttribute("content");

for (const entry of SEO_PAGES) {
  test(`${entry.path} unfurls to its own card`, async ({ page, request }) => {
    await page.goto(entry.path);

    // The page's half only: the brand is `og:site_name`, shown beside the title by every card.
    expect(await meta(page, "property", "og:title")).toBe(entry.title);
    expect(await meta(page, "property", "og:description")).toBe(entry.description);
    expect(await meta(page, "property", "og:site_name")).toBe(SHARED_OPEN_GRAPH.siteName);
    expect(await meta(page, "property", "og:locale")).toBe(SHARED_OPEN_GRAPH.locale);
    expect(await meta(page, "property", "og:type")).toBe(SHARED_OPEN_GRAPH.type);
    expect(await meta(page, "name", "twitter:card")).toBe("summary_large_image");
    expect(await meta(page, "name", "twitter:title")).toBe(entry.title);

    const canonical = await page.locator('head link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).pathname).toBe(entry.path === "/" ? "/" : entry.path);

    // The image: 1200×630 is what every card expects, and a PNG that arrives is a card that draws.
    expect(await meta(page, "property", "og:image:width")).toBe("1200");
    expect(await meta(page, "property", "og:image:height")).toBe("630");
    const image = await meta(page, "property", "og:image");
    expect(image).toBeTruthy();
    expect(new URL(image!).pathname).toBe(SHARE_IMAGE.url);
    // Twitter's card draws its own tag, derived from the same image; a card with the title and no
    // picture is the failure this whole spec exists to see.
    expect(new URL((await meta(page, "name", "twitter:image"))!).pathname).toBe(SHARE_IMAGE.url);
    // The metadata base is the production origin; fetch the same path from the server under test.
    const response = await request.get(new URL(image!).pathname + new URL(image!).search);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  });
}
