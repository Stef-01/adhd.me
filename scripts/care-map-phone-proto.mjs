// The care map on a phone (N8): the two layouts the founder is choosing between, drawn from the
// real data and palette and captured at 390x844. A prototype only; app/care-map.tsx is untouched.
//
//   node scripts/care-map-phone-proto.mjs
//
// Writes qa/ux-2026-09/care-map-phone-*.png and prints, per capture, the words (the text budget's
// own count: visible words, header and tabs apart), the smallest text and the smallest tap target.

import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
// Node 22.18 or later strips the types, so the model is imported as it is, not copied.
import { LAYERS, LAYER_LABELS, SUBDOMAINS } from "../src/model/layers.ts";
import { measure, words } from "./text-budget-lib.mjs";

const OUT = "qa/ux-2026-09";
const VIEWPORT = { width: 390, height: 844 };

/* Palette: read from the first :root block of app/globals.css. The layer pairs fall back to the
   values W9 gave them, so the script also runs on a tree from before they were tokens. */
const LAYER_FALLBACK = {
  "--layer-brain-bg": "#dcedfa", "--layer-brain-ink": "#24487a",
  "--layer-body-bg": "#fff8e6", "--layer-body-ink": "#785a00",
  "--layer-environment-bg": "#dcefe4", "--layer-environment-ink": "#0e6b3a",
  "--layer-people-bg": "#ebe0f7", "--layer-people-ink": "#5b3a8a",
};
const NEEDED = ["--paper", "--ink", "--muted", "--stone", "--line", "--accent", "--brand", "--brand-edge", "--signal", ...Object.keys(LAYER_FALLBACK)];
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const rootStart = css.indexOf(":root {");
const rootBlock = css.slice(rootStart, css.indexOf("\n}", rootStart));
const TOKENS = NEEDED.map((name) => {
  const value = rootBlock.match(new RegExp(`(?<![\\w-])${name}:\\s*([^;]+);`))?.[1].trim() ?? LAYER_FALLBACK[name];
  if (!value) throw new Error(`care-map-phone-proto: ${name} is not in app/globals.css`);
  return `${name}: ${value};`;
}).join(" ");

/* The app's sans, embedded so the capture needs no network; the system sans stands in without it. */
let FONT_FACE = "";
try {
  const file = import.meta.resolve("@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2");
  FONT_FACE = `@font-face { font-family: "Plus Jakarta Sans Variable"; font-weight: 200 800; src: url(data:font/woff2;base64,${readFileSync(new URL(file)).toString("base64")}) format("woff2"); }`;
} catch {}

/* The wheel's geometry: the same numbers as app/care-map.tsx, which is JSX and cannot be imported. */
const CX = 250;
const CY = 250;
const R_OUT = 244;
const R_IN = 64;
const WEDGE = { brain: [-90, 0], body: [0, 90], environment: [90, 180], people: [180, 270] };
const RINGS = [200, 100, 154];
const INSETS = [3, 4, 3];

const polar = (deg, r) => [CX + Math.cos((deg * Math.PI) / 180) * r, CY + Math.sin((deg * Math.PI) / 180) * r];
const partsOf = (layer) => SUBDOMAINS.filter((s) => s.layer === layer);
function wedgePath(layer) {
  const [a, b] = WEDGE[layer];
  const [x1, y1] = polar(a, R_OUT);
  const [x2, y2] = polar(b, R_OUT);
  const [x3, y3] = polar(b, R_IN);
  const [x4, y4] = polar(a, R_IN);
  return `M${x1} ${y1}A${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R_IN} ${R_IN} 0 0 0 ${x4} ${y4}Z`;
}
const DOTS = new Map();
for (const layer of LAYERS) {
  const [a, b] = WEDGE[layer];
  partsOf(layer).forEach((s, i, all) => {
    const deg = a + INSETS[i % 3] + (b - a - 2 * INSETS[i % 3]) * ((i + 0.5) / all.length);
    DOTS.set(s.id, polar(deg, RINGS[i % 3]));
  });
}

const svgIcon = (body, size = 22) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const ICON = {
  support: svgIcon(`<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m5.6 5.6 3.6 3.6m5.6 5.6 3.6 3.6m0-12.8-3.6 3.6m-5.6 5.6-3.6 3.6"/>`),
  learn: svgIcon(`<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>`),
  compass: svgIcon(`<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9z"/>`),
  gear: svgIcon(`<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>`),
  close: svgIcon(`<path d="M18 6 6 18M6 6l12 12"/>`, 20),
};

const STYLE = `
* { box-sizing: border-box; }
html, body { margin: 0; }
body { background: var(--paper); color: var(--ink); font-family: "Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
button { font: inherit; color: inherit; cursor: pointer; touch-action: manipulation; }
button:focus-visible, a:focus-visible, [role="button"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.platform-header { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; height: 68px; padding: 0 16px; background: var(--brand); border-bottom: 1px solid var(--brand-edge); }
.mark { display: flex; flex-direction: column; justify-content: center; min-height: 44px; color: var(--ink); text-decoration: none; line-height: 1; }
.mark span { font-size: 12px; font-weight: 800; letter-spacing: .34em; }
.mark b { font-size: 30px; font-weight: 800; letter-spacing: -.04em; }
.mark i { display: inline-block; width: 7px; height: 7px; margin-left: 2px; border-radius: 50%; background: var(--signal); }
.head-actions { display: flex; gap: 8px; }
.pill, .round { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border: 0; background: var(--paper); color: var(--ink); text-decoration: none; box-shadow: 0 1px 2px color-mix(in srgb, var(--ink) 12%, transparent); }
.pill { padding: 0 16px; border-radius: 999px; font-size: 15px; font-weight: 700; }
.round { width: 44px; border-radius: 50%; }
main { padding: 48px 16px 120px; }
h1 { margin: 0 0 26px; font-size: 28px; font-weight: 700; letter-spacing: -.035em; line-height: 1.18; }
.wheel { display: block; margin: 0 auto; }
.quadrant { cursor: pointer; }
.group { margin-top: 24px; }
.group h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; font-size: 17px; font-weight: 700; letter-spacing: -.01em; }
.parts { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.part { min-height: 44px; padding: 0 14px; border: 1.5px solid var(--l-ink); border-radius: 999px; background: var(--paper); color: var(--l-ink); font-size: 15px; font-weight: 700; }
.part[aria-pressed="true"] { padding: 0 12.5px; border: 3px solid var(--ink); background: var(--l-bg); }
.app-tabs { position: fixed; right: 0; bottom: 0; left: 0; z-index: 2; display: flex; gap: 8px; height: 76px; padding: 8px 16px; border-top: 1px solid var(--line); background: color-mix(in srgb, var(--paper) 92%, transparent); backdrop-filter: blur(16px) saturate(1.4); }
.app-tabs a { display: flex; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 4px; border-radius: 16px; color: var(--ink); font-size: 13px; font-weight: 700; text-decoration: none; }
.app-tabs a[aria-current="page"] { background: var(--brand); }
.sheet { position: fixed; right: 0; bottom: 0; left: 0; z-index: 3; padding: 22px 20px 30px; border-top: 1px solid var(--line); border-radius: 24px 24px 0 0; background: var(--paper); box-shadow: 0 -12px 40px color-mix(in srgb, var(--ink) 14%, transparent); }
.sheet h2 { margin: 0 56px 8px 0; font-size: 20px; font-weight: 700; letter-spacing: -.015em; }
.sheet p { margin: 0; color: var(--muted); font-size: 16px; line-height: 1.5; }
.sheet .close { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--stone); }
`;

function screen(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>${FONT_FACE} :root { ${TOKENS} } ${STYLE}</style></head><body>
<header class="platform-header">
  <a class="mark" href="#"><span>ADHD</span><b>me<i></i></b></a>
  <div class="head-actions"><a class="pill" href="#">Urgent help</a><button class="round" aria-label="Settings">${ICON.gear}</button></div>
</header>
<main>
  <h1>Where ADHD sits in a life.</h1>
  ${content}
</main>
<nav class="app-tabs" aria-label="Main">
  <a href="#">${ICON.support}<span>Support</span></a>
  <a href="#" aria-current="page">${ICON.learn}<span>Learn</span></a>
  <a href="#">${ICON.compass}<span>My ADHD</span></a>
</nav>
</body></html>`;
}

/** "You" on paper at the centre, sized in screen pixels whatever the wheel's width. */
const centre = (u) => `<circle cx="${CX}" cy="${CY}" r="${R_IN - 6}" style="fill: var(--paper)"/>
  <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" font-size="${15 * u}" font-weight="700" style="fill: var(--ink)">You</text>`;

/** A 24px wheel with one quarter coloured: which part of the big wheel a list belongs to. */
const mini = (layer) => `<svg viewBox="0 0 500 500" width="24" height="24" aria-hidden="true">${LAYERS.map((l) =>
  `<path d="${wedgePath(l)}" style="fill: var(${l === layer ? `--layer-${l}-ink` : "--line"}); stroke: var(--paper)" stroke-width="24"/>`).join("")}</svg>`;

/** Option 1's wheel: every part a dot in its quarter. A picture, not a control; the names below are. */
function dotWheel(px, chosen) {
  const u = 500 / px;
  const wedges = LAYERS.map((l) => `<path d="${wedgePath(l)}" style="fill: var(--layer-${l}-bg); stroke: var(--paper)" stroke-width="4"/>`).join("");
  const dots = SUBDOMAINS.map((s) => {
    const [x, y] = DOTS.get(s.id);
    const ring = s.id === chosen ? `<circle cx="${x}" cy="${y}" r="${14 * u}" style="fill: var(--paper); stroke: var(--ink)" stroke-width="${3 * u}"/>` : "";
    return `${ring}<circle cx="${x}" cy="${y}" r="${(s.id === chosen ? 7 : 6) * u}" style="fill: var(--layer-${s.layer}-ink)"/>`;
  }).join("");
  return `<svg class="wheel" viewBox="0 0 500 500" width="${px}" height="${px}" role="img" aria-label="Brain, body, environment and people, with a dot for each part">${wedges}${centre(u)}${dots}</svg>`;
}

/** A quarter's names, each a button. */
const group = (layer, chosen) => `<section class="group" style="--l-bg: var(--layer-${layer}-bg); --l-ink: var(--layer-${layer}-ink)">
  <h2>${mini(layer)}${LAYER_LABELS[layer]}</h2>
  <ul class="parts">${partsOf(layer).map((s) => `<li><button class="part" aria-pressed="${s.id === chosen}">${s.label}</button></li>`).join("")}</ul>
</section>`;

/** A chosen part: its name and what it means, over the foot of the page. */
function sheet(id) {
  const s = SUBDOMAINS.find((e) => e.id === id);
  return `<section class="sheet" role="dialog" aria-labelledby="sheet-title"><h2 id="sheet-title">${s.label}</h2><p>${s.meaning}</p><button class="close" aria-label="Close">${ICON.close}</button></section>`;
}

/** Option 2's wheel: four quarters, each a button that opens its list. The open one is ringed in ink. */
function quadrantWheel(px, open) {
  const u = 500 / px;
  const quarter = (l) => {
    const [a, b] = WEDGE[l];
    const [x, y] = polar((a + b) / 2, 156);
    const isOpen = l === open;
    return `<g class="quadrant" role="button" tabindex="0" aria-expanded="${isOpen}">
      <path d="${wedgePath(l)}" style="fill: var(--layer-${l}-bg); stroke: var(${isOpen ? "--ink" : "--paper"})" stroke-width="${isOpen ? 3 * u : 4}"/>
      <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${18 * u}" font-weight="700" style="fill: var(--layer-${l}-ink)">${LAYER_LABELS[l]}<tspan aria-hidden="true" dx="${6 * u}">${isOpen ? "−" : "+"}</tspan></text>
    </g>`;
  };
  // The open quarter is drawn last so its ink ring is not covered by a neighbour.
  const order = [...LAYERS.filter((l) => l !== open), ...LAYERS.filter((l) => l === open)];
  return `<svg class="wheel" viewBox="0 0 500 500" width="${px}" height="${px}" role="group" aria-label="The care map">${order.map(quarter).join("")}${centre(u)}</svg>`;
}

const DOT_WHEEL = 272;
const FULL_WHEEL = 358;
const CHOSEN = "memory";
const option1 = screen(dotWheel(DOT_WHEEL) + LAYERS.map((l) => group(l)).join(""));
const CAPTURES = [
  { file: "care-map-phone-option-1.png", label: "Option 1, dots and lists", html: option1 },
  { file: "care-map-phone-option-1-full.png", label: "Option 1, the whole page", html: option1, fullPage: true },
  { file: "care-map-phone-option-1-tapped.png", label: "Option 1, Working memory tapped", html: screen(dotWheel(DOT_WHEEL, CHOSEN) + LAYERS.map((l) => group(l, CHOSEN)).join("") + sheet(CHOSEN)) },
  { file: "care-map-phone-option-2.png", label: "Option 2, four quadrants", html: screen(quadrantWheel(FULL_WHEEL)) },
  { file: "care-map-phone-option-2-open.png", label: "Option 2, Brain open", html: screen(quadrantWheel(FULL_WHEEL, "brain") + group("brain")) },
];

/** The smallest text in CSS pixels (SVG text scaled by its wheel), in the map and in the whole
    screen, and the smallest control. */
const floors = () => {
  const smallest = (root) => {
    let min = { px: Infinity, text: "" };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!node.textContent.trim() || el.closest("style, script")) continue;
      const svg = el.closest("svg");
      const px = parseFloat(getComputedStyle(el).fontSize) * (svg ? svg.getScreenCTM().a : 1);
      if (px < min.px) min = { px: Math.round(px * 10) / 10, text: node.textContent.trim() };
    }
    return min;
  };
  let target = { px: Infinity, name: "" };
  for (const el of document.querySelectorAll("a, button, [role='button']")) {
    const r = el.getBoundingClientRect();
    const px = Math.round(Math.min(r.width, r.height));
    if (px < target.px) target = { px, name: el.getAttribute("aria-label") || el.textContent.trim() };
  }
  return { map: smallest(document.querySelector("main")), all: smallest(document.body), target };
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
console.log(`${"capture".padEnd(36)}words  chrome  smallest text: map, all   smallest target`);
for (const c of CAPTURES) {
  await page.setViewportSize(VIEWPORT);
  await page.setContent(c.html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // A whole-page capture grows the viewport to the page, so the fixed tab bar sits at its foot
  // rather than over the middle of the lists.
  const height = c.fullPage ? await page.evaluate(() => document.documentElement.scrollHeight) : VIEWPORT.height;
  await page.setViewportSize({ width: VIEWPORT.width, height });
  await page.screenshot({ path: `${OUT}/${c.file}` });
  const rows = await measure(page);
  const total = rows.filter((r) => !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const chrome = rows.filter((r) => r.chrome).reduce((n, r) => n + words(r.text), 0);
  const { map, all, target } = await page.evaluate(floors);
  const px = (t) => `${t.px}px "${t.text}"`;
  console.log(`${c.label.padEnd(36)}${String(total).padEnd(7)}${String(chrome).padEnd(8)}${`${px(map)}, ${px(all)}`.padEnd(26)}${target.px}px "${target.name}"`);
}
await browser.close();
