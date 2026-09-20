// The GP summary as a Word file, built on the device.
//
// Same shape as `one-pager.ts`: an object first, a renderer over it, so the text a person copies
// and the document they download can never say different things. The object is
// `src/model/summary.ts`'s `GpSummary`, which holds only rows the record already had and the
// person's own words — so this file adds a container and no content, which is the whole point.
//
// `Packer.toBlob` rather than `toBuffer`: this runs in the browser, and nothing here reaches a
// server. The import is dynamic at the call site so the hub pays nothing for a library only the
// export needs.

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { AUDIENCE_LABELS, SECTION_HEADINGS, sectionRows, sectionsIn, type GpSummary, type SectionKey } from "@/model/summary";

export const SUMMARY_TITLE = "ADHD.ME needs summary";

/** The document, from the summary object alone. */
export function summaryDocument(summary: GpSummary, removed: ReadonlySet<SectionKey> = new Set()): Document {
  const blocks: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(SUMMARY_TITLE)] }),
    new Paragraph({ children: [new TextRun({ text: AUDIENCE_LABELS[summary.audience], italics: true })] }),
  ];
  for (const key of sectionsIn(summary, removed)) {
    blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(SECTION_HEADINGS[key])] }));
    for (const row of sectionRows(summary, key)) {
      blocks.push(new Paragraph({ children: [new TextRun(row)] }));
    }
  }
  return new Document({ creator: "ADHD.ME", title: SUMMARY_TITLE, sections: [{ children: blocks }] });
}

/** The file, for a download on this device. */
export async function summaryBlob(summary: GpSummary, removed?: ReadonlySet<SectionKey>): Promise<Blob> {
  return Packer.toBlob(summaryDocument(summary, removed));
}

/** What the downloaded file is called. No name, no date of birth, nothing identifying. */
export const SUMMARY_FILENAME = "adhdme-summary.docx";
