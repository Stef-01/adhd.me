"use client";

// Phase M (ADR 0007): the three matches. Each card is a GP, the reason, and where the request
// stands on their side. The reason is the pipeline's own rationale (fixed templates over the
// concept overlap and declared facts); nothing on this screen is written by the page.

import Link from "next/link";
import { AppSettings } from "../app-settings";
import { useEffect, useState } from "react";
import { DECLINE_REASON_LABELS } from "@/lib/matching/labels";
import type { PatientView } from "@/lib/matching/views";
import { Explain } from "../explain";
import { Badges, Portrait } from "./gp-bits";
import { FROM_TAB_COPY, MATCH_STATUS_COPY, clearPatientId, clearView, fetchPatient, readPatientId, type HeldView } from "./session";

export function MatchResults() {
  const [view, setView] = useState<HeldView | null | "none">(null);

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

  if (view === null) {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <p className="match-lede" role="status">
          Reading your matches.
        </p>
      </main>
    );
  }

  if (view === "none") {
    return (
      <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
        <header className="life-head">
        <AppSettings />
          <span className="life-eyebrow">Find a GP</span>
          <h1 tabIndex={-1}>Nothing to show yet</h1>
          <p className="match-lede">A request lives in this tab only. Start one, or start again.</p>
        </header>
        <div className="match-actions">
          <Link className="is-primary" href="/match">
            Start a request
          </Link>
        </div>
      </main>
    );
  }

  const anyAccepted = view.matches.some((m) => m.status === "accepted" || m.status === "completed");

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs match-screen">
      <header className="life-head">
        <AppSettings />
        <span className="life-eyebrow">Your matches</span>
        <h1 tabIndex={-1}>{view.matches.length === 0 ? "Nobody fits yet" : `${view.matches.length === 1 ? "One GP" : `${view.matches.length} GPs`}, each with a reason`}</h1>
        {view.heard.length > 0 && <p className="match-lede">Heard: {view.heard.slice(0, 3).join(", ")}.</p>}
        <Explain className="match-lede">Each GP below saw your request and answers from their side. The reason under each name is what you and they have in common.</Explain>
      </header>

      {view.fromTab && (
        <p className="match-note" data-testid="from-tab">
          {FROM_TAB_COPY}
        </p>
      )}
      {view.note && <p className="match-note">{view.note}</p>}

      <ol className="match-cards" data-testid="match-cards">
        {view.matches.map((m) => (
          <li key={m.id} className="match-card" data-match={m.id} data-gp={m.gp.id} data-status={m.status}>
            <span className="match-position">{m.position === 1 ? "First" : m.position === 2 ? "Second" : "Third"}</span>
            <div className="match-card-head">
              <Portrait gp={m.gp} />
              <div>
                <strong>{m.gp.name}</strong>
                <small>
                  {m.gp.practice}, {m.gp.suburb}
                </small>
              </div>
            </div>
            <p className="match-headline">{m.rationale.headline}</p>
            <ul className="match-points">
              {m.rationale.points.slice(0, 1).map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {m.rationale.points.length > 1 && (
              <details className="match-more">
                <summary>More reasons</summary>
                <ul className="match-points">
                  {m.rationale.points.slice(1).map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </details>
            )}
            <Badges gp={m.gp} brief />
            <p className="match-status" data-testid="match-status">
              {m.status === "declined" && m.declineReason ? `${MATCH_STATUS_COPY.declined} ${DECLINE_REASON_LABELS[m.declineReason]}.` : MATCH_STATUS_COPY[m.status]}
            </p>
            <div className="match-card-actions">
              <Link href={`/gp/${encodeURIComponent(m.gp.id)}`}>See their profile</Link>
              {(m.status === "accepted" || m.status === "completed") && (
                <Link className="is-primary" href="/match/prep">
                  Prepare for the first appointment
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="match-actions">
        <Link className={anyAccepted ? "" : "is-primary"} href="/match/prep">
          What to bring, and what to expect
        </Link>
        {anyAccepted && <Link href="/match/feedback">How did it go?</Link>}
        <button
          type="button"
          onClick={() => {
            clearPatientId();
            clearView();
            window.location.assign("/match");
          }}
        >
          Start again
        </button>
        <button
          type="button"
          data-testid="delete-request"
          onClick={async () => {
            await fetch(`/api/match/patient/${encodeURIComponent(view.id)}`, { method: "DELETE" }).catch(() => null);
            clearPatientId();
            clearView();
            window.location.assign("/match");
          }}
        >
          Delete my request
        </button>
      </div>
      <Explain className="match-copy-note">Delete removes your words, the matches proposed for you and anything you told us afterwards, from our side as well as this tab.</Explain>
    </main>
  );
}
