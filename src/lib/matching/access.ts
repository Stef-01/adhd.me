// Who may manage a GP profile from the console (Phase M5). A profile belongs to the practice
// that claimed it; until then anyone with a practice may claim it, and after that only that
// practice's members and ADHD.ME staff reach its dashboard and its actions. A claim whose
// practice no longer exists (the synthetic console is reset between runs) counts as no claim.
//
// A claim is a declaration, like everything else a practice says about itself here: the
// console does not verify that the GP works there. That is the credentials lane's job, and it
// is why the list says "as declared".

import type { MatchingState } from "./store";
import type { GP } from "./types";

export type GPAccess = "manage" | "claim" | "none";

export interface Viewer {
  practiceId: string | null;
  staff: boolean;
  /** Whether a practice id still names a practice; an orphaned claim is no claim. */
  practiceExists: (id: string) => boolean;
}

export function gpAccessFor(gp: Pick<GP, "practiceId">, viewer: Viewer): GPAccess {
  if (viewer.staff) return "manage";
  const owner = gp.practiceId !== null && viewer.practiceExists(gp.practiceId) ? gp.practiceId : null;
  if (owner === null) return viewer.practiceId === null ? "none" : "claim";
  return owner === viewer.practiceId ? "manage" : "none";
}

export type ClaimResult = { ok: true; gp: GP } | { ok: false; reason: "not_found" | "claimed" };

export function claimGP(gpId: string, viewer: Viewer & { practiceId: string }, state: MatchingState): ClaimResult {
  const gp = state.gps.get(gpId);
  if (!gp) return { ok: false, reason: "not_found" };
  const access = gpAccessFor(gp, viewer);
  if (access === "none") return { ok: false, reason: "claimed" };
  if (access === "manage" && gp.practiceId === viewer.practiceId) return { ok: true, gp };
  const next: GP = { ...gp, practiceId: viewer.practiceId };
  return { ok: true, gp: next };
}

export function releaseGP(gpId: string, viewer: Viewer, state: MatchingState): ClaimResult {
  const gp = state.gps.get(gpId);
  if (!gp) return { ok: false, reason: "not_found" };
  if (gpAccessFor(gp, viewer) !== "manage") return { ok: false, reason: "claimed" };
  return { ok: true, gp: { ...gp, practiceId: null } };
}
