import { beforeEach, describe, expect, it } from "vitest";
import { SEED_PRACTICE_ID, getStore, resetStore } from "@/booking/store";
import {
  applyKillSwitch,
  applyPracticePause,
  feedEvidenceFor,
  getOps,
  queueView,
  recordFeedEvidence,
  resetOps,
} from "@/ops/store";
import type { PracticeId } from "@/domain/types";

const NOW = "2026-08-08T22:00:00Z";

beforeEach(() => {
  resetOps();
  resetStore();
});

describe("ops store", () => {
  it("starts all-clear with no audit", () => {
    const state = getOps();
    expect(state.switches).toEqual({ killSwitch: false, pausedPracticeIds: [] });
    expect(state.auditEvents).toHaveLength(0);
  });

  it("engaging the kill switch records an audit event once", () => {
    applyKillSwitch(true, NOW);
    expect(getOps().switches.killSwitch).toBe(true);
    expect(getOps().auditEvents).toHaveLength(1);
    applyKillSwitch(true, NOW); // idempotent — no second event
    expect(getOps().auditEvents).toHaveLength(1);
    applyKillSwitch(false, NOW);
    expect(getOps().switches.killSwitch).toBe(false);
    expect(getOps().auditEvents).toHaveLength(2);
  });

  it("pausing a practice is audited and reversible", () => {
    applyPracticePause("prac-demo", true, NOW);
    expect(getOps().switches.pausedPracticeIds).toEqual(["prac-demo"]);
    expect(getOps().auditEvents.at(-1)?.detail).toContain("paused");
    applyPracticePause("prac-demo", false, NOW);
    expect(getOps().switches.pausedPracticeIds).toEqual([]);
  });

  it("derives the invitation queue from the booking rail seed", () => {
    const view = queueView(SEED_PRACTICE_ID);
    // Seed: three 'sent' invitations, two open slots.
    expect(view.counts.sent).toBe(3);
    expect(view.outstanding).toHaveLength(3);
    expect(view.outstanding.every((o) => o.status === "sent")).toBe(true);
  });
});

describe("W181 the ops queue is one practice's", () => {
  const A = SEED_PRACTICE_ID;
  const B = "prac-2" as PracticeId;

  const seedOther = () => {
    const rail = getStore().state;
    const mine = rail.invitations[0]!;
    rail.invitations.push({ ...mine, id: "inv-other" as typeof mine.id, practiceId: B });
    return rail;
  };

  it("does not show one practice the other's counts or invitation ids", () => {
    // The leak this closes was invisible until W166 made a second practice real: `queueView`
    // folded the whole rail. A practice reading the ops page saw another practice's volume,
    // and the ids it listed are invitation ids for that practice's patients.
    seedOther();
    const a = queueView(A);
    const b = queueView(B);
    expect(b.outstanding.map((o) => o.id)).toEqual(["inv-other"]);
    expect(JSON.stringify(b)).not.toContain(a.outstanding[0]!.id);
    expect(a.outstanding.map((o) => o.id)).not.toContain("inv-other");
  });

  it("keeps each practice's totals equal to its own rows, not the rail's", () => {
    seedOther();
    const rail = getStore().state.invitations;
    for (const practice of [A, B]) {
      const view = queueView(practice);
      const own = rail.filter((i) => i.practiceId === practice).length;
      const counted = Object.values(view.counts).reduce((sum, n) => sum + n, 0);
      expect(counted, `${practice} counts rows that are not its own`).toBe(own);
    }
  });

  it("keeps feed evidence per practice, so one outage cannot explain another's zero", () => {
    // A single global record would answer a practice's "why is this empty?" with a fact about
    // somebody else's integration — a confident wrong answer, which is worse than none.
    recordFeedEvidence(A, {
      lastSuccessfulReadAt: "2026-03-05T09:00:00Z",
      health: "unavailable",
      usableForSending: false,
      recordsArrived: 0,
    });
    expect(feedEvidenceFor(A)?.health).toBe("unavailable");
    expect(feedEvidenceFor(B)).toBeNull();
  });
});
