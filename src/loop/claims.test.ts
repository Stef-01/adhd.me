// W54 verify gate: the stale-claim simulation.
//
// The centrepiece is a replay of the real W51 incident with its real timestamps —
// the failure this unit exists to prevent — asserting both that the old rule left
// the row stuck and that the new one frees it.

import { describe, expect, it } from "vitest";
import {
  type ClaimRow,
  STALE_WINDOW_MINUTES,
  UNREACHABLE_WINDOW_MINUTES,
  classifyClaim,
} from "./claims.ts";

const at = (iso: string): Date => new Date(iso);
const NO_PROGRESS = { lastProgressAt: null };

function claimed(over: Partial<ClaimRow> = {}): ClaimRow {
  return { unit: "W51", status: "claimed", session: "builder-A", claimedAt: "2026-08-09T05:35:00Z", ...over };
}

describe("W54 stale-claim rule", () => {
  it("lets anyone take an available row", () => {
    const verdict = classifyClaim(claimed({ status: "available", session: null, claimedAt: null }), NO_PROGRESS, at("2026-08-09T06:00:00Z"));
    expect(verdict.claimable).toBe(true);
    expect(verdict.reason).toBe("unclaimed");
  });

  it("never offers a finished row", () => {
    for (const status of ["done", "blocked"] as const) {
      const verdict = classifyClaim(claimed({ status }), NO_PROGRESS, at("2026-09-01T00:00:00Z"));
      expect(verdict.claimable).toBe(false);
      expect(verdict.reason).toBe("finished");
    }
  });

  it("protects a fresh claim that has not yet pushed anything", () => {
    // 60 minutes in, no progress: inside the 90m unreachable window. This is the
    // case where a builder must NOT jump in — the holder may simply be mid-build.
    const verdict = classifyClaim(claimed(), NO_PROGRESS, at("2026-08-09T06:35:00Z"));
    expect(verdict.claimable).toBe(false);
    expect(verdict.reason).toBe("held");
    expect(verdict.detail).toContain("90m unreachable window");
  });

  it("frees a silent claim once the 90-minute unreachable window passes", () => {
    const verdict = classifyClaim(claimed(), NO_PROGRESS, at("2026-08-09T07:06:00Z"));
    expect(verdict.claimable).toBe(true);
    expect(verdict.reason).toBe("window_expired");
    expect(verdict.detail).toContain("90m unreachable window");
  });

  it("gives a holder that has pushed something the full 6-hour leash", () => {
    // Same claim time, but the holder committed at 07:00. Two hours after that it is
    // still protected, where a silent holder would long since have been reclaimable.
    const evidence = { lastProgressAt: at("2026-08-09T07:00:00Z") };
    const twoHoursLater = at("2026-08-09T09:00:00Z");

    expect(classifyClaim(claimed(), evidence, twoHoursLater).claimable).toBe(false);
    expect(classifyClaim(claimed(), NO_PROGRESS, twoHoursLater).claimable).toBe(true);
  });

  it("measures the long window from the last sign of life, not from the claim", () => {
    const evidence = { lastProgressAt: at("2026-08-09T07:00:00Z") };
    const justInside = at("2026-08-09T12:59:00Z"); // 5h59m after the commit
    const justOutside = at("2026-08-09T13:01:00Z"); // 6h01m after the commit

    expect(classifyClaim(claimed(), evidence, justInside).claimable).toBe(false);
    expect(classifyClaim(claimed(), evidence, justOutside).claimable).toBe(true);
  });

  it("reclaims a known-dead holder immediately", () => {
    // interactive-0809 did exactly this by hand at 07:50Z once builder-A's session
    // was visibly failed. The rule now sanctions it instead of requiring a judgement call.
    const verdict = classifyClaim(claimed(), { lastProgressAt: null, knownDead: true }, at("2026-08-09T05:40:00Z"));
    expect(verdict.claimable).toBe(true);
    expect(verdict.reason).toBe("holder_dead");
  });

  it("leaves a row alone when its claim time cannot be read", () => {
    // Fail safe, not fail open: stealing a live claim is worse than an idle row, and
    // the protocol's standing instruction is never to fight over one.
    for (const claimedAt of [null, "sometime tuesday"]) {
      const verdict = classifyClaim(claimed({ claimedAt }), NO_PROGRESS, at("2026-09-01T00:00:00Z"));
      expect(verdict.claimable).toBe(false);
      expect(verdict.reason).toBe("unparseable_claim_time");
    }
  });

  it("does not reclaim on clock skew that puts the claim in the future", () => {
    const verdict = classifyClaim(claimed({ claimedAt: "2026-08-09T12:00:00Z" }), NO_PROGRESS, at("2026-08-09T06:00:00Z"));
    expect(verdict.claimable).toBe(false);
  });

  it("treats in-progress rows exactly like claimed ones", () => {
    const verdict = classifyClaim(claimed({ status: "in-progress" }), NO_PROGRESS, at("2026-08-09T07:06:00Z"));
    expect(verdict.claimable).toBe(true);
  });
});

describe("W54 replay of the W51 incident", () => {
  // Real timestamps. builder-A claimed W51 at 05:35Z, then hit a model limit and
  // pushed nothing. W52 depended on W51, so the dead row idled both routines until
  // interactive-0809 reclaimed it by hand at 07:50Z.
  const CLAIMED_AT = "2026-08-09T05:35:00Z";
  const row = claimed({ claimedAt: CLAIMED_AT });
  const RECLAIMED_BY_HAND = at("2026-08-09T07:50:00Z");

  it("the old flat 6-hour rule still held the row when it was reclaimed by hand", () => {
    // What the protocol said before this unit: one window, 6 hours, progress or not.
    const idleMinutes = (RECLAIMED_BY_HAND.getTime() - new Date(CLAIMED_AT).getTime()) / 60_000;
    expect(idleMinutes).toBeLessThan(STALE_WINDOW_MINUTES);

    // So a rule-following builder had to leave it — which is precisely why two
    // consecutive firings of this session found nothing claimable and idled.
    const underOldRule = { lastProgressAt: at(CLAIMED_AT) }; // claim itself as "progress" = old behaviour
    expect(classifyClaim(row, underOldRule, RECLAIMED_BY_HAND).claimable).toBe(false);
  });

  it("the new rule frees it at 07:05Z, 45 minutes before the manual reclaim", () => {
    const newRuleFreesAt = at("2026-08-09T07:06:00Z");
    expect(classifyClaim(row, NO_PROGRESS, newRuleFreesAt).claimable).toBe(true);

    const savedMinutes = (RECLAIMED_BY_HAND.getTime() - newRuleFreesAt.getTime()) / 60_000;
    expect(savedMinutes).toBeGreaterThan(40);
  });

  it("my own idle firings at 06:33Z and 07:45Z are decided correctly", () => {
    // 06:33Z — 58 minutes in. Correctly left alone; the holder might have been alive.
    expect(classifyClaim(row, NO_PROGRESS, at("2026-08-09T06:33:00Z")).claimable).toBe(false);
    // 07:45Z — 2h10m of silence. Under the new rule this firing would have built W51
    // instead of re-verifying the gate and ending quietly.
    expect(classifyClaim(row, NO_PROGRESS, at("2026-08-09T07:45:00Z")).claimable).toBe(true);
  });
});

describe("W54 window calibration", () => {
  it("the unreachable window is materially shorter than the stale window", () => {
    expect(UNREACHABLE_WINDOW_MINUTES).toBe(90);
    expect(STALE_WINDOW_MINUTES).toBe(360);
    expect(UNREACHABLE_WINDOW_MINUTES).toBeLessThan(STALE_WINDOW_MINUTES);
  });

  it("the unreachable window still clears a full hourly firing", () => {
    // Routines fire about hourly, so the window must exceed one firing interval or a
    // builder could have its row taken while it is legitimately mid-unit.
    expect(UNREACHABLE_WINDOW_MINUTES).toBeGreaterThan(60);
  });
});
