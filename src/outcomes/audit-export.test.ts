// W177 verify gate: "golden export that carries its own caveats where it travels away from the
// product that explains it (W149's pattern)."
//
// The golden test is the byte-for-byte one at the bottom. The tests above it are the ones that
// stop the golden test being a snapshot of the wrong thing: which trail this is, what it excludes,
// and what it says about its own silence.

import { describe, expect, it } from "vitest";
import {
  AUDIT_EXPORT_CAVEATS,
  CONFIGURATION_KINDS,
  PatientTrailInExportError,
  buildAuditExport,
  renderAuditExport,
} from "./audit-export";
import { assignHoldout } from "@/engine/holdout";
import {
  getConsole,
  onboardPractice,
  practiceRecord,
  resetConsole,
  updateRules,
} from "@/console/store";
import { DEFAULT_CONFIG } from "@/engine/eligibility";
import type { AuditEvent, Patient, PatientId, PracticeId, Practice } from "@/domain/types";

const PRACTICE = "prac-1" as PracticeId;
const OTHER = "prac-2" as PracticeId;

const event = (over: Partial<AuditEvent> = {}): AuditEvent => ({
  practiceId: PRACTICE,
  kind: "config_changed",
  at: "2026-03-02T09:00:00Z",
  subjectId: "rules-v2",
  detail: "minDaysSinceLastVisit: 180 -> 240",
  ...over,
});

describe("W177 it is ONE practice's trail, for one window", () => {
  it("takes the practice id as the query, not as a filter afterwards", () => {
    const exported = buildAuditExport(
      [event(), event({ practiceId: OTHER, subjectId: "rules-v9" })],
      PRACTICE,
      "Demo Family Practice",
      "2026-03-01",
      "2026-03-31",
    );
    expect(exported.events).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain("prac-2");
  });

  it("includes both ends of the window, because 'March' means all of March", () => {
    const exported = buildAuditExport(
      [
        event({ at: "2026-03-01T00:00:00Z", subjectId: "first" }),
        event({ at: "2026-03-31T23:59:59Z", subjectId: "last" }),
        event({ at: "2026-04-01T00:00:00Z", subjectId: "after" }),
        event({ at: "2026-02-28T23:00:00Z", subjectId: "before" }),
      ],
      PRACTICE,
      "Demo Family Practice",
      "2026-03-01",
      "2026-03-31",
    );
    expect(exported.events.map((e) => e.subjectId)).toEqual(["first", "last"]);
  });

  it("says in the document that it covers one practice only", () => {
    // W166 made multi-practice real, so "is this the group's trail?" is now a live misreading.
    expect(AUDIT_EXPORT_CAVEATS.join(" ")).toContain("covers this practice only");
  });
});

describe("W177 it is the CONFIGURATION trail, not the patient one", () => {
  it("carries no patient identity, checked rather than assumed", () => {
    // Both trails are AuditEvent[] and the type system cannot tell them apart, so the absence is
    // asserted against real console events rather than trusted from W106's registry.
    resetConsole();
    onboardPractice(
      { name: "Demo Family Practice", timezone: "Australia/Sydney", holdoutPercent: 10 },
      "2026-03-01T00:00:00Z",
      "owner@demo.example",
    );
    const state = getConsole();
    const practice = state.practices[0]!.practice;
    updateRules(practice.id, { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 240 }, "2026-03-02T09:00:00Z", "owner@demo.example");

    const exported = buildAuditExport(
      state.auditEvents,
      practice.id,
      practice.name,
      "2026-01-01",
      "2026-12-31",
    );
    expect(exported.events.length).toBeGreaterThan(1);
    for (const e of exported.events) {
      expect(e.subjectId, `${e.kind} names a patient`).not.toMatch(/^pat[:-]/);
      expect(e.kind).not.toBe("holdout_assigned");
      expect(e.kind).not.toBe("patient_opted_out");
    }
  });

  it("does not export the rail's patient-keyed events even when handed them", () => {
    // The specific mistake available: pass the wrong AuditEvent[] and the export silently becomes
    // a patient-data disclosure. The window and practice filters do not catch it, so the caveat
    // and this test are what stand between the two trails.
    const patients: Patient[] = [
      {
        id: "pat-001" as PatientId,
        practiceId: PRACTICE,
        usualClinicianId: null,
        smsConsent: true,
        optedOut: false,
        lastAttendedAt: "2026-01-01",
        futureBookingAt: null,
        activeRecall: false,
        chronicCare: true,
        holdout: false,
      },
    ];
    const practice: Practice = {
      id: PRACTICE,
      name: "Demo Family Practice",
      timezone: "Australia/Sydney",
      // Rate 1, not a middling rate: `assignHoldout` emits an event only where the computed arm
      // DIFFERS from the stored flag, so at 0.5 this patient hashes to invite, matches their
      // stored `holdout: false`, and the fixture is an empty array — a test of nothing.
      holdoutRate: 1,
    };
    const railEvents = assignHoldout(patients, practice, "2026-03-05T00:00:00Z").auditEvents;
    expect(railEvents.some((e) => e.kind === "holdout_assigned")).toBe(true);

    // Handing in the rail's trail is refused, not silently filtered. The practice and window
    // filters would both pass these rows — they ARE this practice's, and they ARE in the window —
    // so nothing else in the pipeline stands between the two trails.
    expect(() =>
      buildAuditExport(railEvents, PRACTICE, "Demo", "2026-03-01", "2026-03-31"),
    ).toThrow(PatientTrailInExportError);
    try {
      buildAuditExport(railEvents, PRACTICE, "Demo", "2026-03-01", "2026-03-31");
    } catch (error) {
      // Names the kinds, so a caller sees WHICH trail they handed in rather than that something
      // was wrong, and is pointed at the request that does answer for patient data.
      expect((error as PatientTrailInExportError).kinds).toContain("holdout_assigned");
      expect((error as PatientTrailInExportError).message).toContain("W33");
    }
    // The document is explicit about what belongs here, so a reader can tell it went wrong.
    expect(AUDIT_EXPORT_CAVEATS.join(" ")).toContain("does not contain any patient's record");
  });

  it("refuses a mixed batch rather than dropping the patient rows out of it", () => {
    // The likelier shape of the mistake than a wholly-rail batch: a caller concatenates both
    // trails. Dropping the foreign rows would produce a document that looks complete and is
    // missing entries it never announced, so the whole build fails instead.
    const railEvents = assignHoldout(
      [
        {
          id: "pat-001" as PatientId,
          practiceId: PRACTICE,
          usualClinicianId: null,
          smsConsent: true,
          optedOut: false,
          lastAttendedAt: "2026-01-01",
          futureBookingAt: null,
          activeRecall: false,
          chronicCare: true,
          holdout: false,
        },
      ],
      { id: PRACTICE, name: "Demo", timezone: "Australia/Sydney", holdoutRate: 1 },
      "2026-03-05T00:00:00Z",
    ).auditEvents;
    expect(() =>
      buildAuditExport([event(), ...railEvents], PRACTICE, "Demo", "2026-03-01", "2026-03-31"),
    ).toThrow(PatientTrailInExportError);
  });

  it("names every foreign kind, in a fixed order", () => {
    // A caller told about one kind fixes one kind. The list is sorted so two runs over the same
    // mistake report it identically — the order-dependence class this tree keeps finding.
    const foreign = [
      event({ kind: "invitation_sent", subjectId: "inv-2" }),
      event({ kind: "holdout_assigned", subjectId: "pat-001" }),
      event({ kind: "invitation_sent", subjectId: "inv-1" }),
    ];
    try {
      buildAuditExport(foreign, PRACTICE, "Demo", "2026-03-01", "2026-03-31");
      expect.unreachable("expected a PatientTrailInExportError");
    } catch (error) {
      expect((error as PatientTrailInExportError).kinds).toEqual([
        "holdout_assigned",
        "invitation_sent",
      ]);
    }
  });

  it("keeps CONFIGURATION_KINDS a closed list, so a new kind does not join by default", () => {
    // The registry is the whole mechanism: an exclusion filter would admit every kind added to
    // AuditEventKind after this unit, which is how a configuration document becomes a disclosure.
    expect(CONFIGURATION_KINDS).toEqual(["config_changed"]);
  });
});

describe("W177 the export carries its own caveats", () => {
  it("says it records changes, not whether they were right", () => {
    expect(AUDIT_EXPORT_CAVEATS[0]).toContain("does not say whether a change was correct");
  });

  it("says silence means nothing was recorded, not that nothing happened", () => {
    // W120's rule, in the place a reader is most likely to draw the wrong conclusion from a
    // short list — a practice that adopted Meherr in June has an empty May.
    expect(AUDIT_EXPORT_CAVEATS[1]).toContain("does not mean nothing happened");
  });

  it("puts every caveat in the rendered document, not only in the object", () => {
    const rendered = renderAuditExport(
      buildAuditExport([event()], PRACTICE, "Demo Family Practice", "2026-03-01", "2026-03-31"),
      "2026-04-01",
    );
    for (const caveat of AUDIT_EXPORT_CAVEATS) expect(rendered).toContain(caveat);
  });

  it("says which of the two things an empty window means", () => {
    const rendered = renderAuditExport(
      buildAuditExport([], PRACTICE, "Demo Family Practice", "2026-05-01", "2026-05-31"),
      "2026-06-01",
    );
    expect(rendered).toContain("not that the practice made");
    expect(rendered).toContain("no decisions in that time");
  });
});

describe("W177 the export is golden", () => {
  const EVENTS: AuditEvent[] = [
    event({ at: "2026-03-02T09:00:00Z", subjectId: "rules-v2", detail: "minDaysSinceLastVisit: 180 -> 240" }),
    event({ at: "2026-03-01T08:00:00Z", subjectId: "prac-1", detail: "practice onboarded: Demo Family Practice (Australia/Sydney, holdout 10%)" }),
    event({ at: "2026-03-03T10:00:00Z", subjectId: "setup:clinicians", detail: "roster set to 2 clinician(s)" }),
  ];

  it("renders the same bytes whatever order the events arrive in", () => {
    // A golden document that depends on input order is a golden document for one caller.
    const forwards = renderAuditExport(
      buildAuditExport(EVENTS, PRACTICE, "Demo Family Practice", "2026-03-01", "2026-03-31"),
      "2026-04-01",
    );
    const backwards = renderAuditExport(
      buildAuditExport([...EVENTS].reverse(), PRACTICE, "Demo Family Practice", "2026-03-01", "2026-03-31"),
      "2026-04-01",
    );
    expect(backwards).toBe(forwards);
  });

  it("breaks a same-instant tie deterministically, down to the detail", () => {
    const tied: AuditEvent[] = [
      event({ at: "2026-03-04T09:00:00Z", subjectId: "setup:sessions", detail: "b" }),
      event({ at: "2026-03-04T09:00:00Z", subjectId: "setup:sessions", detail: "a" }),
      event({ at: "2026-03-04T09:00:00Z", subjectId: "setup:clinicians", detail: "c" }),
    ];
    const order = (list: AuditEvent[]) =>
      buildAuditExport(list, PRACTICE, "Demo", "2026-03-01", "2026-03-31").events.map((e) => e.detail);
    expect(order(tied)).toEqual(["c", "a", "b"]);
    expect(order([...tied].reverse())).toEqual(["c", "a", "b"]);
  });

  it("matches the golden document", () => {
    const rendered = renderAuditExport(
      buildAuditExport(EVENTS, PRACTICE, "Demo Family Practice", "2026-03-01", "2026-03-31"),
      "2026-04-01",
    );
    expect(rendered).toBe(
      [
        `# Configuration audit trail — Demo Family Practice`,
        ``,
        "Practice `prac-1`. Covering 2026-03-01 to 2026-03-31 inclusive.",
        `Generated 2026-04-01. 3 entr(y/ies).`,
        ``,
        `## What this document is`,
        ``,
        ...AUDIT_EXPORT_CAVEATS.map((c) => `- ${c}`),
        ``,
        `## Entries`,
        ``,
        `| When | What | Subject | Detail |`,
        `|---|---|---|---|`,
        `| 2026-03-01T08:00:00Z | config_changed | prac-1 | practice onboarded: Demo Family Practice (Australia/Sydney, holdout 10%) |`,
        `| 2026-03-02T09:00:00Z | config_changed | rules-v2 | minDaysSinceLastVisit: 180 -> 240 |`,
        `| 2026-03-03T10:00:00Z | config_changed | setup:clinicians | roster set to 2 clinician(s) |`,
        ``,
        `Kinds present in this window: config_changed.`,
        ``,
      ].join("\n"),
    );
  });

  it("names the kinds present, so a reader sees what the trail does not record", () => {
    const exported = buildAuditExport(EVENTS, PRACTICE, "Demo", "2026-03-01", "2026-03-31");
    expect(exported.kindsPresent).toEqual(["config_changed"]);
  });
});
