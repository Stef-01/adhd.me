// W46: one-pager generator (docx), same content source and same figure register as
// the deck, so the two assets can never quote different numbers.

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { ONE_PAGER } from "@/collateral/content";
import { NEEDS_FOUNDER_VERIFICATION } from "@/collateral/figures";
import { resolveFigures } from "@/collateral/render";

export async function buildOnePager(): Promise<Buffer> {
  const doc = new Document({
    creator: "Meherr",
    title: ONE_PAGER.title,
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(resolveFigures(ONE_PAGER.title))],
          }),
          new Paragraph({ children: [new TextRun(resolveFigures(ONE_PAGER.intro))] }),
          ...ONE_PAGER.sections.flatMap((section) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun(resolveFigures(section.heading))],
            }),
            new Paragraph({ children: [new TextRun(resolveFigures(section.body))] }),
          ]),
          new Paragraph({ children: [new TextRun({ text: ONE_PAGER.footer, italics: true })] }),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

/**
 * The traceability appendix that ships beside the assets — every figure with its
 * source, and the claims this build refuses to make without a citation. A reviewer
 * checks the deck against this, not against a salesperson's memory.
 */
export function renderFigureRegisterMarkdown(figures: readonly {
  id: string;
  label: string;
  display: string;
  source: { kind: string; module?: string; publication?: string; effectiveFrom?: string; note?: string };
}[]): string {
  const sourceText = (s: (typeof figures)[number]["source"]): string => {
    if (s.kind === "computed") return `computed — \`${s.module}\` (${s.note})`;
    if (s.kind === "published") return `published — ${s.publication}, effective ${s.effectiveFrom}`;
    return `assumption — ${s.note}`;
  };
  return `# Meherr sales collateral — figure register

Every number in \`meherr-sales-deck.pptx\` and \`meherr-one-pager.docx\` appears
below with its source. Generated from \`src/collateral/figures.ts\`; a test asserts each
computed figure still equals what the code produces, so the assets cannot quote a stale
number.

| Figure | Shown as | Source |
|---|---|---|
${figures.map((f) => `| ${f.label} | ${f.display} | ${sourceText(f.source)} |`).join("\n")}

## Not claimed — needs a citation before it may appear

These are the claims a sales asset would usually make and this build cannot source.
They are deliberately absent from both assets.

${NEEDS_FOUNDER_VERIFICATION.map((c) => `- ${c}`).join("\n")}
`;
}
