// W54: when may a session reclaim someone else's claimed ledger row?
//
// W51 §Process recorded the failure this fixes: builder-A exhausted a model limit
// mid-claim, and because the only rule was a flat 6-hour staleness window, its dead
// claim idled *both* routines for over two hours. The 6-hour window is calibrated
// for a slow holder, not a dead one, and nothing distinguished the two.
//
// The distinction this module draws is evidence, not elapsed time alone: a holder
// that has pushed something since claiming has *proven* it is alive and keeps the
// long leash; a holder that has pushed nothing has proven nothing and gets 90
// minutes. That is checkable from git by any firing session, with no liveness ping.
//
// This is the normative definition of the rule stated in BUILD-STATE.md — the prose
// there and this module are meant to be read together, and the prose points here.

/** A holder that has shown progress is alive; give it a long leash from its last sign of life. */
export const STALE_WINDOW_MINUTES = 360;

/** A holder that has shown nothing since claiming has not proven it is running. */
export const UNREACHABLE_WINDOW_MINUTES = 90;

export type ClaimStatus = "available" | "claimed" | "in-progress" | "done" | "blocked";

export interface ClaimRow {
  readonly unit: string;
  readonly status: ClaimStatus;
  /** Short session id of the holder, or null when unclaimed. */
  readonly session: string | null;
  /** ISO-8601 UTC claim time, or null when unclaimed. */
  readonly claimedAt: string | null;
}

export interface ProgressEvidence {
  /**
   * Last time the holder demonstrably did something: a commit referencing the unit,
   * or a heartbeat edit to its own ledger row. Null means nothing since the claim.
   */
  readonly lastProgressAt: Date | null;
  /**
   * Set when a session is known dead out of band — the transcript shows it hit a
   * model or usage limit, or the routine reports it failed. A known-dead holder is
   * reclaimable immediately; waiting out a window helps nobody.
   */
  readonly knownDead?: boolean;
}

export type ClaimVerdict =
  | { readonly claimable: true; readonly reason: "unclaimed" | "holder_dead" | "window_expired"; readonly detail: string }
  | { readonly claimable: false; readonly reason: "finished" | "held" | "unparseable_claim_time"; readonly detail: string };

const MINUTE_MS = 60_000;

function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MINUTE_MS;
}

function describeAge(minutes: number): string {
  const whole = Math.floor(minutes);
  if (whole < 60) return `${whole}m`;
  return `${Math.floor(whole / 60)}h${String(whole % 60).padStart(2, "0")}m`;
}

/**
 * Decide whether a firing session may take this row. Never consults wall-clock time
 * itself — `now` is injected, like every other clock in this tree, so the W51
 * incident can be replayed exactly in a test.
 */
export function classifyClaim(row: ClaimRow, evidence: ProgressEvidence, now: Date): ClaimVerdict {
  if (row.status === "done" || row.status === "blocked") {
    return { claimable: false, reason: "finished", detail: `${row.unit} is ${row.status}` };
  }

  if (row.status === "available") {
    return { claimable: true, reason: "unclaimed", detail: `${row.unit} is available` };
  }

  const holder = row.session ?? "unknown session";

  if (evidence.knownDead) {
    return {
      claimable: true,
      reason: "holder_dead",
      detail: `${holder} is known dead — reclaim immediately, do not wait out a window`,
    };
  }

  if (row.claimedAt === null) {
    // A claimed row with no timestamp cannot be aged. Refuse rather than guess:
    // stealing a live claim is worse than leaving a row idle, and the protocol's
    // standing instruction is never to fight over a row.
    return {
      claimable: false,
      reason: "unparseable_claim_time",
      detail: `${row.unit} is ${row.status} but carries no claim time — leave it and flag the row`,
    };
  }

  const claimedAt = new Date(row.claimedAt);
  if (Number.isNaN(claimedAt.getTime())) {
    return {
      claimable: false,
      reason: "unparseable_claim_time",
      detail: `${row.unit} has an unreadable claim time (${row.claimedAt}) — leave it and flag the row`,
    };
  }

  // Progress is the liveness signal. Absent it, the holder never proved it is running.
  const proven = evidence.lastProgressAt !== null;
  const lastSignOfLife = evidence.lastProgressAt ?? claimedAt;
  const windowMinutes = proven ? STALE_WINDOW_MINUTES : UNREACHABLE_WINDOW_MINUTES;
  const idle = minutesBetween(lastSignOfLife, now);

  if (idle > windowMinutes) {
    return {
      claimable: true,
      reason: "window_expired",
      detail:
        `${holder} has been silent ${describeAge(idle)}, past the ` +
        `${windowMinutes}m ${proven ? "stale" : "unreachable"} window — reclaim`,
    };
  }

  return {
    claimable: false,
    reason: "held",
    detail:
      `${holder} claimed ${describeAge(minutesBetween(claimedAt, now))} ago and is ` +
      `${describeAge(idle)} silent, inside the ${windowMinutes}m ` +
      `${proven ? "stale" : "unreachable"} window — leave it`,
  };
}
