// What axe cannot measure, measured. Axe reports text on a gradient, an image or inside an SVG as
// "incomplete" and moves on, so a colour change there could fail AA with every scan green. This
// walks every screen the text budget walks, takes each incomplete node, hides its text, samples
// the pixels behind it, and holds the text colour to 4.5:1 (3:1 when large) against the median.
//
// It also holds a floor on size: no visible patient text under 12px, at the four widths PLAN.md
// §8 names: 320, 390, 768 and 1440 (W11). The care map's labels are held too: under 768px the wheel
// is four quarters (N8), and from 768px a node's name renders at 12px or more. Text drawn into
// decorative artwork (an aria-hidden SVG) and the logotype are pictures, not reading text.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { settle } from "./support/a11y";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { contextFor, reach, routes } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };
const PER_ROUTE = 60;
const SMALL_EXEMPT = "svg[aria-hidden='true'], .brand-mark";
/** Staff and clinician pages: their text is held by the console's own checks, not this patient floor. */
const NOT_PATIENT = new Set(["/clinicians"]);

/** Text colour, size and box for one node, with its text made invisible so the pixels behind show. */
async function probe(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return null;
    // Read before hiding: a computed style is live, and would report the transparent colour.
    const cs = getComputedStyle(el);
    const svg = el instanceof SVGElement;
    const scale = svg && (el as SVGGraphicsElement).getScreenCTM ? (el as SVGGraphicsElement).getScreenCTM()!.a : 1;
    const colour = svg ? cs.fill : cs.color;
    const size = parseFloat(cs.fontSize) * scale;
    const weight = Number(cs.fontWeight) || 400;
    el.setAttribute("data-contrast-probe", "");
    if (!document.getElementById("contrast-probe-style")) {
      const style = document.createElement("style");
      style.id = "contrast-probe-style";
      style.textContent = "[data-contrast-probe],[data-contrast-probe] *{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important}svg [data-contrast-probe],svg [data-contrast-probe] *,[data-contrast-probe] text,[data-contrast-probe] tspan,[data-contrast-probe] textPath{fill:transparent!important;stroke:transparent!important}";
      document.head.append(style);
    }
    const top = Math.max(0, r.top);
    return {
      clip: { x: Math.max(0, r.left), y: top, width: Math.min(r.width, innerWidth - Math.max(0, r.left)), height: Math.min(r.bottom, innerHeight) - top },
      colour,
      size,
      weight,
      text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
    };
  }, selector);
}

/**
 * The contrast of a colour against the median pixel of a screenshot, computed in a canvas on a
 * blank page: the app's own content security policy refuses a data: image, as it should.
 */
async function ratioOver(page: Page, colour: string, png: Buffer): Promise<number> {
  return page.evaluate(async ([c, data]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, img.width, img.height).data;
    const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const all: Array<[number, number, number, number]> = [];
    for (let i = 0; i < px.length; i += 4) all.push([lum(px[i]!, px[i + 1]!, px[i + 2]!), px[i]!, px[i + 1]!, px[i + 2]!]);
    all.sort((a, b) => a[0] - b[0]);
    const [, br, bg, bb] = all[Math.floor(all.length / 2)]!;
    // The text colour, resolved by the canvas itself so any CSS colour syntax reads the same way.
    const dot = document.createElement("canvas").getContext("2d")!;
    dot.fillStyle = `rgb(${br},${bg},${bb})`;
    dot.fillRect(0, 0, 1, 1);
    dot.fillStyle = c;
    dot.fillRect(0, 0, 1, 1);
    const [tr, tg, tb] = dot.getImageData(0, 0, 1, 1).data;
    const a = lum(tr!, tg!, tb!);
    const b = lum(br, bg, bb);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }, [colour, png.toString("base64")] as const);
}

/** Visible text under 12px on screen, outside the exemption, keyed by its nearest classed element. */
async function smallText(page: Page): Promise<Array<{ key: string; line: string }>> {
  return page.evaluate((exempt) => {
    const out: Array<{ key: string; line: string }> = [];
    const cls = (e: Element) => String((e.className as unknown as { baseVal?: string }).baseVal ?? e.className ?? "").split(" ").filter(Boolean)[0];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim();
      const el = node.parentElement;
      if (!text || !/[a-z0-9]/i.test(text) || !el || el.closest(`${exempt}, .sr-only, script, style, noscript, [hidden]`)) continue;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0 || r.width < 1 || r.height < 1) continue;
      const graphic = el as unknown as SVGGraphicsElement;
      const scale = el instanceof SVGElement && graphic.getScreenCTM ? graphic.getScreenCTM()!.a : 1;
      const size = parseFloat(cs.fontSize) * scale;
      if (size >= 11.95) continue;
      let key = el.tagName.toLowerCase() + (cls(el) ? `.${cls(el)}` : "");
      if (!cls(el)) {
        let up = el.parentElement;
        while (up && !cls(up)) up = up.parentElement;
        if (up) key = `${up.tagName.toLowerCase()}.${cls(up)} ${key}`;
      }
      out.push({ key, line: `"${text.slice(0, 30)}" at ${size.toFixed(1)}px (${key})` });
    }
    return out;
  }, SMALL_EXEMPT);
}

// The games' small labels were raised in N15, one game at a time, and the ledger that named them
// is gone: anything under 12px now fails at either width.
for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) test(`text axe cannot measure still clears AA, and nothing reads under 12px at ${viewport.width}`, async ({ browser, baseURL }) => {
  test.setTimeout(900_000);
  const base = baseURL!;
  const options = { ...contextFor(base), viewport } as Parameters<typeof browser.newContext>[0];
  let context = await browser.newContext(options);
  let page: Page = await context.newPage();
  const scratch = await (await browser.newContext()).newPage();
  const failures: string[] = [];
  const small: string[] = [];
  let sampled = 0;
  for (const route of routes() as Route[]) {
    try {
      if (route.state === "finder-results" || route.state === "finder-profile" || route.state === "finder-voice") {
        await context.close();
        context = await browser.newContext(options);
        page = await context.newPage();
      }
      await reach(page, route, base);
      await settle(page);
    } catch {
      continue; // The text-budget gate names a screen it cannot reach; this one measures what it can.
    }
    if (!NOT_PATIENT.has(route.path)) {
      for (const { line } of await smallText(page)) small.push(`${route.name}: ${line}`);
    }
    const scan = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
    const nodes = scan.incomplete.find((r) => r.id === "color-contrast")?.nodes ?? [];
    for (const node of nodes.slice(0, PER_ROUTE)) {
      if (node.target.length !== 1 || typeof node.target[0] !== "string") continue;
      const selector = node.target[0];
      const box = await probe(page, selector).catch(() => null);
      if (!box || box.clip.width < 2 || box.clip.height < 2) continue;
      // A row of dots or an arrow is a mark, not text anybody reads; only letters and digits count.
      if (!/[a-z0-9]/i.test(box.text)) {
        await page.evaluate((sel) => document.querySelector(sel)?.removeAttribute("data-contrast-probe"), selector);
        continue;
      }
      const png = await page.screenshot({ clip: box.clip, animations: "disabled" });
      await page.evaluate((sel) => document.querySelector(sel)?.removeAttribute("data-contrast-probe"), selector);
      const ratio = await ratioOver(scratch, box.colour, png);
      const large = box.size >= 24 || (box.size >= 18.66 && box.weight >= 700);
      const need = large ? 3 : 4.5;
      sampled += 1;
      if (ratio < need) failures.push(`${route.name}: "${box.text}" ${ratio.toFixed(2)}:1, needs ${need}:1 (${selector})`);
    }
  }
  await context.close();
  await scratch.context().close();
  console.log(`contrast-sampled at ${viewport.width}: ${sampled} nodes axe could not measure, sampled; ${failures.length} under AA; ${small.length} under 12px`);
  expect(sampled, "the sweep sampled something, so a green run means something").toBeGreaterThan(0);
  expect(failures, "text on gradients, images and SVG must clear AA").toEqual([]);
  expect(small, `no visible text under 12px at ${viewport.width}`).toEqual([]);
});
