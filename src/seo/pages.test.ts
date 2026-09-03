// O241: the search register held in both directions — to the routes crawlers actually see, to the
// windows a result is truncated at, and to the same copy laws every other public sentence answers
// to. A title is public copy; nothing had ever linted one.

import { describe, expect, it } from "vitest";
import { sitemapPaths } from "../../app/sitemap";
import { PUBLIC_SURFACES, sweepSurface } from "../compliance/public-surfaces";
import { eachOf } from "../quality/non-vacuous";
import {
  DESCRIPTION_WINDOW,
  KEYWORD_HEAD,
  renderedTitle,
  seoFindings,
  seoMetadata,
  seoPage,
  SEO_PAGES,
  TITLE_WINDOW,
  type SeoPage,
} from "./pages";

/** A clean entry to mutate one field of, so a planted violation is exactly one thing wrong. */
const SOUND: SeoPage = {
  path: "/planted",
  keyword: "planted keyword",
  title: "Planted keyword, a title of the right length",
  description:
    "Planted keyword, in a description written to sit inside the window the register requires, saying enough about the page to be worth a click from a search result.",
};

describe("O241 the register covers exactly what crawlers see", () => {
  it("has an entry for every indexable route", () => {
    for (const path of eachOf(sitemapPaths(), "the sitemap's routes")) {
      expect(seoPage(path), `${path} is in the sitemap with no SEO_PAGES entry`).toBeDefined();
    }
  });

  it("names no route that is hidden, dynamic or gone", () => {
    const indexable = new Set(sitemapPaths());
    for (const page of eachOf(SEO_PAGES, "the SEO register")) {
      expect(indexable.has(page.path), `${page.path} has an entry but is not an indexable route`).toBe(true);
    }
  });

  it("keeps the founder's posture: the finder and its app surfaces are absent", () => {
    // The gate this unit was most able to open quietly, asserted rather than trusted. Moving any
    // of these is `finder-public-posture` (plan D-FINDER-PUBLIC), not an SEO decision.
    for (const path of eachOf(["/", "/profile", "/examples", "/demo", "/thanks"], "the hidden app surfaces")) {
      expect(seoPage(path), `${path} must not be in the search register while the finder is hidden`).toBeUndefined();
    }
  });
});

describe("O241 the on-page rules", () => {
  it("finds nothing in the shipped register", () => {
    expect(seoFindings()).toEqual([]);
  });

  it("puts every rendered title in the window a result is truncated at", () => {
    for (const page of eachOf(SEO_PAGES, "the SEO register")) {
      const rendered = renderedTitle(page);
      // The suffix is part of what the SERP shows, so it is part of what is measured.
      expect(rendered.endsWith(" · ADHD.ME"), page.path).toBe(true);
      expect(rendered.length, `${page.path}: "${rendered}"`).toBeGreaterThanOrEqual(TITLE_WINDOW.min);
      expect(rendered.length, `${page.path}: "${rendered}"`).toBeLessThanOrEqual(TITLE_WINDOW.max);
      expect(page.description.length, page.path).toBeGreaterThanOrEqual(DESCRIPTION_WINDOW.min);
      expect(page.description.length, page.path).toBeLessThanOrEqual(DESCRIPTION_WINDOW.max);
    }
  });

  it("catches every violation it claims to — planted, one at a time", () => {
    const planted: ReadonlyArray<readonly [string, SeoPage]> = [
      ["title-length", { ...SOUND, title: "Planted keyword" }],
      ["title-length", { ...SOUND, title: `${SOUND.title} and then a good deal more besides` }],
      ["description-length", { ...SOUND, description: "Planted keyword, and not much else." }],
      ["description-length", { ...SOUND, description: `${SOUND.description} ${SOUND.description}` }],
      ["keyword-not-leading-title", { ...SOUND, title: "A title of the right length, with planted keyword" }],
      ["keyword-not-leading-description", { ...SOUND, description: "A description that says nothing much at all for its opening stretch, holding back until it is far too late to mention the planted keyword anywhere useful here." }],
    ];
    for (const [rule, page] of eachOf(planted, "the planted violations")) {
      const rules = seoFindings([page]).map((f) => f.rule);
      expect(rules, `${rule} was not caught in "${page.title}"`).toContain(rule);
    }
  });

  it("catches a second page taking the first page's title, description or keyword", () => {
    // Cannibalisation is invisible from inside either page; it is only a fact about the pair.
    const twin: SeoPage = { ...SOUND, path: "/planted-twin" };
    expect(seoFindings([SOUND, twin]).map((f) => f.rule)).toEqual(
      expect.arrayContaining(["duplicate-title", "duplicate-description", "duplicate-keyword"]),
    );
    expect(seoFindings([SOUND])).toEqual([]);
  });

  it("means what it says by 'near the beginning'", () => {
    expect(KEYWORD_HEAD.title).toBeLessThanOrEqual(0.5);
    expect(KEYWORD_HEAD.description).toBeLessThanOrEqual(100);
  });
});

describe("O241 a title is public copy", () => {
  it("passes the same rules the page it describes answers to", () => {
    // W102's sweep, applied to the sentences a search result shows. Nothing had ever linted these:
    // the copy laws were enforced on rendered pages, and metadata is served to a bigger audience
    // than the page is.
    for (const page of eachOf(SEO_PAGES, "the SEO register")) {
      const surface = PUBLIC_SURFACES.find((s) => s.path === page.path);
      expect(surface, `${page.path} is not in the public-surface census`).toBeDefined();
      expect(sweepSurface(page.path, surface!.audience, `${renderedTitle(page)}. ${page.description}`)).toEqual([]);
    }
  });
});

describe("O241 the metadata the pages export", () => {
  it("carries the register's own words and a self-referencing canonical", () => {
    for (const page of eachOf(SEO_PAGES, "the SEO register")) {
      const metadata = seoMetadata(page.path);
      expect(metadata.title).toBe(page.title);
      expect(metadata.description).toBe(page.description);
      expect(metadata.alternates?.canonical).toBe(page.path);
    }
  });

  it("refuses a route it has never measured, rather than serving a generic title", () => {
    expect(() => seoMetadata("/no-such-route")).toThrow(/no entry in SEO_PAGES/);
  });
});
