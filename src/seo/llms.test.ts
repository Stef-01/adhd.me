// The AI-search surfaces, held to the two things that can silently go wrong with them.
//
// The first is a machine-readable file that publishes a route the site does not: `/llms.txt` is
// built from the same registers as the sitemap precisely so that cannot happen, and the cheapest
// way for it to start happening again is somebody hand-listing a path in `SECTIONS`.
//
// The second is copy. These files are read by systems that will repeat what they find, so every
// sentence in them is public copy and answers to the same linter as a page — which nothing checked
// before, because until now no copy lived outside a rendered surface.

import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "../compliance/landing";
import { lintMessageText } from "../messaging/templates";
import { isHiddenFromCrawlers } from "../security/robots";
import { AI_CRAWLERS, crawlersFor } from "./ai-crawlers";
import { ANSWER_WORDS, answerWords, FAQS } from "./faq";
import { llmsFullTxt, llmsTxt, PRODUCT_BOUNDARIES, PRODUCT_SUMMARY } from "./llms";
import { seoFindings, SEO_PAGES } from "./pages";

const SITE = "https://adhd.me";

describe("llms.txt", () => {
  const text = llmsTxt(SITE);

  it("names every page the sitemap would, and none it would not", () => {
    for (const page of SEO_PAGES) {
      const shown = text.includes(`${SITE}${page.path})`);
      expect(shown, `${page.path}: hidden=${isHiddenFromCrawlers(page.path)} but shown=${shown}`).toBe(
        !isHiddenFromCrawlers(page.path),
      );
    }
  });

  it("hands a model nothing the site itself withholds", () => {
    // The register is EMPTY today — the 2026-09-03 strip opened the whole site — so this asserts
    // the WIRING rather than a posture: whatever `isHiddenFromCrawlers` says, this file agrees
    // with it. The failure it guards is the one that would be invisible: an AI-readable file
    // published from a hand-kept list, still naming a route robots.txt had started refusing.
    for (const page of SEO_PAGES) {
      if (isHiddenFromCrawlers(page.path)) expect(text).not.toContain(`${SITE}${page.path})`);
    }
    // And it names no route that is not in the register at all — no hand-typed path.
    const named = [...text.matchAll(new RegExp(`\\(${SITE}([^)]*)\\)`, "g"))].map((m) => m[1]);
    const known = new Set<string>([...SEO_PAGES.map((p) => p.path), "/llms-full.txt"]);
    for (const path of named) expect(known.has(path!), `${path} is named but is not a register page`).toBe(true);
  });

  it("leads with what the product is and states what it is not", () => {
    expect(text.indexOf(PRODUCT_SUMMARY)).toBeGreaterThan(-1);
    expect(text).toContain("## What ADHD.ME is not");
    for (const line of PRODUCT_BOUNDARIES) expect(text).toContain(line);
    // The boundaries are the load-bearing half; they must not drift below the page list, where a
    // model reading only the head of the file would miss them.
    expect(text.indexOf("## What ADHD.ME is not")).toBeLessThan(text.indexOf("## For a person"));
  });

  it("is public copy, and passes the same rules a public page does", () => {
    const copy = [PRODUCT_SUMMARY, ...PRODUCT_BOUNDARIES].join(" ");
    expect(lintLandingCopy(copy)).toEqual([]);
    expect(lintMessageText(copy)).toEqual([]);
  });
});

describe("llms-full.txt", () => {
  const text = llmsFullTxt(SITE);

  it("carries every question and its whole answer", () => {
    for (const entry of FAQS) {
      expect(text).toContain(`### ${entry.q}`);
      expect(text).toContain(entry.a);
    }
  });
});

describe("the answers", () => {
  it("sit in the band a passage is extracted at whole", () => {
    for (const entry of FAQS) {
      const words = answerWords(entry);
      expect(words, `"${entry.q}" is ${words} words`).toBeGreaterThanOrEqual(ANSWER_WORDS.min);
      expect(words, `"${entry.q}" is ${words} words`).toBeLessThanOrEqual(ANSWER_WORDS.max);
    }
  });

  it("say nothing the copy laws forbid", () => {
    for (const entry of FAQS) {
      expect(lintLandingCopy(`${entry.q} ${entry.a}`), entry.q).toEqual([]);
      expect(lintMessageText(`${entry.q} ${entry.a}`), entry.q).toEqual([]);
    }
  });

  it("asks each question once and answers each one differently", () => {
    expect(new Set(FAQS.map((f) => f.q)).size).toBe(FAQS.length);
    expect(new Set(FAQS.map((f) => f.a)).size).toBe(FAQS.length);
  });
});

describe("the page register these files publish", () => {
  it("has nothing outside the title and description windows", () => {
    // `src/seo/pages.test.ts` was deleted in the 2026-09-03 strip. This is not that file coming
    // back — it is the one assertion the surfaces below depend on: `/llms.txt` republishes every
    // title and description verbatim, so an unmeasured one is now published twice.
    expect(seoFindings()).toEqual([]);
  });
});

describe("the AI crawler register", () => {
  it("names each agent once, with a reason", () => {
    expect(new Set(AI_CRAWLERS.map((c) => c.agent)).size).toBe(AI_CRAWLERS.length);
    for (const crawler of AI_CRAWLERS) {
      expect(crawler.agent.length, crawler.agent).toBeGreaterThan(0);
      expect(crawler.why.length, `${crawler.agent} has no argument`).toBeGreaterThan(60);
    }
  });

  it("splits into the two postures, and neither side is empty", () => {
    // An empty side would mean the distinction had quietly collapsed into "allow everything" or
    // "block everything", which is the decision this register exists to keep from being made by
    // default.
    expect(crawlersFor("retrieval").length).toBeGreaterThan(0);
    expect(crawlersFor("training").length).toBeGreaterThan(0);
    expect(crawlersFor("retrieval").length + crawlersFor("training").length).toBe(AI_CRAWLERS.length);
  });
});
