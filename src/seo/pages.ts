// O241: the search register — one entry per indexable route, carrying the words that page is FOR.
//
// WHY A REGISTER AND NOT A PASS OVER THE PAGES. Every title and description in this tree was
// written by whoever last touched the page it sits on, and the result was what an audit always
// finds: `/approach` titled "Learn" (five characters), `/clinicians` titled "For GPs" (seven),
// descriptions running from 62 to 187 characters, and not one of the eight carrying the words a
// person would actually type. None of that is visible from inside any single page — it is only
// visible when the pages are read together, which is exactly the thing a census does and a code
// review does not.
//
// THE WINDOWS ARE THE SERP'S, NOT THE FILE'S. A title here is the HALF the page sets; the rendered
// title is `%s · ADHD.ME` (`app/layout.tsx`), so the ten characters of the suffix are part of what
// a search result shows and part of what the window measures. `renderedTitle()` is what the test
// measures and what `seoMetadata()` produces, and the two cannot disagree because they are the
// same function. Getting this wrong is the ordinary way a "50–60 character title" ships at 68.
//
// THE PAGES DERIVE FROM THIS FILE RATHER THAN BEING CHECKED AGAINST IT. `robots.ts` and
// `sitemap.ts` already work this way and the reason is the same: a register that DESCRIBES the
// pages is a second copy of the truth, and the second copy is the one that goes stale. Every
// indexable route's `export const metadata` is now `seoMetadata("/its-path")`, so a title that
// breaks a window cannot reach a page — it fails `pnpm test` before it is served.
//
// COVERAGE IS BORROWED, NOT RE-DERIVED. The indexable set is `sitemapPaths()`, which already
// filters the dynamic paths, the routes `src/security/robots.ts` hides, and a gated `/about`.
// Re-deriving it here would be a third opinion about which routes crawlers see, and three
// opinions is how they disagree. So the both-directions test is one line against that function:
// a new indexable route with no entry fails, and an entry naming a route that went hidden,
// dynamic or away fails too.
//
// WHAT THIS UNIT DELIBERATELY DID NOT DO, so the next reader does not think it was missed:
//
//   *No `aggregateRating` or `Review` markup*, whatever a generic SEO checklist says about rich
//   results. Ratings and testimonials on a regulated health service are prohibited by the National
//   Law and banned outright by this tree's §6 laws. The absence is a rule, not a gap.
//
//   *The finder stays hidden.* `/`, `/profile`, `/examples`, `/demo` and `/thanks` are absent from
//   this register because they are absent from the sitemap, and moving them is a FOUNDER GATE
//   (`finder-public-posture`, plan D-FINDER-PUBLIC) rather than an SEO decision. An SEO unit is
//   precisely the sort of unit that would quietly open that gate for the traffic.
//
//   *No H1 law yet, and this is a finding rather than a choice.* The on-page rule is that the H1
//   carries the page's primary keyword; four of the ten do not (`/faq` says "Questions",
//   `/clinicians` and `/clinicians/join` open on funnel questions, and `/practices` renders a
//   heading that lives in `landing-copy.ts` as a compliance constant). Three of those four H1s are
//   pinned by `e2e/support/working-truth.ts` proofs, so rewriting them is a copy unit with its own
//   verification, not a line in this one. `e2e/seo.spec.ts` enforces the part that IS true today —
//   exactly one H1 per indexable route — and the rest is written down here instead of pretended.

import type { Metadata } from "next";

export interface SeoPage {
  /** The route, spelled exactly as `sitemapPaths()` spells it. */
  readonly path: string;
  /**
   * The words this page is for, and the anti-cannibalisation key.
   *
   * Unique across the register BY RULE: two pages targeting one phrase is not two chances at it,
   * it is two pages splitting one page's signal, and the register is the only place that is
   * visible. Checked in the title's opening half and the description's opening 100 characters,
   * which is what "near the beginning" means when a result is truncated.
   */
  readonly keyword: string;
  /** The half the page sets. The suffix is added by the layout's template — see `renderedTitle`. */
  readonly title: string;
  readonly description: string;
}

/** What `app/layout.tsx`'s title template appends. Rendered length includes it. */
export const TITLE_SUFFIX = " · ADHD.ME";

/** The window a search result shows before it truncates. Measured on the RENDERED title. */
export const TITLE_WINDOW = { min: 50, max: 60 } as const;

export const DESCRIPTION_WINDOW = { min: 150, max: 160 } as const;

/** How far into each field a primary keyword may start and still count as leading it. */
export const KEYWORD_HEAD = {
  /** A fraction of the rendered title — the keyword belongs in its opening half. */
  title: 0.5,
  /** Characters. A description is truncated long before this on a phone. */
  description: 100,
} as const;

/**
 * Every indexable route, in the order `sitemapPaths()` produces them.
 *
 * Ten, not the eight this unit was claimed for: `/privacy/counsel-review` and
 * `/privacy/automated-decisions` are indexable too, and nobody had noticed because nothing had
 * ever listed the indexable routes in one place. That is the register earning its keep on the day
 * it was written.
 */
export const SEO_PAGES: readonly SeoPage[] = [
  {
    // O244 rewrote this page while O241 was in flight — the Learn tab is ADHD itself now, two
    // knowledge quizzes and five reading modules, not only the route to care. The entry moved with
    // it in the merge, which is the register doing its job: the page's words and its head cannot
    // drift apart, because the head is derived from here.
    path: "/approach",
    keyword: "learn about ADHD",
    title: "Learn about ADHD: short reads and two quizzes",
    description:
      "Learn about ADHD in short reads and quick quizzes: what the word means, what people find useful day to day, and how the route to a GP assessment works here.",
  },
  {
    path: "/clinicians",
    keyword: "ADHD listing for GPs",
    title: "ADHD listing for GPs: how being listed works",
    description:
      "An ADHD listing for GPs: what you declare, how a patient reaches you, and what the walkthrough covers before you decide whether to be listed here at all.",
  },
  {
    path: "/clinicians/join",
    keyword: "join the ADHD GP directory",
    title: "Join the ADHD GP directory as an Australian GP",
    description:
      "Join the ADHD GP directory: for GPs who carry this work and want to be findable by the people already looking for it. One email, and a person replies to you.",
  },
  {
    path: "/faq",
    keyword: "ADHD GP finder",
    title: "ADHD GP finder questions, answered plainly",
    description:
      "ADHD GP finder questions, answered plainly: what ADHD.ME is, what it costs, where in Australia it operates, and how the order the GPs are shown in is decided.",
  },
  {
    path: "/practices",
    keyword: "ADHD care in general practice",
    title: "ADHD care in general practice: for practices",
    description:
      "ADHD care in general practice, without the search: patients arrive already matched to the clinician in your practice who declared that work, with the reason.",
  },
  {
    path: "/privacy",
    keyword: "privacy policy",
    title: "Privacy policy for the ADHD.ME GP finder (draft)",
    description:
      "The privacy policy for ADHD.ME: what we hold, what we never hold, and the choices you keep at every point — stated as a draft while the product is a demo.",
  },
  {
    path: "/privacy/automated-decisions",
    keyword: "automated decisions",
    title: "Automated decisions: how the GP order is set",
    description:
      "Automated decisions at ADHD.ME: exactly what the software decides on its own, what it never decides, and how the order the GPs are shown in is worked out.",
  },
  {
    path: "/privacy/counsel-review",
    keyword: "legal check",
    title: "The legal check on our privacy policy and terms",
    description:
      "The legal check: why the ADHD.ME privacy policy and terms of use are marked draft, what an independent lawyer is checking, and when the banners come down.",
  },
  {
    path: "/story",
    keyword: "ADHD care in Australia",
    title: "ADHD care in Australia, and why we built this",
    description:
      "ADHD care in Australia asks for stamina rather than need. Why we built ADHD.ME: the front door was made for somebody with more time and money than most.",
  },
  {
    path: "/terms",
    keyword: "terms of use",
    title: "Terms of use for the ADHD.ME GP finder (draft)",
    description:
      "The terms of use for ADHD.ME: what it is and is not, what you agree to by using it, and where responsibility sits — a draft while the product is still a demo.",
  },
];

/**
 * Whether a route is deep enough to owe the reader — and a crawler — a trail.
 *
 * TWO SEGMENTS, and the threshold is the argument. A one-level page has nothing to say that its
 * own title does not already say, and a "Home ›" crumb above the app's own header would be chrome
 * apologising for itself. At two, the parent is real information: `/privacy/counsel-review` is
 * about `/privacy`, `/clinicians/join` is the end of `/clinicians`, and a search result for either
 * is improved by the hierarchy being stated. `app/breadcrumbs.tsx` emits the visible nav and the
 * `BreadcrumbList` from one list, so the markup cannot claim a path the reader was not shown.
 *
 * A floor, not a ceiling: `/faq` and `/terms` carry trails at depth one and keep them.
 */
export function needsBreadcrumbs(path: string): boolean {
  return path.split("/").filter(Boolean).length >= 2;
}

/** What a search result actually shows: the page's half plus the layout's template. */
export function renderedTitle(page: SeoPage): string {
  return `${page.title}${TITLE_SUFFIX}`;
}

export function seoPage(path: string): SeoPage | undefined {
  return SEO_PAGES.find((page) => page.path === path);
}

/** True when `keyword` appears at or before `within` characters, case-insensitively. */
export function keywordLeads(text: string, keyword: string, within: number): boolean {
  const at = text.toLowerCase().indexOf(keyword.toLowerCase());
  return at >= 0 && at <= within;
}

export interface SeoFinding {
  readonly path: string;
  readonly rule:
    | "title-length"
    | "description-length"
    | "duplicate-title"
    | "duplicate-description"
    | "duplicate-keyword"
    | "keyword-not-leading-title"
    | "keyword-not-leading-description";
  readonly detail: string;
}

/**
 * Every on-page rule this register can decide from the words alone.
 *
 * Takes the pages rather than reading the constant, so the test can plant a real violation and
 * require the real walk to find it — the shape U15's laws use, and the reason an empty finding
 * list here means something.
 */
export function seoFindings(pages: readonly SeoPage[] = SEO_PAGES): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const seen = { title: new Map<string, string>(), description: new Map<string, string>(), keyword: new Map<string, string>() };
  for (const page of pages) {
    const rendered = renderedTitle(page);
    if (rendered.length < TITLE_WINDOW.min || rendered.length > TITLE_WINDOW.max) {
      findings.push({ path: page.path, rule: "title-length", detail: `${rendered.length} characters rendered; the window is ${TITLE_WINDOW.min}–${TITLE_WINDOW.max}` });
    }
    if (page.description.length < DESCRIPTION_WINDOW.min || page.description.length > DESCRIPTION_WINDOW.max) {
      findings.push({ path: page.path, rule: "description-length", detail: `${page.description.length} characters; the window is ${DESCRIPTION_WINDOW.min}–${DESCRIPTION_WINDOW.max}` });
    }
    if (!keywordLeads(rendered, page.keyword, Math.floor(rendered.length * KEYWORD_HEAD.title))) {
      findings.push({ path: page.path, rule: "keyword-not-leading-title", detail: `"${page.keyword}" does not open "${rendered}"` });
    }
    if (!keywordLeads(page.description, page.keyword, KEYWORD_HEAD.description)) {
      findings.push({ path: page.path, rule: "keyword-not-leading-description", detail: `"${page.keyword}" is not in the first ${KEYWORD_HEAD.description} characters of the description` });
    }
    for (const [field, rule] of [["title", "duplicate-title"], ["description", "duplicate-description"], ["keyword", "duplicate-keyword"]] as const) {
      const value = page[field].toLowerCase();
      const owner = seen[field].get(value);
      if (owner !== undefined) findings.push({ path: page.path, rule, detail: `${field} is already ${owner}'s` });
      else seen[field].set(value, page.path);
    }
  }
  return findings;
}

/**
 * The metadata an indexable page exports. One canonical, one title half, one description, all
 * from the register — so the page cannot carry copy the register has never measured.
 *
 * Throws on an unknown path rather than falling back: a page asking for metadata it has no entry
 * for is the both-directions failure happening at build time, and a silent default would serve
 * the site's generic title under ten different URLs.
 */
export function seoMetadata(path: string): Metadata {
  const page = seoPage(path);
  if (!page) throw new Error(`O241: ${path} has no entry in SEO_PAGES. Add one, or it is not an indexable route.`);
  return {
    alternates: { canonical: page.path },
    title: page.title,
    description: page.description,
  };
}
