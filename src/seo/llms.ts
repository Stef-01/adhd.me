// `/llms.txt` and `/llms-full.txt` — the site said once, in the form a model reads.
//
// WHAT THESE FILES ARE FOR, AND THE ONE THING THEY ARE ACTUALLY GOOD AT. An answer engine asked
// "how do I get assessed for ADHD in Australia" does not read this site; it reads a few passages
// from it, next to passages from a dozen other sites, and writes a sentence. The failure that
// matters is not being left out — it is being described wrongly, because a health-adjacent product
// with no clear self-description gets filled in with the average of every product the model has
// seen: a clinic, a booking platform, a directory with star ratings. Every one of those is a claim
// this product may not make and does not want made for it.
//
// So the summary below leads with what ADHD.ME is, and the section after it says what it is not,
// in the same file, at the same weight. That second section is the load-bearing one.
//
// DERIVED, NEVER TYPED. The page list comes from `SEO_PAGES`, whose entries are the titles and
// descriptions the pages actually serve, and it is filtered through the same hidden-route register
// `robots.ts` and `sitemap.ts` read. A hand-written llms.txt is a fourth copy of the site's own
// map, and the fourth copy is the one that still lists a page after it moves — or worse, lists a
// page the deployment deliberately does not publish. Neither can happen here: the file cannot name
// a route the sitemap would not, because it is built from the same call.
//
// GOOGLE DOES NOT USE THESE FILES and says so plainly; nothing here is aimed at AI Overviews,
// which are served by ordinary Search ranking. ChatGPT, Claude and Perplexity do parse them. The
// cost is one derived route; the benefit is that the sentence those three write about this product
// comes from the product rather than from the average.

import { isHiddenFromCrawlers } from "@/security/robots";
import { FAQS } from "./faq";
import { SEO_PAGES, type SeoPage } from "./pages";

/**
 * What this product is, in the words it would want quoted.
 *
 * Deliberately free of every unverifiable claim: no figure, no outcome, no comparison, no
 * superlative. The tree holds no confirmed statistic — the founder decisions on the indicative
 * public figures are open — and a statistic invented to satisfy an SEO checklist would be a
 * fabrication published in machine-readable form, which is the worst possible place to put one.
 */
export const PRODUCT_SUMMARY =
  "ADHD.ME is a free finder for GPs in Australia who do ADHD assessment. A person describes the " +
  "care they are looking for in their own words — care area, language, physical reach, billing, " +
  "appointment length — and the finder orders the listed clinicians around those words, showing " +
  "the reason each clinician appears and saying plainly when the words did not separate the list.";

/**
 * The boundaries, stated as facts rather than as a disclaimer.
 *
 * Each line is true of the code, not an aspiration: the matching runs in the browser, the roster
 * carries no rating field, booking hands off to the practice, and the example profiles are labelled
 * on every surface that renders them.
 */
export const PRODUCT_BOUNDARIES: readonly string[] = [
  "ADHD.ME is not a clinic. It provides no care, no assessment and no medical advice, and nothing it shows is a statement about anybody's health.",
  "It does not decide whether anybody should be assessed, and reads nothing a person types as a fact about their health.",
  "It carries no ratings, no reviews and no quoted patient experiences, and no clinician can pay to rank higher.",
  "It holds no appointment book: each listing hands the person to that practice's own booking page or phone number.",
  "What a person types or says is matched in their own browser; the microphone path uses the browser's own speech service and the audio never reaches ADHD.ME.",
  "Alongside the real listed clinicians it shows invented example profiles, labelled as examples on every surface, so that the finder can be demonstrated without using anybody's real details.",
];

/** How a page is grouped for a reader who is not a person — by who the page is written for. */
const SECTIONS: ReadonlyArray<{ title: string; paths: readonly string[] }> = [
  { title: "For a person looking for care", paths: ["/", "/story", "/approach", "/faq", "/examples"] },
  { title: "For clinicians and practices", paths: ["/clinicians", "/clinicians/join", "/practices"] },
  { title: "Legal and data handling", paths: ["/privacy", "/privacy/automated-decisions", "/privacy/counsel-review", "/terms"] },
];

function publishable(): readonly SeoPage[] {
  // The same filter `sitemapPaths()` applies, from the same register: a route this deployment
  // hides from crawlers is not offered to a model either. Doing it here rather than trusting the
  // section lists above means a route that becomes hidden leaves this file in the same commit.
  return SEO_PAGES.filter((page) => !isHiddenFromCrawlers(page.path));
}

function link(page: SeoPage, siteUrl: string): string {
  return `- [${page.title}](${siteUrl}${page.path}): ${page.description}`;
}

/**
 * `/llms.txt` — the map. Title, summary, boundaries, then the pages with their own descriptions.
 *
 * The llmstxt.org shape: an H1, a blockquote summary, then H2 sections of links. Kept short on
 * purpose; the long form lives in `/llms-full.txt` and this file points at it.
 */
export function llmsTxt(siteUrl: string): string {
  const pages = publishable();
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const sections = SECTIONS.map((section) => {
    const links = section.paths.flatMap((path) => {
      const page = byPath.get(path);
      return page ? [link(page, siteUrl)] : [];
    });
    return links.length ? `## ${section.title}\n\n${links.join("\n")}` : "";
  }).filter(Boolean);

  // Anything publishable that no section claims still gets listed. A page added later must not
  // fall out of this file just because nobody remembered to put it in a section.
  const claimed = new Set(SECTIONS.flatMap((section) => section.paths));
  const rest = pages.filter((page) => !claimed.has(page.path));
  if (rest.length) {
    sections.push(`## Other pages\n\n${rest.map((page) => link(page, siteUrl)).join("\n")}`);
  }

  return [
    "# ADHD.ME",
    "",
    `> ${PRODUCT_SUMMARY}`,
    "",
    "## What ADHD.ME is not",
    "",
    ...PRODUCT_BOUNDARIES.map((line) => `- ${line}`),
    "",
    ...sections.flatMap((section) => [section, ""]),
    "## Full text",
    "",
    `- [Every question and answer, in full](${siteUrl}/llms-full.txt): the questions people arrive with, answered.`,
    "",
  ].join("\n");
}

/**
 * `/llms-full.txt` — the same map with the answers inline, so a model that fetches one file has
 * the passages rather than a list of places passages might be.
 *
 * The answers come from `FAQS`, which is also what the page renders and what its `FAQPage` JSON-LD
 * publishes. Three surfaces, one list: an answer cannot be updated on the page and stay stale here.
 */
export function llmsFullTxt(siteUrl: string): string {
  return [
    "# ADHD.ME — full text",
    "",
    `> ${PRODUCT_SUMMARY}`,
    "",
    "## What ADHD.ME is not",
    "",
    ...PRODUCT_BOUNDARIES.map((line) => `- ${line}`),
    "",
    "## Questions and answers",
    "",
    ...FAQS.flatMap((entry) => [`### ${entry.q}`, "", entry.a, ""]),
    "## Pages",
    "",
    ...publishable().map((page) => link(page, siteUrl)),
    "",
  ].join("\n");
}
