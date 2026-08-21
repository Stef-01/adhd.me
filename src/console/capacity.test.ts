// W229 verify gate (unit half): "empty states distinguish no data from no capacity."
//
// Those two are opposite facts behind the same blank screen, so each is CONSTRUCTED here from a
// diary that actually produces it. The one that matters most is `no_capacity`: a fully-booked
// practice reported as "no capacity information" would tell a practice it has room nobody
// recorded, which is the wrong half to get wrong.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { CALENDAR_UNKNOWN_COPY, loadCalendar } from "@/capacity/calendar";
import type { Appointment, AppointmentId, AppointmentStatus, ClinicianId, PracticeId } from "@/domain/types";
import { CAPACITY_EMPTY_COPY, calendarGapFor, capacityView } from "./capacity";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };

let seq = 0;
const slot = (clinicianId: string, dayIso: string, status: AppointmentStatus): Appointment => ({
  id: `w229-${seq++}` as AppointmentId,
  practiceId: "p1" as PracticeId,
  clinicianId: clinicianId as ClinicianId,
  startsAt: `${dayIso}T09:00:00+10:00`,
  status,
  patientId: null,
  generatedByInvitation: false,
});

/** A diary of `weeks` Thursdays, each offering `offered` slots of which `filled` are taken. */
const diary = (weeks: number, offered: number, filled: number, clinicianId = "c1"): Appointment[] =>
  Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: offered }, (_, i) =>
      slot(clinicianId, isoDaysFrom("2026-06-04", w * 7), i < filled ? "booked" : "open"),
    ),
  ).flat();

describe("W229 no data and no capacity are different facts and get different sentences", () => {
  it("says NO DATA when the diary holds nothing", () => {
    const view = capacityView([], AS_OF, PERIOD);
    expect(view.empty).toBe("no_data");
    expect(view.emptyCopy).toBe(CAPACITY_EMPTY_COPY.no_data);
    expect(view.sessions).toEqual([]);
    expect(view.score).toBeNull();
    expect(view.drift).toBeNull();
    // The sentence that stops it being read as the other one.
    expect(view.emptyCopy).toMatch(/not a practice with no room/);
  });

  it("says NO CAPACITY when every session filled every slot it offered", () => {
    // The half it is worse to get wrong: reported as "no information", a fully-booked practice
    // would read as having room nobody recorded.
    const view = capacityView(diary(6, 6, 6), AS_OF, PERIOD);
    expect(view.sessions.length).toBeGreaterThan(0);
    expect(view.empty).toBe("no_capacity");
    expect(view.emptyCopy).toBe(CAPACITY_EMPTY_COPY.no_capacity);
    expect(view.emptyCopy).toMatch(/opposite of having nothing to show/);
    for (const row of view.sessions) expect(row.utilisation).toBe(1);
  });

  it("says the FORECASTER IS UNSCORED when there is a diary but no track record", () => {
    // One session, six weeks: W223 forecasts and W224 has two predictions against a floor of five.
    const view = capacityView(diary(6, 6, 3), AS_OF, PERIOD);
    expect(view.sessions).toHaveLength(1);
    expect(view.empty).toBe("forecaster_unscored");
    expect(view.score?.scored).toBe(false);
    // Counts are still shown — this is the state where numbers remain worth reading.
    expect(view.sessions[0]!.slotsOffered).toBe(36);
    expect(view.sessions[0]!.recommendation.offered).toBe(false);
  });

  it("is not empty at all over the simulated practice", () => {
    // Non-vacuity for all three: if the sim produced an empty page, the branches above would be
    // describing the only states this product can reach.
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    expect(view.empty).toBeNull();
    expect(view.sessions).toHaveLength(70);
    expect(view.score?.scored).toBe(true);
    expect(view.drift?.compared).toBe(true);
    expect(view.sessions.every((row) => row.recommendation.offered)).toBe(true);
  });

  it("prefers the more specific fact when two could apply", () => {
    // A fully-booked practice with too few scored weeks is BOTH full and unscored. It is reported
    // as full, because that is the fact about the diary; "not enough track record" would leave a
    // practice looking for spare room the record says is not there.
    const view = capacityView(diary(6, 6, 6), AS_OF, PERIOD);
    expect(view.score?.scored).toBe(false);
    expect(view.empty).toBe("no_capacity");
  });
});

describe("W229 the view decides nothing the lane has already decided", () => {
  it("shows no rate where W222 refused one, and carries W222's sentence instead", () => {
    // A week whose whole list was cancelled: offered nothing, so there is no rate. The row must
    // hold null rather than nought — W215's live defect was a confident zero in exactly this shape.
    const cancelled = [
      slot("c9", "2026-06-04", "cancelled"),
      slot("c9", "2026-06-11", "cancelled"),
    ];
    const view = capacityView(cancelled, AS_OF, PERIOD);
    expect(view.sessions).toHaveLength(1);
    expect(view.sessions[0]!.utilisation).toBeNull();
    // Finding 3. The row must carry null for EVERY figure it has no history for — the first
    // version wrote a zero back in and the table printed "Weeks recorded 0" for a session that ran
    // twice, undoing the guarantee W222's no-numeric-field arm exists to give.
    expect(view.sessions[0]!.occurrences).toBeNull();
    expect(view.sessions[0]!.slotsOffered).toBeNull();
    expect(view.sessions[0]!.slotsFilled).toBeNull();
    expect(view.sessions[0]!.noHistoryCopy).toMatch(/nought per cent/);
    // The rendered label, checked HERE because this is where the branch is reachable. The e2e that
    // was supposed to guard it passed when seeded with `pct(x ?? 0)`, since no session in the sim
    // has a null rate and the branch never rendered at all.
    expect(view.sessions[0]!.utilisationLabel).toBe("—");
  });

  it("carries W228's verdict without adding a judgement of its own", () => {
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    expect(view.drift?.compared && view.drift.verdict).toBe("tracking");
    // The view holds the report, not a grade derived from it.
    expect(Object.keys(view).sort()).toEqual([
      "calendarGap", "drift", "empty", "emptyCopy", "report", "score", "sessions",
    ]);
  });

  it("states the calendar gap while W227 ships empty, and stops the day it does not", () => {
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    expect(view.calendarGap).toBe(CALENDAR_UNKNOWN_COPY);
    expect(capacityView([], AS_OF, PERIOD).calendarGap).toBe(CALENDAR_UNKNOWN_COPY);
  });

  it("clears the gap once a calendar is loaded, which the first version could never do", () => {
    // Finding 1. The first version also asked `calendarKnowsNothing(calendar, "")` — the
    // empty-string jurisdiction, which no real entry can carry — so the notice would have kept
    // rendering forever after W227's calendar was populated, and the test only pinned the empty
    // case. Checked here through the same loader a real calendar would come through.
    const loaded = loadCalendar([
      {
        id: "nsw-2026-anzac",
        jurisdiction: "NSW",
        name: "Anzac Day",
        fallsOn: "2026-04-25",
        observedOn: "2026-04-27",
        provenance: {
          citation: "Fixture only — this exercises the loader, and is not a real citation.",
          url: "https://example.test/fixture",
          publishedOn: "2026-01-01",
          retrievedOn: "2026-01-02",
        },
      },
    ]);
    expect(loaded.days).toHaveLength(1);
    // The view's OWN rule, not a copy of it in this file — a re-implemented rule passes whatever
    // the view does, which is the shape of four vacuous guards already this session.
    expect(calendarGapFor(loaded)).toBeNull();
    expect(calendarGapFor(loadCalendar([]))).toBe(CALENDAR_UNKNOWN_COPY);
  });

  it("labels every rate it does have as a percentage, and only those", () => {
    const view = capacityView(sim.appointments, AS_OF, PERIOD);
    expect(view.sessions).toHaveLength(70);
    for (const row of view.sessions) {
      expect(row.utilisationLabel).toMatch(/^\d+%$/);
      expect(row.utilisation).not.toBeNull();
    }
    // Both branches of the label are therefore exercised: 70 percentages here, an em dash above.
  });

  it("passes the advice linter on every sentence it authors", () => {
    for (const text of Object.values(CAPACITY_EMPTY_COPY)) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 40)).toEqual([]);
    }
  });

  it("names the wrong reading each empty state must not be given", () => {
    expect(CAPACITY_EMPTY_COPY.no_data).toMatch(/not a practice with no room/);
    expect(CAPACITY_EMPTY_COPY.no_capacity).toMatch(/rather than a gap in it/);
    expect(CAPACITY_EMPTY_COPY.forecaster_unscored).toMatch(/Counts are shown/);
  });
});
