// Phase M (ADR 0007): the browser's half of a match request. The opaque patient id lives in
// sessionStorage, in the tab and never in the address bar (the finder's law, `src/finder/state.ts`).
import type { PatientView } from "@/lib/matching/views";

export const MATCH_SESSION_KEY = "adhdme.match.v1";
/**
 * The view the intake returned, kept in the tab beside the id. WHY: the store is in memory per
 * server process (the tree's mock posture), and on a serverless host the read may land on a
 * process that never saw the write. Found on the first live probe after Phase M shipped:
 * intake succeeded, the results screen said "Nothing to show yet". Until the store is wired
 * (Phase M5) the tab is the one place guaranteed to remember, so it does, and the screens say
 * when what they show came from the tab rather than the server.
 */
export const MATCH_VIEW_KEY = "adhdme.match.view.v1";

export type HeldView = PatientView & { fromTab?: boolean };

export function readPatientId(): string | null {
  try {
    return window.sessionStorage.getItem(MATCH_SESSION_KEY);
  } catch {
    return null;
  }
}

export function writePatientId(id: string): void {
  try {
    window.sessionStorage.setItem(MATCH_SESSION_KEY, id);
  } catch {
    // Private mode or a blocked store: the results screen will say it has nothing to show.
  }
}

export function clearPatientId(): void {
  try {
    window.sessionStorage.removeItem(MATCH_SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function writeView(view: PatientView): void {
  try {
    window.sessionStorage.setItem(MATCH_VIEW_KEY, JSON.stringify(view));
  } catch {
    // Nothing kept; the server copy is the only one.
  }
}

export function readView(): PatientView | null {
  try {
    const raw = window.sessionStorage.getItem(MATCH_VIEW_KEY);
    return raw ? (JSON.parse(raw) as PatientView) : null;
  } catch {
    return null;
  }
}

export function clearView(): void {
  try {
    window.sessionStorage.removeItem(MATCH_VIEW_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The server's view when it has one, else the tab's copy marked as such, else null. */
export async function fetchPatient(id: string): Promise<HeldView | null> {
  try {
    const response = await fetch(`/api/match/patient/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (response.ok) {
      const view = (await response.json()) as PatientView;
      writeView(view);
      return view;
    }
  } catch {
    // Fall through to the tab's copy.
  }
  const held = readView();
  return held && held.id === id ? { ...held, fromTab: true } : null;
}

export const FROM_TAB_COPY =
  "Shown from this tab. The server that took your request has moved on, so answers from a GP's side cannot reach this screen yet; the request itself, and everything below, is intact.";

export const MATCH_STATUS_COPY = {
  proposed: "Waiting on the GP.",
  accepted: "Accepted.",
  declined: "Declined.",
  completed: "First appointment done.",
  withdrawn: "Withdrawn.",
} as const;
