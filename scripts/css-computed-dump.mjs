/**
 * O96: the byte-identical proof for a CSS re-section.
 *
 * The refactor lane's law for globals.css is that no selector or declaration changes — only
 * the ORDER of rules and the comments around them. Order is not free in CSS: two rules of
 * equal specificity are decided by which one comes last, so a move can silently flip a
 * computed value with nothing in the diff to show it. This dumps what the browser actually
 * computed — every element, every property in the surface's own set — for every route and
 * every finder stage, at both viewports, so before and after can be compared byte for byte.
 *
 * O60 proved a type migration the same way with captures; this is the same argument made
 * machine-checkable, because 5,981 lines of moves are past what eyes can hold.
 *
 * Usage: node scripts/css-computed-dump.mjs <output-file> [base-url]
 */

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire("/home/user/ADHD/package.json");
const { chromium } = require("@playwright/test");

const OUT = process.argv[2];
const BASE = process.argv[3] ?? "http://localhost:3000";
if (!OUT) {
  console.error("usage: node scripts/css-computed-dump.mjs <output-file> [base-url]");
  process.exit(1);
}

/** Every route the app serves, so no surface's rules can move unwatched. */
const ROUTES = [
  "/", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples", "/faq",
  "/finder", "/practices", "/privacy", "/privacy/automated-decisions",
  "/privacy/counsel-review", "/terms", "/thanks", "/console", "/console/signin",
];

/** Phone and desktop: the media queries are part of what must not move. */
const VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "1280x900", width: 1280, height: 900 },
];

/**
 * The properties worth dumping: everything that layout, colour, type or motion depends on.
 * A fixed list keeps the dump stable across Chromium's own property-set changes and keeps
 * the file to a size that diffs usefully.
 */
const PROPERTIES = [
  "display", "position", "top", "right", "bottom", "left", "z-index", "float", "clear",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius",
  "border-bottom-right-radius", "outline-width", "outline-style", "outline-color",
  "box-shadow", "background-color", "background-image", "background-size",
  "background-position", "background-repeat", "background-clip", "color", "opacity",
  "font-family", "font-size", "font-weight", "font-style", "font-variant-numeric",
  "line-height", "letter-spacing", "word-spacing", "text-align", "text-decoration-line",
  "text-transform", "text-overflow", "white-space", "overflow-x", "overflow-y",
  "overflow-wrap", "flex-direction", "flex-wrap", "flex-grow", "flex-shrink",
  "flex-basis", "justify-content", "align-items", "align-self", "align-content", "gap",
  "grid-template-columns", "grid-template-rows", "grid-column", "grid-row",
  "grid-auto-flow", "order", "transform", "transform-origin", "transition-property",
  "transition-duration", "transition-timing-function", "animation-name",
  "animation-duration", "visibility", "pointer-events", "cursor", "touch-action",
  "list-style-type", "aspect-ratio", "object-fit", "mix-blend-mode", "filter",
  "backdrop-filter", "content", "clip-path", "isolation", "contain",
];

/**
 * A path that names an element by its position in the tree, so the two dumps line up even
 * though no id survives a re-render. Text content is deliberately NOT part of the key: the
 * dump is about style, and copy is a different unit's business.
 */
const COLLECT = (props) => {
  const path = (el) => {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.documentElement) {
      const parent = node.parentElement;
      const index = parent ? Array.prototype.indexOf.call(parent.children, node) : 0;
      parts.unshift(`${node.tagName.toLowerCase()}[${index}]`);
      node = parent;
    }
    return `html/${parts.join("/")}`;
  };

  const lines = [];
  // <head> is deliberately excluded. Next.js varies the number and order of its
  // metadata tags between builds (preload hints, the build id), so head elements
  // produced a steady 20-line diff on a change that touched nothing visible —
  // noise that would eventually hide a real finding behind "it always does that".
  // Nothing in head renders, so nothing in head is this dump's business.
  // `html` and `body` carry the page ground and the base type, so they are dumped
  // explicitly rather than lost with the rest of the non-body tree.
  const all = [document.documentElement, document.body, ...document.body.querySelectorAll("*")];
  for (const el of all) {
    // Scripts and styles have no visual computed state worth pinning.
    if (el.tagName === "SCRIPT" || el.tagName === "STYLE" || el.tagName === "LINK") continue;
    const computed = window.getComputedStyle(el);
    const values = props.map((prop) => `${prop}=${computed.getPropertyValue(prop)}`);
    lines.push(`${path(el)}\t${el.className || ""}\t${values.join("|")}`);
    // Pseudo-elements carry a lot of this design's rules (rules, marks, quotes).
    for (const pseudo of ["::before", "::after"]) {
      const ps = window.getComputedStyle(el, pseudo);
      if (ps.getPropertyValue("content") === "none") continue;
      const pv = props.map((prop) => `${prop}=${ps.getPropertyValue(prop)}`);
      lines.push(`${path(el)}${pseudo}\t${el.className || ""}\t${pv.join("|")}`);
    }
  }
  return lines;
};

/** The finder is a state machine, so its later screens exist only after a walk. */
async function finderStages(page, dump, label) {
  await page.goto(`${BASE}/finder`, { waitUntil: "networkidle" });
  await dump(`${label}\t/finder#welcome`);

  await page.getByRole("button", { name: /Talk instead of typing/i }).click();
  await page.locator(".listening-screen").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(600);
  await dump(`${label}\t/finder#listening`);

  await page.getByRole("button", { name: "Type instead" }).click();
  await page.locator(".type-screen").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(600);
  await dump(`${label}\t/finder#type`);

  await page.goto(`${BASE}/finder`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Try a demo scenario/i }).click();
  await page.locator(".scenario-screen").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(600);
  await dump(`${label}\t/finder#scenarios`);

  await page.getByRole("button", { name: "Try this scenario" }).click();
  await page.locator(".clinician-list").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(800);
  await dump(`${label}\t/finder#results`);

  await page.locator(".clinician-row").first().click();
  await page.locator(".profile-screen").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(800);
  await dump(`${label}\t/finder#profile`);

  await page.locator(".profile-footer button").click();
  await page.locator(".booking-screen").waitFor({ state: "visible", timeout: 5000 });
  await page.waitForTimeout(800);
  await dump(`${label}\t/finder#booking`);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const out = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    // Motion is time-dependent; the reduced-motion static equal is the stable state to dump,
    // and it is also the branch a refactor is likeliest to break silently.
    reducedMotion: "reduce",
  });
  // The finder's listening screen needs a recogniser to exist at all — the same stand-in the
  // voice spec installs, minus the drivers it does not need here.
  await context.addInitScript(() => {
    const w = window;
    class Fake {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 0;
      onresult = null; onerror = null; onend = null; onstart = null;
      start() {} stop() { this.onend?.(); } abort() {}
    }
    w.SpeechRecognition = Fake;
    delete w.webkitSpeechRecognition;
    // The consent banner overlays every page; dismissing it by storage keeps the dump about
    // the page rather than about which banner state a run happened to land in.
    try { w.localStorage.setItem("adhdme-privacy-ack", "1"); } catch {}
  });
  const page = await context.newPage();

  const dump = async (label) => {
    const lines = await page.evaluate(COLLECT, PROPERTIES);
    for (const line of lines) out.push(`${label}\t${line}`);
  };

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await dump(`${viewport.name}\t${route}`);
  }

  await finderStages(page, dump, viewport.name);
  await context.close();
}

await browser.close();
writeFileSync(OUT, out.join("\n") + "\n");
console.log(`wrote ${out.length} computed-style lines to ${OUT}`);
