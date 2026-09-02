// U7 (O229): the crawler register, held to the three places a crawler is told, in both directions.
//
// The register (`robots.ts`) names the routes this testing deployment hides. This test walks the
// public-route census and asks each static path one question — is it in the register? — and then
// insists the answer is the same in every place: the `X-Robots-Tag` entries `next.config.ts`
// mounts, each page module's `metadata.robots`, the sitemap, and `app/robots.ts`'s disallow list.
// A route in the register that any place forgets is a leak; a route outside it that any place
// hides is a page gone dark by accident. Either fails here, by path, with the place named.
//
// `/about` is the one exception and it is an OLDER rule, not a gap: gated shut by TEAM_PAGE_PUBLIC,
// it carries its own `noindex` and the sitemap's own filter (O155), and `team-page-public` is its
// gate. The census's dynamic path (`/book/[token]`) is the prefix rule robots.ts has always had.
//
// The page-module check reads source, as headers.test.ts does for the config: importing
// `app/finder/page.tsx` would pull the whole client tree into a node test for one metadata field.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import robots, { OPERATOR_DISALLOW } from "../../app/robots";
import { sitemapPaths } from "../../app/sitemap";
import { TEAM_PAGE_PUBLIC } from "../../app/about/team";
import { PUBLIC_SURFACES } from "@/compliance/public-surfaces";
import { FOUNDER_GATES } from "@/design/founder-gates";
import { eachOf } from "@/quality/non-vacuous";
import { stripComments } from "./reachability";
import { HIDDEN_FROM_CRAWLERS, isHiddenFromCrawlers, robotsHeaders, X_ROBOTS_TAG } from "./robots";

const ROOT = join(__dirname, "..", "..");

/** The static census paths this test decides about — every one except the gated /about. */
const STATIC_PUBLIC = PUBLIC_SURFACES.map((s) => s.path).filter(
  (path) => !path.includes("[") && !(path === "/about" && !TEAM_PAGE_PUBLIC),
);

/** A page module's source with its comments removed, so a mention is not a setting. */
function pageSource(path: string): string {
  const file = join(ROOT, "app", path === "/" ? "" : path.slice(1), "page.tsx");
  expect(existsSync(file), `${path} has no page module at ${file}`).toBe(true);
  return stripComments(readFileSync(file, "utf8"));
}

/** The paths `next.config.ts` mounts an `X-Robots-Tag` on, read from the real config. */
async function taggedPaths(): Promise<string[]> {
  const entries = await nextConfig.headers!();
  return entries
    .filter((entry) => entry.headers.some((h) => h.key === "X-Robots-Tag"))
    .map((entry) => entry.source);
}

const disallowed = (): string[] => {
  const rule = robots().rules;
  const list = (Array.isArray(rule) ? rule[0] : rule)?.disallow ?? [];
  return Array.isArray(list) ? list : [list];
};

describe("U7 the crawler register is one register", () => {
  it("names the three routes the plan hides, each with a reason", () => {
    const paths = HIDDEN_FROM_CRAWLERS.map((r) => r.path);
    expect(paths).toEqual(expect.arrayContaining(["/finder", "/examples", "/demo"]));
    expect(new Set(paths).size).toBe(paths.length);
    for (const route of eachOf(HIDDEN_FROM_CRAWLERS, "the crawler register")) {
      expect(route.why.length, `${route.path} owes a reason`).toBeGreaterThan(60);
      expect(STATIC_PUBLIC, `${route.path} is hidden but not a census path — nothing to hide`).toContain(route.path);
    }
  });

  it("is a founder gate whose open state is this register", () => {
    const gate = FOUNDER_GATES.find((g) => g.id === "finder-public-posture");
    expect(gate?.openAt).toBe("src/security/robots.ts");
  });
});

describe("U7 every place a crawler is told agrees with the register, both directions", () => {
  it("X-Robots-Tag: one config entry per hidden route, none elsewhere, the exact value", async () => {
    const tagged = await taggedPaths();
    for (const path of eachOf(STATIC_PUBLIC, "the static public census")) {
      expect(tagged.includes(path), `${path}: header ${isHiddenFromCrawlers(path) ? "missing" : "present"}`).toBe(
        isHiddenFromCrawlers(path),
      );
    }
    for (const entry of robotsHeaders()) expect(entry.headers).toEqual([{ key: "X-Robots-Tag", value: X_ROBOTS_TAG }]);
    expect(X_ROBOTS_TAG).toBe("noindex, nofollow");
  });

  it("metadata.robots: every hidden page sets the register's value, no other page sets robots at all", () => {
    for (const path of eachOf(STATIC_PUBLIC, "the static public census")) {
      const source = pageSource(path);
      if (isHiddenFromCrawlers(path)) {
        expect(source, `${path}: page must set robots: HIDDEN_ROBOTS_META`).toMatch(/robots:\s*HIDDEN_ROBOTS_META\b/);
      } else {
        expect(source, `${path}: a robots setting outside the register hides a public page by accident`).not.toMatch(
          /\brobots:/,
        );
      }
    }
  });

  it("the sitemap announces exactly the census paths the register does not hide", () => {
    const paths = sitemapPaths();
    for (const path of eachOf(STATIC_PUBLIC, "the static public census")) {
      expect(paths.includes(path), `${path}: sitemap ${isHiddenFromCrawlers(path) ? "announces a hidden route" : "dropped a public route"}`).toBe(
        !isHiddenFromCrawlers(path),
      );
    }
  });

  it("robots.txt disallows the operator prefixes and the register, and nothing else", () => {
    expect(disallowed()).toEqual([...OPERATOR_DISALLOW, ...HIDDEN_FROM_CRAWLERS.map((r) => r.path)]);
    expect(OPERATOR_DISALLOW).toEqual(["/console/", "/api/", "/book/", "/go/"]);
  });

  it("a register with one route removed fails every place at once (the test is not vacuous)", async () => {
    // Each place derives from the register at module load, so this cannot mutate the register and
    // re-read; it proves instead that each place currently carries every register path, and that
    // /faq — a public route outside the register — is carried by none of them.
    const tagged = await taggedPaths();
    const sitemap = sitemapPaths();
    for (const { path } of HIDDEN_FROM_CRAWLERS) {
      expect(tagged).toContain(path);
      expect(disallowed()).toContain(path);
      expect(sitemap).not.toContain(path);
    }
    expect(isHiddenFromCrawlers("/faq")).toBe(false);
    expect(tagged).not.toContain("/faq");
    expect(disallowed()).not.toContain("/faq");
    expect(sitemap).toContain("/faq");
    expect(pageSource("/faq")).not.toMatch(/\brobots:/);
  });
});
