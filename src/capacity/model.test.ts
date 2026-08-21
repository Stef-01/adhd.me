// W222 verify gate: "over the synthetic practice; a session with no recorded history yields no
// forecast rather than a default."
//
// The gate is an absence, so the load-bearing assertion is on the SHAPE of the no-history value:
// it must have no numeric field for a forecaster to read. Checked on the value's own keys rather
// than by reading the type, because the type is what a later `utilisation?: number` would widen
// without anybody noticing.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { generatePractice } from "@/synthetic/generate";
import { isoDaysFrom } from "@/lib/dates";
import type { Appointment, AppointmentId, AppointmentStatus, ClinicianId, PracticeId } from "@/domain/types";
import { lintEducationCopy } from "@/education/advice-lint";
import {
  NO_HISTORY_COPY,
  SLOT_STATUS,
  WEEKDAY_NAMES,
  capacityReport,
  occurrencesFrom,
  sessionHistory,
  sessionKeyOf,
  sessionKeysFrom,
} from "./model";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const TODAY = sim.config.todayIso;
const AS_OF = isoDaysFrom(TODAY, 6 * 7 + 1);
const PERIOD = { fromIso: TODAY, toIso: AS_OF };

const report = () => capacityReport(sim.appointments, AS_OF, PERIOD);

let seq = 0;
const slot = (
  clinicianId: string,
  dayIso: string,
  status: AppointmentStatus,
): Appointment => ({
  id: `fixture-${seq++}` as AppointmentId,
  practiceId: "p1" as PracticeId,
  clinicianId: clinicianId as ClinicianId,
  startsAt: `${dayIso}T09:00:00+10:00`,
  status,
  patientId: null,
  generatedByInvitation: false,
});

describe("W222 the model reads the practice's own recorded diary", () => {
  it("finds sessions in the simulated practice at all", () => {
    // Non-vacuity first: every refusal below is interesting only if the happy path is populated.
    const occurrences = occurrencesFrom(sim.appointments, AS_OF);
    expect(occurrences.length).toBe(411);
    expect(sessionKeysFrom(occurrences).length).toBe(70);
    const sessions = report().sessions;
    expect(sessions.filter((s) => s.history.recorded)).toHaveLength(70);
  });

  it("counts utilisation as filled over offered, and states what it counted", () => {
    const recorded = report().sessions.map((s) => s.history).filter((h) => h.recorded === true);
    expect(recorded.length).toBeGreaterThan(0);
    for (const history of recorded) {
      if (!history.recorded) continue;
      expect(history.slotsOffered).toBeGreaterThan(0);
      expect(history.slotsFilled).toBeLessThanOrEqual(history.slotsOffered);
      expect(history.utilisation).toBe(history.slotsFilled / history.slotsOffered);
      // W196: the number is not readable without its denominator and its period.
      expect(history.basis.recordedFacts).toBe(history.slotsOffered);
      expect(history.basis.fromIso).toBe(TODAY);
      expect(history.occurrences).toBeGreaterThan(0);
    }
  });

  it("does not depend on the order the diary arrives in", () => {
    const forwards = report();
    const backwards = capacityReport([...sim.appointments].reverse(), AS_OF, PERIOD);
    expect(backwards).toEqual(forwards);
  });
});

describe("W222 a session with no recorded history yields no number at all", () => {
  it("has NO numeric field on the no-history arm — the gate, asserted on the value", () => {
    // The whole unit. A forecaster cannot read a default out of this because there is nothing
    // there to read: not a zero, not a null, not an optional. Checked on the keys, since the type
    // is what a later `utilisation?: number` would widen quietly.
    const history = sessionHistory([], { clinicianId: "c1", weekday: 4 }, PERIOD);
    expect(history.recorded).toBe(false);
    expect(Object.keys(history).sort()).toEqual(["copy", "recorded", "why"]);
    for (const value of Object.values(history)) expect(typeof value).not.toBe("number");
  });

  it("reports every session of the synthetic practice as never run, over real data", () => {
    // Not a fixture: `generatePractice` writes only a FORWARD schedule, so at its own as-of date
    // the practice has no past whatsoever and the model can say nothing about any of its
    // sessions. That is the gate holding over the tree's own data rather than over a contrivance.
    const data = generatePractice({
      patientCount: 200,
      clinicianCount: 4,
      scheduleWeeks: 4,
      todayIso: TODAY,
      seed: 7,
    });
    expect(data.appointments.length).toBeGreaterThan(100);
    const forward = capacityReport(data.appointments, TODAY, PERIOD);
    expect(forward.sessions).toEqual([]);
    // And one day later the same diary is still silent about the sessions that have not run.
    expect(sessionHistory(occurrencesFrom(data.appointments, TODAY), { clinicianId: String(data.clinicians[0]!.id), weekday: 1 }, PERIOD)).toEqual({
      recorded: false,
      why: "never_run",
      copy: NO_HISTORY_COPY.never_run,
    });
  });

  it("refuses a rate when the session offered nothing, rather than reporting nought per cent", () => {
    // Reachable, not theoretical: a clinician off sick has the whole list cancelled. Those slots
    // were withdrawn before they ran, so they are in neither the numerator nor the denominator,
    // and `filled / offered` has no answer rather than the answer zero.
    const cancelledDay = [
      slot("c9", "2026-08-13", "cancelled"),
      slot("c9", "2026-08-13", "cancelled"),
      slot("c9", "2026-08-20", "cancelled"),
    ];
    const built = capacityReport(cancelledDay, AS_OF, PERIOD);
    expect(built.sessions).toHaveLength(1);
    expect(built.sessions[0]!.history).toEqual({
      recorded: false,
      why: "no_slots_offered",
      copy: NO_HISTORY_COPY.no_slots_offered,
    });
    // NOT reachable from the simulation — it records no cancellations at all — which is exactly
    // why it is pinned here. A refusal only a fixture can reach is still a refusal that must work.
    expect(sim.appointments.some((a) => a.status === "cancelled")).toBe(false);
  });

  it("declares both refusals and a sentence for each, in both directions", () => {
    const produced = new Set<string>();
    const built = capacityReport(
      [slot("c9", "2026-08-13", "cancelled"), slot("c8", "2026-08-14", "open")],
      AS_OF,
      PERIOD,
    );
    for (const session of built.sessions) {
      if (!session.history.recorded) produced.add(session.history.why);
    }
    produced.add(
      (sessionHistory([], { clinicianId: "nobody", weekday: 0 }, PERIOD) as { why: string }).why,
    );
    expect([...produced].sort()).toEqual(["never_run", "no_slots_offered"]);
    expect(Object.keys(NO_HISTORY_COPY).sort()).toEqual(["never_run", "no_slots_offered"]);
  });
});

describe("W222 a session that has not happened yet is not a session that went unfilled", () => {
  it("drops the future in the grouping, not in a later filter", () => {
    const diary = [slot("c1", "2026-08-10", "open"), slot("c1", "2026-08-24", "open")];
    // As of the 17th, only the first has happened. The second is unoffered, not unfilled.
    const past = occurrencesFrom(diary, "2026-08-17");
    expect(past.map((o) => o.dayIso)).toEqual(["2026-08-10"]);
    // And as of the 11th the same diary is one occurrence; as of the 10th it is none, because a
    // session part-way through has not finished being filled.
    expect(occurrencesFrom(diary, "2026-08-11").map((o) => o.dayIso)).toEqual(["2026-08-10"]);
    expect(occurrencesFrom(diary, "2026-08-10")).toEqual([]);
  });

  it("refuses an as-of date it cannot read rather than counting everything", () => {
    // A silent default here would count the whole future as unfilled history.
    expect(() => occurrencesFrom([], "not-a-date")).toThrow(/ISO date/);
  });
});

describe("W222 what counts as offered and filled is declared, with the judgements named", () => {
  it("holds an entry for every appointment status the tree declares", () => {
    expect(Object.keys(SLOT_STATUS).sort()).toEqual([
      "attended",
      "booked",
      "cancelled",
      "dna",
      "open",
    ]);
    for (const entry of Object.values(SLOT_STATUS)) {
      expect(entry.why.length, "a status is classified with no reason at all").toBeGreaterThan(0);
      // `filled` without `offered` is incoherent: a slot cannot be taken without being on offer.
      if (entry.filled) expect(entry.offered).toBe(true);
    }
    // The bar is on the two entries a reader could DISAGREE with, not on all five. "The
    // appointment happened in this slot" needs no argument; counting a no-show as occupied and a
    // cancellation as never-offered both do, and a one-line gloss there would be the classification
    // hiding behind a label. Applying one length rule to all five would have meant either padding
    // the obvious entry or lowering the bar for the arguable ones.
    for (const status of ["dna", "cancelled"] as const) {
      expect(SLOT_STATUS[status].why.length, `${status} is a judgement stated as a label`).toBeGreaterThan(120);
    }
  });

  it("counts a DNA as filled and a cancellation as neither, pinned by example", () => {
    // The two judgements, asserted by their arithmetic rather than by their comment. A DNA held
    // the slot; counting it empty would report capacity the practice never had.
    const day = occurrencesFrom(
      [
        slot("c2", "2026-08-13", "dna"),
        slot("c2", "2026-08-13", "open"),
        slot("c2", "2026-08-13", "cancelled"),
      ],
      AS_OF,
    );
    expect(day).toHaveLength(1);
    expect(day[0]!.slotsOffered).toBe(2);
    expect(day[0]!.slotsFilled).toBe(1);
  });

  it("classifies every status the simulation actually produces", () => {
    const seen = new Set(sim.appointments.map((a) => a.status));
    expect(seen.size).toBeGreaterThan(2);
    for (const status of seen) expect(SLOT_STATUS[status]).toBeDefined();
  });
});

describe("W222 a session is a fact about a diary, never about a person", () => {
  it("has nowhere to put a patient, by type and by value", () => {
    const occurrence = occurrencesFrom([slot("c3", "2026-08-13", "booked")], AS_OF)[0]!;
    expect(Object.keys(occurrence).sort()).toEqual([
      "clinicianId",
      "dayIso",
      "slotsFilled",
      "slotsOffered",
      "weekday",
    ]);
    // @ts-expect-error — a slot record is exactly the thing tempted to carry its occupant.
    void occurrence.patientId;
  });

  it("carries no patient identity anywhere in a whole report", () => {
    const serialised = JSON.stringify(report());
    for (const patient of sim.patients.slice(0, 50)) {
      expect(serialised).not.toContain(String(patient.id));
    }
  });

  it("labels a session by clinician and weekday, and names every weekday", () => {
    expect(Object.keys(WEEKDAY_NAMES)).toHaveLength(7);
    const first = report().sessions[0]!;
    expect(first.label).toContain(first.key.clinicianId);
    expect(first.label).toContain(WEEKDAY_NAMES[first.key.weekday]);
    expect(sessionKeyOf(first.key)).toBe(`${first.key.clinicianId}::${first.key.weekday}`);
  });
});

describe("W222 the copy states an absence without stating a zero", () => {
  it("passes the advice linter", () => {
    for (const text of [...Object.values(NO_HISTORY_COPY), ...Object.values(SLOT_STATUS).map((s) => s.why)]) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });

  it("negates the specific wrong reading of each refusal", () => {
    expect(NO_HISTORY_COPY.never_run).toMatch(/not a session that runs empty/i);
    expect(NO_HISTORY_COPY.no_slots_offered).toMatch(/nought per cent/i);
  });
});
