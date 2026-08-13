import { beforeEach, describe, expect, it } from "vitest";
import {
  acknowledgeSetupStep,
  completeSetup,
  getConsole,
  onboardPractice,
  practiceRecord,
  resetConsole,
  saveClinicians,
  saveSessionConfig,
  setupReadiness,
  updateRules,
  validateClinicians,
} from "@/console/store";
import { DEFAULT_SESSION_CONFIG, validateSessionConfig } from "@/session/config";
import type { AppointmentType } from "@/domain/types";
import { DEFAULT_CONFIG } from "@/engine/eligibility";
import type { PracticeId } from "@/domain/types";
import { isSetupStep, nextStep, SETUP_STEPS, stepIndex } from "@/console/setup-steps";

const NOW = "2026-08-09T04:30:00Z";
const OWNER = "owner@demo.practice.example";
const OUTSIDER = "stranger@elsewhere.example";
const PRACTICE = { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 10 };

const ROSTER = [
  { displayName: "Dr Amara Lee", participating: true },
  { displayName: "Dr Sam Okafor", participating: false },
];

// W166: the practice under test. Ids are generated now, so no literal can stand in for it.
let PRACTICE_ID: PracticeId;
const record = () => practiceRecord(PRACTICE_ID)!;

beforeEach(() => {
  resetConsole();
  onboardPractice(PRACTICE, NOW, OWNER);
  PRACTICE_ID = getConsole().practices[0]!.practice.id;
});

describe("W41 step definitions", () => {
  it("five ordered steps ending at review", () => {
    expect(SETUP_STEPS).toHaveLength(5);
    expect(SETUP_STEPS.at(-1)!.slug).toBe("review");
    expect(nextStep("review")).toBeNull();
    expect(nextStep("practice")).toBe("clinicians");
    expect(stepIndex("sessions")).toBe(2);
  });

  it("recognises only real steps", () => {
    expect(isSetupStep("clinicians")).toBe(true);
    expect(isSetupStep("nonsense")).toBe(false);
  });
});

describe("W41 clinician roster", () => {
  it("saves a roster and assigns stable ids", () => {
    expect(saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER)).toEqual({});
    const { clinicians } = record();
    expect(clinicians.map((c) => c.id)).toEqual(["clin-1", "clin-2"]);
    expect(clinicians[0]).toMatchObject({ displayName: "Dr Amara Lee", participating: true });
  });

  it("requires at least one participating clinician", () => {
    const errors = validateClinicians([{ displayName: "Dr Solo", participating: false }]);
    expect(errors.clinicians).toMatch(/participating/i);
    expect(saveClinicians(PRACTICE_ID, [{ displayName: "Dr Solo", participating: false }], NOW, OWNER)).toHaveProperty(
      "clinicians",
    );
    expect(record().clinicians).toHaveLength(0);
  });

  it("rejects an empty roster, short names and duplicates", () => {
    expect(validateClinicians([])).toHaveProperty("clinicians");
    expect(validateClinicians([{ displayName: "X", participating: true }])).toHaveProperty("clinician-0");
    expect(
      validateClinicians([
        { displayName: "Dr Lee", participating: true },
        { displayName: "  dr lee ", participating: true },
      ]).clinicians,
    ).toMatch(/unique/i);
  });

  it("refuses a caller without the grant", () => {
    expect(saveClinicians(PRACTICE_ID, ROSTER, NOW, OUTSIDER)).toHaveProperty("form");
    expect(record().clinicians).toHaveLength(0);
  });

  it("drops allowlisted clinicians that no longer exist", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    saveSessionConfig(PRACTICE_ID, 
      { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: ["clin-1", "clin-2"] },
      NOW,
      OWNER,
    );
    // Roster shrinks to one — the stale id must not survive in session config.
    const first = record().clinicians[0]!;
    saveClinicians(PRACTICE_ID, [{ id: first.id, displayName: first.displayName, participating: true }], NOW, OWNER);
    expect(record().sessionConfig.participatingClinicianIds).toEqual([first.id]);
  });

  it("W41 review fix: an emptied allowlist fails CLOSED, never widens to 'all'", () => {
    // Previously this collapsed to "all" — the most permissive value — turning a
    // deliberate narrowing into a grant-everyone on an unrelated staff edit.
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    saveSessionConfig(PRACTICE_ID, { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: ["clin-2"] }, NOW, OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);

    saveClinicians(PRACTICE_ID, [{ displayName: "Dr New Person", participating: true }], NOW, OWNER);

    const state = record();
    expect(state.sessionConfig.participatingClinicianIds).toEqual([]);
    // Empty is invalid, so the step loses its acknowledgement and setup cannot certify.
    expect(state.acknowledgedSteps).not.toContain("sessions");
    expect(setupReadiness(record()).sessions).toBe(false);
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toHaveProperty("fillableTypes");
    // And the narrowing is on the record, not silent.
    expect(getConsole().auditEvents.some((e) => e.detail.includes("allowlist narrowed"))).toBe(true);
  });

  it("W41 review fix: ids survive an edit, so the allowlist keeps naming the same person", () => {
    // Clearing a non-last row used to shift every id below it, silently re-pointing
    // the allowlist at a different clinician.
    const three = [
      { displayName: "Dr Lee", participating: true },
      { displayName: "Dr Okafor", participating: true },
      { displayName: "Dr Chen", participating: true },
    ];
    saveClinicians(PRACTICE_ID, three, NOW, OWNER);
    const saved = record().clinicians;
    const lee = saved.find((c) => c.displayName === "Dr Lee")!;
    const okafor = saved.find((c) => c.displayName === "Dr Okafor")!;
    const chen = saved.find((c) => c.displayName === "Dr Chen")!;

    // Offer only Dr Chen.
    saveSessionConfig(PRACTICE_ID, { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: [chen.id] }, NOW, OWNER);

    // Remove Dr Lee — the FIRST row, the case that used to shift every id.
    saveClinicians(PRACTICE_ID, 
      [
        { id: okafor.id, displayName: "Dr Okafor", participating: true },
        { id: chen.id, displayName: "Dr Chen", participating: true },
      ],
      NOW,
      OWNER,
    );

    const after = record();
    // Chen keeps her id, and the allowlist still means Chen — not whoever slid up.
    expect(after.clinicians.find((c) => c.displayName === "Dr Chen")!.id).toBe(chen.id);
    expect(after.sessionConfig.participatingClinicianIds).toEqual([chen.id]);
    // The retired id is never reissued to a new person.
    saveClinicians(PRACTICE_ID, 
      [
        { id: okafor.id, displayName: "Dr Okafor", participating: true },
        { id: chen.id, displayName: "Dr Chen", participating: true },
        { displayName: "Dr Newcomer", participating: true },
      ],
      NOW,
      OWNER,
    );
    const newcomer = record().clinicians.find((c) => c.displayName === "Dr Newcomer")!;
    expect(newcomer.id).not.toBe(lee.id);
    expect(newcomer.id).not.toBe(okafor.id);
    expect(newcomer.id).not.toBe(chen.id);
  });
});

describe("W41 session config validation", () => {
  it("accepts the default config", () => {
    expect(validateSessionConfig(DEFAULT_SESSION_CONFIG)).toEqual({});
  });

  it("rejects an out-of-range protected fraction", () => {
    for (const fraction of [-0.1, 1.5, Number.NaN]) {
      expect(
        validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, protectedCapacityFraction: fraction }),
      ).toHaveProperty("protectedCapacityFraction");
    }
  });

  it("rejects an inverted or non-integer window", () => {
    expect(
      validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 17, endHour: 9 } }),
    ).toHaveProperty("endHour");
    expect(
      validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 9, endHour: 9 } }),
    ).toHaveProperty("endHour");
    expect(
      validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 8.5, endHour: 17 } }),
    ).toHaveProperty("startHour");
    expect(
      validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 0, endHour: 25 } }),
    ).toHaveProperty("endHour");
  });

  it("rejects an empty type list and an empty explicit allowlist", () => {
    expect(validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, fillableTypes: [] })).toHaveProperty(
      "fillableTypes",
    );
    expect(
      validateSessionConfig({ ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: [] }),
    ).toHaveProperty("participatingClinicianIds");
  });

  it("persists a valid config and audits it", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    const config = {
      ...DEFAULT_SESSION_CONFIG,
      fillableTypes: ["standard" as const],
      protectedCapacityFraction: 0.2,
      schedulingWindow: { startHour: 9, endHour: 17 },
    };
    expect(saveSessionConfig(PRACTICE_ID, config, NOW, OWNER)).toEqual({});
    expect(record().sessionConfig).toMatchObject(config);
    expect(getConsole().auditEvents.at(-1)?.subjectId).toBe("setup:sessions");
  });

  it("refuses an allowlist naming an unknown clinician", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    expect(
      saveSessionConfig(PRACTICE_ID, 
        { ...DEFAULT_SESSION_CONFIG, participatingClinicianIds: ["clin-99"] },
        NOW,
        OWNER,
      ),
    ).toHaveProperty("participatingClinicianIds");
  });

  it("stores a copy, not a reference the caller can mutate later", () => {
    const fillableTypes: AppointmentType[] = ["standard"];
    saveSessionConfig(PRACTICE_ID, { ...DEFAULT_SESSION_CONFIG, fillableTypes }, NOW, OWNER);
    fillableTypes.push("telehealth");
    expect(record().sessionConfig.fillableTypes).toEqual(["standard"]);
  });
});

describe("W41 readiness and completion", () => {
  it("a fresh practice is not ready until a roster exists", () => {
    const before = setupReadiness(record());
    expect(before).toMatchObject({ practice: true, clinicians: false, complete: false });
    // Keyed by the unmet prerequisite, not a generic form error.
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toHaveProperty("clinicians");
    expect(record().setupCompletedAt).toBeNull();
  });

  it("refuses completion when sessions and rules were never reviewed", () => {
    // The seeded defaults validate clean, so validity alone must not count as
    // configured — otherwise finishing setup attests to wide-open defaults
    // (all appointment types, 0% protected, 24h window) nobody ever saw.
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    expect(setupReadiness(record())).toMatchObject({ clinicians: true, sessions: false, rules: false });
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toHaveProperty("fillableTypes");
    expect(record().setupCompletedAt).toBeNull();

    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toHaveProperty("minDaysSinceLastVisit");

    acknowledgeSetupStep(PRACTICE_ID, "rules", OWNER);
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toEqual({});
  });

  it("acknowledgement is idempotent and needs the grant", () => {
    expect(acknowledgeSetupStep(PRACTICE_ID, "sessions", OUTSIDER)).toHaveProperty("form");
    expect(record().acknowledgedSteps).toEqual([]);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    expect(record().acknowledgedSteps).toEqual(["sessions"]);
  });

  it("completes once every prerequisite is met, and is idempotent", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    updateRules(PRACTICE_ID, { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 200 }, NOW, OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "rules", OWNER);
    expect(completeSetup(PRACTICE_ID, NOW, OWNER)).toEqual({});
    const completedAt = record().setupCompletedAt;
    expect(completedAt).toBe(NOW);
    expect(setupReadiness(record()).complete).toBe(true);

    expect(completeSetup(PRACTICE_ID, "2026-08-09T05:00:00Z", OWNER)).toEqual({});
    expect(record().setupCompletedAt).toBe(completedAt); // unchanged
    expect(getConsole().auditEvents.filter((e) => e.subjectId === "setup:complete")).toHaveLength(1);
  });

  it("refuses completion from a caller without the grant", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "rules", OWNER);
    expect(completeSetup(PRACTICE_ID, NOW, OUTSIDER)).toHaveProperty("form");
    expect(record().setupCompletedAt).toBeNull();
  });

  it("readiness reports each prerequisite independently", () => {
    saveClinicians(PRACTICE_ID, ROSTER, NOW, OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "sessions", OWNER);
    acknowledgeSetupStep(PRACTICE_ID, "rules", OWNER);
    const readiness = setupReadiness(record());
    expect(readiness).toMatchObject({ practice: true, clinicians: true, sessions: true, rules: true });
  });
});
