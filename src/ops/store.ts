// W19: admin-ops store (mock, synthetic only — globalThis, same posture as the
// other phase-1 stores). Holds the safety switches and derives the invitation-queue
// view from the booking rail. Switch changes land in an audit trail.

import { getStore } from "@/booking/store";
import type { AuditEvent, InvitationStatus, PracticeId } from "@/domain/types";
import { ALL_CLEAR, setKillSwitch, setPracticePaused, type OpsSwitches } from "@/ops/switches";
import type { FeedEvidence } from "@/ops/silence";

export interface OpsState {
  switches: OpsSwitches;
  auditEvents: AuditEvent[];
  /**
   * W179: what is known about each practice's appointment feed. A practice absent from this
   * map has NOTHING KNOWN recorded about it, which W179 renders as `cannot_determine`.
   *
   * W181: keyed BY PRACTICE. A single global record was wrong the moment W166 made two
   * practices real — one practice's outage would have explained another practice's zero, which
   * is worse than no explanation because it is a confident wrong answer.
   */
  feed: Record<PracticeId, FeedEvidence>;
}

const globalStore = globalThis as { __careyieldOps?: OpsState };

function initial(): OpsState {
  return { switches: { ...ALL_CLEAR, pausedPracticeIds: [] }, auditEvents: [], feed: {} };
}

export function getOps(): OpsState {
  globalStore.__careyieldOps ??= initial();
  return globalStore.__careyieldOps;
}

export function resetOps(): OpsState {
  globalStore.__careyieldOps = initial();
  return globalStore.__careyieldOps;
}

const QUEUE_STATUSES: InvitationStatus[] = ["queued", "sent", "booked", "expired", "opted_out"];

export interface QueueView {
  counts: Record<InvitationStatus, number>;
  /** The currently-outstanding offers (queued or sent) — the live queue. */
  outstanding: Array<{ id: string; patientId: string; sessionDate: string; status: InvitationStatus }>;
}

/**
 * Invitation queue derived from the booking rail (the send/booking source of truth).
 *
 * W181: TAKES THE PRACTICE AS THE QUERY. This folded every invitation in the rail with no
 * practice filter at all. Before W166 there was one practice and the bug was invisible; after
 * it, a second practice's ops page showed the first practice's counts and invitation ids, and
 * the non-zero total suppressed the W179 silence explanation the reader should have seen — so
 * the leak also hid the fact that their own feed had nothing in it.
 *
 * Filtered as the query rather than afterwards, W123's rule: a later filter is a line somebody
 * can delete, and the deletion looks like a simplification.
 */
export function queueView(practiceId: PracticeId): QueueView {
  const invitations = getStore().state.invitations.filter((i) => i.practiceId === practiceId);
  const counts = Object.fromEntries(QUEUE_STATUSES.map((s) => [s, 0])) as Record<InvitationStatus, number>;
  for (const inv of invitations) counts[inv.status]++;
  const outstanding = invitations
    .filter((i) => i.status === "queued" || i.status === "sent")
    .map((i) => ({ id: i.id, patientId: i.patientId, sessionDate: i.sessionDate, status: i.status }));
  return { counts, outstanding };
}

function audit(state: OpsState, at: string, subjectId: string, detail: string) {
  state.auditEvents.push({
    practiceId: subjectId as PracticeId,
    kind: "config_changed",
    at,
    subjectId,
    detail,
  });
}

export function applyKillSwitch(on: boolean, at: string): void {
  const state = getOps();
  if (state.switches.killSwitch === on) return;
  state.switches = setKillSwitch(state.switches, on);
  audit(state, at, "ops:kill-switch", `kill switch ${on ? "engaged" : "released"}`);
}

export function applyPracticePause(practiceId: string, paused: boolean, at: string): void {
  const state = getOps();
  if (state.switches.pausedPracticeIds.includes(practiceId) === paused) return;
  state.switches = setPracticePaused(state.switches, practiceId, paused);
  audit(state, at, practiceId, `practice sending ${paused ? "paused" : "resumed"}`);
}

/** W179: record what one practice's feed did. Synthetic only in this phase. */
export function recordFeedEvidence(practiceId: PracticeId, feed: FeedEvidence): void {
  getOps().feed[practiceId] = feed;
}

/** What is known about this practice's feed, or null for nothing recorded. */
export function feedEvidenceFor(practiceId: PracticeId): FeedEvidence | null {
  return getOps().feed[practiceId] ?? null;
}
