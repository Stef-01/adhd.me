"use client";

// Phase M (ADR 0007): pre-appointment preparation. The checklist generated from what the person
// wrote, ticked here and saved against their request; the timeline template the required item
// points at; and what to expect at a first appointment, in plain words from the GP's own
// declarations.

import Link from "next/link";
import { AppSettings } from "../app-settings";
import { useEffect, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { TIMELINE_TEMPLATE } from "@/lib/matching/checklist";
import type { PatientView } from "@/lib/matching/views";
import { FROM_TAB_COPY, fetchPatient, readPatientId, writeView, type HeldView } from "./session";

export function MatchPrep() {
  const [view, setView] = useState<HeldView | null | "none">(null);
  const [copied, setCopied] = useState<boolean | null>(null);

  useEffect(() => {
    const id = readPatientId();
    if (!id) {
      setView("none");
      return;
    }
    let cancelled = false;
    fetchPatient(id).then((v) => {
      if (!cancelled) setView(v ?? "none");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(itemId: string, done: boolean) {
    if (!view || view === "none" || !view.checklist) return;
    const optimistic = { ...view, checklist: { ...view.checklist, items: view.checklist.items.map((i) => (i.id === itemId ? { ...i, done } : i)) } };
    setView(optimistic);
    // The tab keeps the tick either way; the server keeps it when it still holds the request.
    writeView(optimistic);
    await fetch("/api/match/checklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: view.id, itemId, done }),
    }).catch(() => null);
  }

  if (view === null) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <p className="match-lede" role="status">
          Reading your checklist.
        </p>
      </main>
    );
  }

  if (view === "none" || !view.checklist) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <header className="life-head">
        <AppSettings />
          <span className="life-eyebrow">Before the first appointment</span>
          <h1 tabIndex={-1}>Nothing to prepare yet</h1>
          <p className="match-lede">The checklist is written from your request. Start one first.</p>
        </header>
        <div className="match-actions">
          <Link className="is-primary" href="/match">
            Start a request
          </Link>
        </div>
      </main>
    );
  }

  const done = view.checklist.items.filter((i) => i.done).length;

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
      <header className="life-head">
        <AppSettings />
        <span className="life-eyebrow">Before the first appointment</span>
        <h1 tabIndex={-1}>What to bring</h1>
        <p className="match-lede">
          {done} of {view.checklist.items.length} ready.
        </p>
      </header>

      {view.fromTab && (
        <p className="match-note" data-testid="from-tab">
          {FROM_TAB_COPY}
        </p>
      )}
      <ul className="match-checklist" data-testid="match-checklist">
        {view.checklist.items.map((item) => (
          <li key={item.id} className={item.required ? "is-required" : ""}>
            <input id={`chk-${item.id}`} type="checkbox" checked={item.done} onChange={(e) => toggle(item.id, e.target.checked)} />
            <label htmlFor={`chk-${item.id}`}>
              <strong>{item.label}</strong>
            </label>
          </li>
        ))}
      </ul>

      <details className="match-section match-more">
        <summary>The symptom timeline</summary>
        <ol className="match-timeline">
          {TIMELINE_TEMPLATE.map((row) => (
            <li key={row.heading}>
              <strong>{row.heading}</strong>
            </li>
          ))}
        </ol>
        <div className="match-card-actions">
          <button
            type="button"
            data-testid="copy-timeline"
            onClick={async () => {
              const text = TIMELINE_TEMPLATE.map((row) => `${row.heading}\n${row.prompt}\n\n`).join("");
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={16} weight="bold" aria-hidden="true" /> : <Copy size={16} weight="bold" aria-hidden="true" />}
            {copied ? "Copied" : "Copy the headings as text"}
          </button>
        </div>
        {copied === false && <p className="match-copy-note">Copy failed; type the headings.</p>}
        {copied === true && <p className="match-copy-note">Copied.</p>}
      </details>

      {view.expectations && (
        <details className="match-section match-more">
          <summary>What to expect with {view.expectations.gpName}</summary>
          {view.expectations.sections.map((s) => (
            <details key={s.title} className="match-more">
              <summary>{s.title}</summary>
              <p>{s.body}</p>
            </details>
          ))}
        </details>
      )}

      <div className="match-actions">
        <Link href="/match/results">Back to your matches</Link>
      </div>
    </main>
  );
}
