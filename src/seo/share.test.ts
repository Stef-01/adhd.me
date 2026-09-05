// The share surface, from the register's side. `e2e/share-surface.spec.ts` reads the rendered
// head; this holds the metadata every indexable page exports before Next resolves it, so a page
// cannot carry share copy the register has never measured, and the site-wide fields cannot be
// dropped by a page that sets its own — the shape Next's non-merging `openGraph` makes easy.
import { describe, expect, it } from "vitest";
import { SEO_PAGES, SHARED_OPEN_GRAPH, SHARE_IMAGE, seoMetadata } from "./pages";

describe("what a shared link carries", () => {
  it.each(SEO_PAGES)("$path unfurls to its own title and description, on the shared site fields", (page) => {
    const og = seoMetadata(page.path).openGraph;
    expect(og).toBeDefined();
    expect(og).toMatchObject({
      ...SHARED_OPEN_GRAPH,
      url: page.path,
      title: { absolute: page.title },
      description: page.description,
    });
  });

  it("names the site once, in Australian English, with the one card image", () => {
    expect(SHARED_OPEN_GRAPH).toEqual({ siteName: "ADHD.ME", type: "website", locale: "en_AU", images: [SHARE_IMAGE] });
    expect(SHARE_IMAGE).toMatchObject({ url: "/opengraph-image", width: 1200, height: 630 });
  });
});
