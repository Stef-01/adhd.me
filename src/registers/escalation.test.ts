// W73 verify gate: trigger fixtures, and no trigger emits clinical advice.

import { describe, expect, it } from "vitest";
import type { ConditionCode, PatientId, PracticeId } from "@/domain/types";
import {
  SHIPPED_TRIGGERS,
  type EscalationTrigger,
  escalate,
  lintEscalationText,
  lintTriggers,
} from "./escalation";

const PRACTICE = "prac-1" as PracticeId;
const PATIENT = "p1" as PatientId;
const AT = "2026-08-10T09:00:00Z";

describe("W73 shipped triggers", () => {
  it("every shipped trigger passes the advice linter", () => {
    // The unit's gate, asserted over the real shipped set rather than a fixture.
    expect(lintTriggers()).toEqual([]);
  });

  it("every trigger routes to the usual GP and nowhere else", () => {
    for (const trigger of SHIPPED_TRIGGERS) {
      expect(trigger.route).toBe("usual_gp");
    }
  });

  it("every trigger carries a rationale a reviewer can read", () => {
    for (const trigger of SHIPPED_TRIGGERS) {
      expect(trigger.rationale.length).toBeGreaterThan(40);
      expect(trigger.observation.trim()).not.toBe("");
    }
  });

  it("an escalation record has nowhere to put advice", () => {
    const { escalations } = escalate([
      { practiceId: PRACTICE, patientId: PATIENT, event: "complaint_logged", at: AT },
    ]);

    // Structural: the shape carries an observation and a route, and no severity, no
    // suspected cause, no recommended action.
    expect(Object.keys(escalations[0]!).sort()).toEqual(
      ["at", "event", "observation", "patientId", "practiceId", "route", "triggerId"].sort(),
    );
  });
});

describe("W73 the advice linter", () => {
  it.each([
    ["no-diagnosis", "Patient likely has an underlying problem"],
    ["no-diagnosis", "Suspected deterioration since last visit"],
    ["no-clinical-advice", "This patient should be seen within a week"],
    ["no-clinical-advice", "We recommend a medication review"],
    ["no-urgency", "Urgent — contact today"],
    ["no-severity-grading", "Severe presentation, high-risk patient"],
    ["no-condition-assertion", "Has diabetes and is uncontrolled"],
    ["no-triage-language", "Please triage and prioritise"],
  ])("rejects %s: %s", (rule, text) => {
    const findings = lintEscalationText(text);
    expect(findings.map((f) => f.rule)).toContain(rule);
  });

  it("accepts a factual observation with no clinical content", () => {
    expect(lintEscalationText("This patient replied to an appointment message with their own words.")).toEqual([]);
    expect(lintEscalationText("A complaint was logged about contact from the practice.")).toEqual([]);
  });

  it("drops a trigger whose wording fails the linter, and says so", () => {
    // Fail-closed: bad wording must not reach staff, and the drop must not be silent.
    const bad: EscalationTrigger = {
      id: "bad-trigger",
      event: "complaint_logged",
      conditionCode: null,
      route: "usual_gp",
      observation: "Patient is high-risk and should be seen urgently.",
      rationale: "a rationale long enough to pass the shape check for this fixture",
    };

    const { escalations, rejectedTriggers } = escalate(
      [{ practiceId: PRACTICE, patientId: PATIENT, event: "complaint_logged", at: AT }],
      [bad],
    );

    expect(escalations).toEqual([]);
    expect(rejectedTriggers).toEqual(["bad-trigger"]);
  });
});

describe("W73 trigger fixtures", () => {
  it("fires only for the matching event", () => {
    const { escalations } = escalate([
      { practiceId: PRACTICE, patientId: PATIENT, event: "patient_replied_free_text", at: AT },
    ]);

    expect(escalations).toHaveLength(1);
    expect(escalations[0]!.triggerId).toBe("free-text-reply");
  });

  it("fires for each observed event independently", () => {
    const { escalations } = escalate([
      { practiceId: PRACTICE, patientId: PATIENT, event: "complaint_logged", at: AT },
      { practiceId: PRACTICE, patientId: "p2" as PatientId, event: "repeated_generated_dna", at: AT },
    ]);

    expect(escalations.map((e) => e.triggerId).sort()).toEqual(["complaint", "repeated-dna"]);
    expect(escalations.map((e) => e.patientId).sort()).toEqual(["p1", "p2"]);
  });

  it("honours a condition-scoped trigger", () => {
    const scoped: EscalationTrigger = {
      ...SHIPPED_TRIGGERS[0]!,
      id: "scoped",
      conditionCode: "cond_a" as ConditionCode,
    };

    const matching = escalate(
      [
        {
          practiceId: PRACTICE,
          patientId: PATIENT,
          event: "patient_replied_free_text",
          conditionCode: "cond_a" as ConditionCode,
          at: AT,
        },
      ],
      [scoped],
    );
    const other = escalate(
      [
        {
          practiceId: PRACTICE,
          patientId: PATIENT,
          event: "patient_replied_free_text",
          conditionCode: "cond_b" as ConditionCode,
          at: AT,
        },
      ],
      [scoped],
    );

    expect(matching.escalations).toHaveLength(1);
    expect(other.escalations).toEqual([]);
  });

  it("an unscoped trigger fires regardless of register", () => {
    const { escalations } = escalate([
      {
        practiceId: PRACTICE,
        patientId: PATIENT,
        event: "complaint_logged",
        conditionCode: "cond_anything" as ConditionCode,
        at: AT,
      },
    ]);

    expect(escalations).toHaveLength(1);
  });

  it("carries the practice through, so an escalation cannot land on the wrong desk", () => {
    const { escalations } = escalate([
      { practiceId: "prac-2" as PracticeId, patientId: PATIENT, event: "complaint_logged", at: AT },
    ]);

    expect(escalations[0]!.practiceId).toBe("prac-2");
  });

  it("produces nothing from an event no trigger covers", () => {
    const { escalations } = escalate(
      [{ practiceId: PRACTICE, patientId: PATIENT, event: "complaint_logged", at: AT }],
      [SHIPPED_TRIGGERS.find((t) => t.id === "free-text-reply")!],
    );

    expect(escalations).toEqual([]);
  });
});

describe("W73 no escalation emits clinical advice", () => {
  it("holds for every event over the shipped trigger set", () => {
    // The gate stated as a property over all outputs, not just the trigger definitions:
    // whatever comes out of escalate() must pass the linter.
    const events = [
      "patient_replied_free_text",
      "complaint_logged",
      "repeated_generated_dna",
      "opt_out_with_message",
    ] as const;

    const { escalations } = escalate(
      events.map((event) => ({ practiceId: PRACTICE, patientId: PATIENT, event, at: AT })),
    );

    expect(escalations.length).toBe(events.length);
    for (const escalation of escalations) {
      expect(lintEscalationText(escalation.observation)).toEqual([]);
      expect(escalation.route).toBe("usual_gp");
    }
  });
});
