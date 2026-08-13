// W46: sales deck generator. Content comes from ./content with every figure
// resolved through the register, so the deck cannot state a number the repo cannot
// source. Palette is Meherr's own measurement teal — chosen for this product
// rather than defaulted to corporate blue — with one motif carried throughout:
// a filled circle marking each numbered idea.

import pptxgen from "pptxgenjs";
import { DECK } from "@/collateral/content";
import { resolveFigures } from "@/collateral/render";

const INK = "14201F";
const TEAL = "028090";
const SEAFOAM = "00A896";
const MIST = "F2F5F4";
const WHITE = "FFFFFF";
const MUTED = "5B6B68";

const TITLE_FONT = "Cambria";
const BODY_FONT = "Calibri";

/**
 * Slide geometry, exported so a test can prove nothing lands off-canvas or inside
 * the margin. Pixel-level visual QA (LibreOffice render) is unavailable in this
 * build sandbox, so the bounds check stands in for the defect it would catch first:
 * content crossing a slide boundary.
 */
export const LAYOUT = {
  slideW: 13.3,
  slideH: 7.5,
  margin: 0.5,
  card: { x0: 0.9, dx: 4.05, w: 3.7, y: 2.1, h: 2.7, max: 3 },
  row: { x: 1.55, w: 10.6, y0: 2.0, dy: 1.05, h: 0.9, max: 4 },
  heading: { x: 1.7, w: 10.8, y: 0.7, h: 0.7 },
} as const;

export async function buildDeck(): Promise<Buffer> {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 — set before any slide is added
  pres.author = "Meherr";
  pres.title = DECK.title;

  // --- Title slide: dark, per the sandwich structure ---
  const title = pres.addSlide();
  title.background = { color: INK };
  title.addText(DECK.title, {
    x: 0.9,
    y: 2.3,
    w: 8.5,
    h: 1.1,
    fontSize: 54,
    bold: true,
    color: WHITE,
    fontFace: TITLE_FONT,
    margin: 0,
  });
  title.addText(DECK.subtitle, {
    x: 0.9,
    y: 3.5,
    w: 8.5,
    h: 0.6,
    fontSize: 20,
    color: SEAFOAM,
    fontFace: BODY_FONT,
    margin: 0,
  });
  title.addShape(pres.ShapeType.ellipse, {
    x: 11.2,
    y: 2.4,
    w: 1.3,
    h: 1.3,
    fill: { color: TEAL },
    line: { color: TEAL },
  });

  DECK.slides.forEach((slide, index) => {
    const s = pres.addSlide();
    const heading = resolveFigures(slide.title);
    s.background = { color: WHITE };

    // Motif: the slide's number in a filled circle, carried on every content slide.
    s.addShape(pres.ShapeType.ellipse, {
      x: 0.9,
      y: 0.75,
      w: 0.55,
      h: 0.55,
      fill: { color: TEAL },
      line: { color: TEAL },
    });
    s.addText(String(index + 1), {
      x: 0.9,
      y: 0.75,
      w: 0.55,
      h: 0.55,
      align: "center",
      valign: "middle",
      fontSize: 16,
      bold: true,
      color: WHITE,
      fontFace: BODY_FONT,
      margin: 0,
    });
    s.addText(heading, {
      x: 1.7,
      y: 0.7,
      w: 10.8,
      h: 0.7,
      fontSize: 34,
      bold: true,
      color: INK,
      fontFace: TITLE_FONT,
      margin: 0,
    });

    const bullets = slide.bullets.map(resolveFigures);

    if (slide.layout === "cards") {
      // Stat cards: the numbers are the point, so give each its own block.
      bullets.forEach((text, i) => {
        const x = LAYOUT.card.x0 + i * LAYOUT.card.dx;
        s.addShape(pres.ShapeType.roundRect, {
          x,
          y: LAYOUT.card.y,
          w: LAYOUT.card.w,
          h: LAYOUT.card.h,
          rectRadius: 0.12,
          fill: { color: MIST },
          line: { color: MIST },
        });
        const [head, ...rest] = text.split(" ");
        s.addText(head ?? "", {
          x: x + 0.3,
          y: 2.45,
          w: 3.1,
          h: 1.0,
          fontSize: 40,
          bold: true,
          color: TEAL,
          fontFace: TITLE_FONT,
          margin: 0,
        });
        s.addText(rest.join(" "), {
          x: x + 0.3,
          y: 3.5,
          w: 3.1,
          h: 1.1,
          fontSize: 14,
          color: MUTED,
          fontFace: BODY_FONT,
          margin: 0,
        });
      });
    } else {
      // Icon-and-text rows: a small teal dot per point, text left-aligned.
      bullets.forEach((text, i) => {
        const y = LAYOUT.row.y0 + i * LAYOUT.row.dy;
        s.addShape(pres.ShapeType.ellipse, {
          x: 1.0,
          y: y + 0.12,
          w: 0.22,
          h: 0.22,
          fill: { color: SEAFOAM },
          line: { color: SEAFOAM },
        });
        s.addText(text, {
          x: 1.55,
          y,
          w: 10.6,
          h: 0.9,
          fontSize: 16,
          color: INK,
          fontFace: BODY_FONT,
          margin: 0,
          valign: "top",
        });
      });
    }

    if (slide.note) s.addNotes(slide.note);
  });

  // --- Closing slide: dark, closing the sandwich ---
  const close = pres.addSlide();
  close.background = { color: INK };
  close.addText("The number we report is the one that survives the comparison.", {
    x: 0.9,
    y: 2.8,
    w: 11.0,
    h: 1.6,
    fontSize: 32,
    bold: true,
    color: WHITE,
    fontFace: TITLE_FONT,
    margin: 0,
  });
  close.addText("Business-to-business service for accredited general practices.", {
    x: 0.9,
    y: 4.5,
    w: 11.0,
    h: 0.5,
    fontSize: 14,
    color: SEAFOAM,
    fontFace: BODY_FONT,
    margin: 0,
  });

  return (await pres.write({ outputType: "nodebuffer" })) as Buffer;
}
