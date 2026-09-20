"use client";

// Take this to my GP (founder, 2026-09-19: "make the GP export one tap").
//
// Two steps in one sheet: who it is for, then the page itself with everything removable. The
// person never constructs the report — it is already written from what they have told the app,
// and their job is only to take things out.
//
// EVERY LINE IS THEIRS OR THE RECORD'S. `src/model/summary.ts` carries the rule and the test:
// this app writes no clinical prose, so the document is section headings, rows the record already
// held, and the person's own words. Nothing here composes a sentence about anybody.
//
// NOTHING LEAVES THE DEVICE. Copy goes to the clipboard, Print is the browser's own print of the
// preview (which is the PDF, without a dependency or a server), and Word is built here with the
// `docx` the tree already ships, imported dynamically so the hub never loads it. There is no
// "share securely" because that needs a record that outlives the device, which is the open
// question in ADR 0008 and not something to quietly invent here.

import { useMemo, useState, type RefObject } from "react";
import { Check, Copy, Printer, X } from "@phosphor-icons/react";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  SECTION_HEADINGS,
  gpSummary,
  sectionRows,
  sectionsIn,
  summaryText,
  type Audience,
  type SectionKey,
} from "@/model/summary";
import type { ModelRecord } from "@/model/store";
import { track } from "@/model/events";
import { Sheet } from "./sheet";

export function ShareSheet({
  open,
  record,
  onClose,
  openedBy,
}: {
  open: boolean;
  record: ModelRecord;
  onClose: () => void;
  openedBy?: RefObject<HTMLElement | null>;
}) {
  const [audience, setAudience] = useState<Audience | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<SectionKey>>(new Set());
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => (audience ? gpSummary(record, audience) : null), [audience, record]);
  const keys = useMemo(() => (summary ? sectionsIn(summary) : []), [summary]);

  const close = () => {
    setAudience(null);
    setRemoved(new Set());
    setCopied(false);
    onClose();
  };

  const remove = (key: SectionKey) =>
    setRemoved((held) => {
      const next = new Set(held);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Sheet open={open} title={audience ? "For your GP" : "Take this to…"} onClose={close} openedBy={openedBy}>
      <div className="map-sheet map-share">
        {!audience ? (
          <ul className="map-audiences">
            {AUDIENCES.map((id) => (
              <li key={id}>
                <button type="button" className="map-audience" onClick={() => setAudience(id)}>
                  {AUDIENCE_LABELS[id]}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="map-preview" id="map-preview">
              {keys.map((key) => (
                <section key={key} className="map-preview-block" data-removed={removed.has(key) || undefined}>
                  <div className="map-preview-head">
                    <h3>{SECTION_HEADINGS[key]}</h3>
                    <button
                      type="button"
                      className="map-preview-remove"
                      aria-pressed={removed.has(key)}
                      onClick={() => remove(key)}
                      aria-label={removed.has(key) ? `Put back ${SECTION_HEADINGS[key]}` : `Remove ${SECTION_HEADINGS[key]}`}
                    >
                      {removed.has(key) ? <Check size={15} weight="bold" aria-hidden="true" /> : <X size={15} weight="bold" aria-hidden="true" />}
                    </button>
                  </div>
                  {!removed.has(key) && (
                    <ul>
                      {sectionRows(summary!, key).map((row) => (
                        <li key={row}>{row}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <div className="map-sheet-actions">
              <button
                type="button"
                className="learn-primary"
                onClick={async () => {
                  const { summaryBlob, SUMMARY_FILENAME } = await import("@/collateral/gp-summary");
                  const blob = await summaryBlob(summary!, removed);
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = SUMMARY_FILENAME;
                  a.click();
                  URL.revokeObjectURL(url);
                  track("SUMMARY_EXPORTED", { audience, format: "docx" });
                }}
              >
                Export
              </button>
              <button
                type="button"
                className="learn-secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(summaryText(summary!, removed));
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                  track("SUMMARY_EXPORTED", { audience, format: "clipboard" });
                }}
              >
                <Copy size={15} weight="bold" aria-hidden="true" /> {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                className="learn-secondary"
                onClick={() => {
                  track("SUMMARY_EXPORTED", { audience, format: "print" });
                  window.print();
                }}
              >
                <Printer size={15} weight="bold" aria-hidden="true" /> Print
              </button>
            </div>

            <p className="map-foot">Nothing leaves your device until you send it.</p>
          </>
        )}
      </div>
    </Sheet>
  );
}
