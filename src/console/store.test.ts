import { beforeEach, describe, expect, it } from "vitest";
import type { PracticeId } from "@/domain/types";
import { DEFAULT_CONFIG } from "@/engine/eligibility";
import {
  getConsole,
  onboardPractice,
  resetConsole,
  updateRules,
  validateOnboarding,
} from "@/console/store";

const NOW = "2026-08-08T18:00:00Z";

const VALID_ONBOARDING = { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 10 };
const OWNER = "manager@demo.practice.example";

// W166: ids are generated, so the practice under test is looked up rather than named.
const rec = () => getConsole().practices[0]!;
const pid = () => rec().practice.id;

beforeEach(() => {
  resetConsole();
});

describe("onboarding", () => {
  it("creates the practice with holdout stored as a rate", () => {
    expect(onboardPractice(VALID_ONBOARDING, NOW, OWNER)).toEqual({});
    const state = getConsole();
    expect(state.practices[0]?.practice).toMatchObject({
      name: "Demo Family Practice",
      timezone: "Australia/Sydney",
      holdoutRate: 0.1,
    });
    expect(state.auditEvents).toHaveLength(1);
    expect(state.auditEvents[0]?.kind).toBe("config_changed");
  });

  it("rejects bad input without touching state", () => {
    const errors = validateOnboarding({ name: "x", timezone: "nowhere", holdoutPercent: 90 });
    expect(Object.keys(errors).sort()).toEqual(["holdoutPercent", "name", "timezone"]);
    expect(onboardPractice({ ...VALID_ONBOARDING, holdoutPercent: 90 }, NOW, OWNER)).toHaveProperty("holdoutPercent");
    expect(getConsole().practices).toEqual([]);
  });
});

describe("rules config", () => {
  it("requires an onboarded practice", () => {
    // W166: named explicitly rather than looked up, because there is nothing to look up — the
    // point of the case is that an id referring to no practice is refused, not resolved.
    expect(
      updateRules("prac-nobody" as PracticeId, { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 200 }, NOW, OWNER),
    ).toHaveProperty("form");
  });

  it("bumps the version and audits the exact change", () => {
    onboardPractice(VALID_ONBOARDING, NOW, OWNER);
    const errors = updateRules(pid(), { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 240, chronicCareOnly: true }, NOW, OWNER);
    expect(errors).toEqual({});
    const state = getConsole();
    expect(rec().rulesVersion).toBe(2);
    expect(rec().rulesConfig.minDaysSinceLastVisit).toBe(240);
    const audit = state.auditEvents.at(-1);
    expect(audit?.subjectId).toBe("rules-v2");
    expect(audit?.detail).toContain("minDaysSinceLastVisit: 180 -> 240");
    expect(audit?.detail).toContain("chronicCareOnly: false -> true");
  });

  it("does not bump the version for a no-op save", () => {
    onboardPractice(VALID_ONBOARDING, NOW, OWNER);
    expect(updateRules(pid(), { ...DEFAULT_CONFIG }, NOW, OWNER)).toEqual({});
    expect(rec().rulesVersion).toBe(1);
    expect(getConsole().auditEvents).toHaveLength(1); // onboarding only
  });

  it("rejects out-of-range numbers", () => {
    onboardPractice(VALID_ONBOARDING, NOW, OWNER);
    expect(updateRules(pid(), { ...DEFAULT_CONFIG, minDaysSinceLastVisit: -1 }, NOW, OWNER)).toHaveProperty("minDaysSinceLastVisit");
    expect(updateRules(pid(), { ...DEFAULT_CONFIG, maxInvitesPerQuarter: 99 }, NOW, OWNER)).toHaveProperty("maxInvitesPerQuarter");
    expect(updateRules(pid(), { ...DEFAULT_CONFIG, futureBookingBlockDays: 3.5 }, NOW, OWNER)).toHaveProperty("futureBookingBlockDays");
    expect(rec().rulesVersion).toBe(1);
  });
});
