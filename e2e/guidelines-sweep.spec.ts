// O167: the finder against the Web Interface Guidelines checklist, asserted on the rendered page.
//
// WHY A CHECKLIST FOUND WHAT LOOKING DID NOT. O166 audited the profile by eye and by canvas and
// fixed real faults. Fetching the full guidelines afterwards found three more on screens I had
// already decided were fine — a widow in the results headline at display scale, no `theme-color`,
// and an unprotected brand token. Two of the three are invisible in any desktop capture. That is
// the argument for the checklist: it does not get bored, and it does not agree with the person who
// wrote the CSS.
//
// AND ONE OF MY FOUR FINDINGS WAS A FALSE POSITIVE, which is recorded here rather than quietly
// dropped. The probe flagged an `<img>` with no `width`/`height` on the profile — the guidelines'
// named CLS anti-pattern. It is Next's `fill` variant, whose parent `.profile-portrait` carries an
// explicit `height: 388px`, so no shift is possible; the rule's INTENT is met by a different
// mechanism. Adding the attributes would have been redundant markup that Next ignores, dressed up
// as a fix.

import { expect, test, type Page } from "@playwright/test";

async function intoResults(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Try an example search" }).click();
  await page.getByRole("button", { name: "Search with this" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("the results headline does not end on a widow", async ({ page }) => {
  // MEASURED, NOT TRUSTED. Asserting `text-wrap: balance` is set would pass on a heading the
  // browser then broke badly anyway — the property is a request, and what matters is the line boxes
  // it produced. This reads the rendered lines via Range rects and checks the last one.
  await page.setViewportSize({ width: 390, height: 844 });
  await intoResults(page);
  const lines = await page.evaluate(() => {
    const h1 = document.querySelector(".results-head h1")!;
    const node = [...h1.childNodes].find((n) => n.nodeType === Node.TEXT_NODE) ?? h1.firstChild!;
    const text = node.textContent ?? "";
    const range = document.createRange();
    // One rect per rendered line, then the words that fall in the last one.
    range.selectNodeContents(node);
    const tops = [...range.getClientRects()].map((r) => Math.round(r.top));
    const lastTop = Math.max(...tops);
    let lastLineWords = 0;
    let cursor = 0;
    for (const word of text.split(/(\s+)/)) {
      if (word.trim()) {
        const r = document.createRange();
        r.setStart(node, cursor);
        r.setEnd(node, cursor + word.length);
        const rect = r.getBoundingClientRect();
        if (Math.round(rect.top) === lastTop) lastLineWords += 1;
      }
      cursor += word.length;
    }
    return { lineCount: new Set(tops).size, lastLineWords, text: text.trim() };
  });

  expect(lines.text.length, "the headline is empty — this test is looking at nothing").toBeGreaterThan(20);
  expect(lines.lineCount, "the headline fits on one line here, so it cannot show a widow").toBeGreaterThan(1);
  // A single word alone on the final line of a display-scale serif statement is the widow the
  // guidelines name `text-wrap: balance` for. It read "…the prescription, not / after." before O167.
  expect(
    lines.lastLineWords,
    `the results headline ends with ${lines.lastLineWords} word alone on its last line: "${lines.text}"`,
  ).toBeGreaterThan(1);
});

test("the browser chrome matches the paper, and still will after a palette change", async ({ page }) => {
  await page.goto("/");
  const agree = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return { meta: null as string | null, paper: null as string | null, same: false };
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const px = (value: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return `${d[0]},${d[1]},${d[2]}`;
    };
    const declared = meta.getAttribute("content")!;
    const paper = getComputedStyle(document.documentElement).getPropertyValue("--paper").trim();
    // Resolved through a canvas rather than string-compared: `--paper` may be a hex, an oklch() or
    // a color-mix, and the question is whether they are the same COLOUR.
    return { meta: declared, paper, same: px(declared) === px(paper) };
  });

  expect(agree.meta, "no <meta name=theme-color> — the address bar will not match the page").not.toBeNull();
  expect(
    agree.same,
    `theme-color ${agree.meta} and --paper ${agree.paper} are different colours — the chrome shows a seam`,
  ).toBe(true);
});

test("the wordmark resists auto-translation everywhere it renders", async ({ page }) => {
  // The guidelines ask for `translate="no"` on brand names, code tokens and identifiers. ADHD.ME is
  // all three — a name, a wordmark and the address somebody typed to get here — and several locales
  // will translate "ADHD" if allowed to, so a reader with translation on sees a product whose name
  // is not the address they used.
  //
  // SCOPED TO THE WORDMARK, DELIBERATELY, AND THE REASONING IS THE INTERESTING PART. The first
  // version swept every leaf node containing "ADHD.ME" and caught three things this rule is not
  // for: `<title>`, JSON inside `<script>`, and the brand's name INSIDE A SENTENCE (the
  // Acknowledgement of Country). The wordmark is an identifier being displayed as itself and must
  // survive translation intact. A brand name inside prose is a word in a sentence a reader has
  // asked to be translated, and wrapping each one in a span would fragment copy that this tree's
  // compliance linters scan as text — a real cost against a benefit nobody asked for. Considered
  // and declined, rather than swept up because the pattern matched.
  for (const path of ["/", "/approach"]) {
    await page.goto(path);
    const wordmarks = await page.evaluate(() =>
      [...document.querySelectorAll('[class*="wordmark"]')].map((el) => ({
        cls: String(el.className).split(" ")[0],
        text: (el.textContent ?? "").trim(),
        protectedFromTranslation: el.closest('[translate="no"]') !== null,
      })),
    );
    expect(wordmarks.length, `${path} renders no wordmark — this sweep is looking at nothing`).toBeGreaterThan(0);
    const bare = wordmarks.filter((w) => !w.protectedFromTranslation).map((w) => w.cls);
    expect(bare, `${path} renders a wordmark without translate="no": ${bare.join(", ")}`).toEqual([]);
  }
});

test("no founder-family word renders anywhere a reader can see", async ({ page }) => {
  // Founder-directed: "remove all mentions of founder on entire site do thorough code audit".
  // The disclosure line already has its own guard in finder-flow.spec.ts; this is the site-wide
  // version, over RENDERED text rather than source, because the instruction was about what a reader
  // sees. "founded" is included: the landing eyebrow read "Why we founded ADHD.ME" until O167.
  //
  // THE HEAD IS SWEPT TOO, BECAUSE THE FIRST VERSION OF THIS TEST MISSED TWO STRINGS. It read only
  // `body.innerText` and passed while `app/page.tsx` still exported the title "Why we founded
  // ADHD.ME" and a matching description — the tab a reader looks at before the page, and the line
  // a search result or a shared link shows instead of the page. A sweep of "the entire site" that
  // can only see the body checks the direction its author was facing, which is the same fault this
  // session found in four registers. Title and description are read here as text a reader meets.
  const FOUNDER = /\bco-?founder\b|\bfounders?\b|\bfounded\b/i;
  for (const path of ["/", "/story", "/approach", "/clinicians", "/practices"]) {
    await page.goto(path);
    const surfaces = await page.evaluate(() => ({
      body: document.body.innerText,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
      og: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "",
    }));
    expect(surfaces.body.length, `${path} rendered no text — this sweep is looking at nothing`).toBeGreaterThan(200);
    expect(surfaces.title.length, `${path} has no <title> — the head sweep is looking at nothing`).toBeGreaterThan(3);
    for (const [where, text] of Object.entries(surfaces)) {
      expect(text, `${path} renders a founder-family word in its ${where}: ${text.slice(0, 80)}`).not.toMatch(FOUNDER);
    }
  }
});
