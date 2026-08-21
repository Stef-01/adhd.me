// W226 verify gate: every declared sentence kind is produced, every produced kind is declared, and
// the JOINED text — not the fragments — passes the compliance linter.
//
// The check that matters most here is the id-to-text binding. Without it this file compares the
// labels the sweep's author chose against the labels the register's author chose, which are the
// same person, so both halves agree by construction and two branches can silently collapse into
// one. `mustContain` is what makes the register an instrument rather than a spreadsheet.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { isoDaysFrom } from "@/lib/dates";
import { lintEducationCopy } from "@/education/advice-lint";
import { NO_HISTORY_COPY } from "./model";
import { FORECAST_REFUSAL_COPY } from "./forecast";
import { SCORE_WITHHELD_COPY } from "./score";
import { RECOMMENDATION_WITHHELD_COPY } from "./recommendation";
import { DRIFT_REFUSAL_COPY, DRIFT_VERDICT_COPY } from "./drift";
import { COUPLING_OFF_COPY, COUPLING_REJECTION_COPY } from "./coupling";
import { CAPACITY_ATTRIBUTION_WITHHELD_COPY } from "./attribution";
import { CALENDAR_UNKNOWN_COPY } from "./calendar";
import { OPERATOR_COPY_SURFACES } from "@/compliance/cdss-boundary";
import { CAPACITY_SENTENCE_KINDS, capacityCopySweep, capacityCopyOverDiary } from "./copy";

const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
const AS_OF = isoDaysFrom(sim.config.todayIso, 6 * 7 + 1);
const PERIOD = { fromIso: sim.config.todayIso, toIso: AS_OF };

const swept = () => capacityCopySweep();

describe("W226 the register and the lane cannot disagree", () => {
  it("produces every declared kind and declares every produced kind", () => {
    const produced = new Set(swept().map((s) => s.id));
    const declared = new Set(CAPACITY_SENTENCE_KINDS.map((k) => k.id));
    expect([...declared].filter((d) => !produced.has(d)), "declared but never produced").toEqual([]);
    expect([...produced].filter((p) => !declared.has(p)), "produced but not declared").toEqual([]);
    expect(declared.size).toBe(30);
  });

  it("binds each id to text only that kind contains", () => {
    // The check the first draft did not have, and the mislabel it would have caught: a `never_full`
    // fixture that ran full on three of six weeks produced the SOMETIMES-full sentence under the
    // never-full id, and an id-only comparison passed.
    const byId = new Map(swept().map((s) => [s.id, s.text]));
    for (const kind of CAPACITY_SENTENCE_KINDS) {
      const text = byId.get(kind.id);
      expect(text, `${kind.id} was not produced`).toBeDefined();
      expect(text, `${kind.id} produced text belonging to another kind`).toContain(kind.mustContain);
    }
  });

  it("has each phrase belong to exactly one kind, so the bindings are not interchangeable", () => {
    // A carried phrase legitimately appears twice — the lane carries refusals rather than
    // paraphrasing them — so the expected set is the kind itself plus whoever DECLARES that it
    // carries it. An undeclared second match is a collision; a declared one is the design.
    const texts = swept();
    for (const kind of CAPACITY_SENTENCE_KINDS) {
      const carriers = CAPACITY_SENTENCE_KINDS.filter((k) => k.carries?.includes(kind.id)).map((k) => k.id);
      const matching = texts.filter((t) => t.text.includes(kind.mustContain)).map((t) => t.id).sort();
      expect(matching, `${kind.mustContain} matches an undeclared kind`).toEqual([kind.id, ...carriers].sort());
    }
    // And the carrying is real, not a declaration that excuses a collision.
    expect(CAPACITY_SENTENCE_KINDS.filter((k) => k.carries).length).toBeGreaterThan(0);
  });

  it("declares which kinds W200's census can already see, and gets that right", () => {
    // `composed: false` claims the text IS an exported constant. Checked against the constants
    // rather than trusted, because a wrong flag here would understate the hole this unit closes.
    const exported = [
      ...Object.values(NO_HISTORY_COPY),
      ...Object.values(FORECAST_REFUSAL_COPY),
      ...Object.values(SCORE_WITHHELD_COPY),
      ...Object.values(RECOMMENDATION_WITHHELD_COPY),
      ...Object.values(DRIFT_REFUSAL_COPY),
      ...Object.values(DRIFT_VERDICT_COPY),
      CALENDAR_UNKNOWN_COPY,
      COUPLING_OFF_COPY,
      ...Object.values(COUPLING_REJECTION_COPY),
      ...Object.values(CAPACITY_ATTRIBUTION_WITHHELD_COPY),
    ];
    const byId = new Map(swept().map((s) => [s.id, s.text]));
    for (const kind of CAPACITY_SENTENCE_KINDS) {
      const text = byId.get(kind.id)!;
      const isExactlyAnExport = exported.includes(text);
      expect(isExactlyAnExport, `${kind.id} declares composed:${kind.composed}`).toBe(!kind.composed);
    }
    // The size of the hole W226 exists to close, as a COUNT rather than a proportion. The first
    // version asserted the composed kinds were a MAJORITY, which was true at 11 of 15 and stopped
    // being true at 14 of 30 when W231 and W233 added modules whose copy is all exported
    // constants. The proportion was never the claim — the claim is that a double-digit number of
    // sentences a practice reads were reachable by no linter — and a proportion that drifts with
    // unrelated growth is a check that fails for a reason nobody wants to act on.
    const composed = CAPACITY_SENTENCE_KINDS.filter((k) => k.composed);
    expect(composed.length).toBeGreaterThanOrEqual(11);
  });
});

describe("W226 the register covers the LANE, not just the sweep somebody wrote", () => {
  it("names every capacity module that W200 says authors copy", () => {
    // W228 EXPOSED THIS HOLE, one unit after W226 shipped. The register was both-directions
    // against its own hand-written sweep, so a NEW module in this lane could ship prose and every
    // check stayed green — nothing tied the sweep to the lane. That is the same class of gap W226
    // was built to close, one level up. Reuses W200's register rather than inventing a detector:
    // if a capacity module declares operator copy there, a sentence kind here must name it.
    const authored = OPERATOR_COPY_SURFACES.filter(
      (surface) => surface.module.startsWith("src/capacity/") && surface.operatorCopy.length > 0,
    ).map((surface) => surface.module);
    const named = new Set(CAPACITY_SENTENCE_KINDS.map((k) => k.module));
    expect(authored.length).toBeGreaterThan(4);
    expect(authored.filter((m) => !named.has(m)), "authors copy but no sentence kind names it").toEqual([]);
    // And the other direction: a kind may not name a module that authors nothing.
    expect([...named].filter((m) => !authored.includes(m)), "named but authors no declared copy").toEqual([]);
  });
});

describe("W226 the joined sentence is linted, not the fragments", () => {
  it("finds no advice in anything this lane can say", () => {
    for (const { id, text } of swept()) {
      expect(lintEducationCopy(text).map((f) => f.rule), `${id}: ${text}`).toEqual([]);
    }
  });

  it("lints text that only exists once the parts are joined", () => {
    // The reason fragment-linting is not enough. Two of these sentences are one module's copy
    // followed by another's, and neither half is what a reader sees.
    const byId = new Map(swept().map((s) => [s.id, s.text]));
    const carried = byId.get("recommendation.withheld.no_forecast")!;
    expect(carried).toContain(RECOMMENDATION_WITHHELD_COPY.no_forecast);
    expect(carried).toContain(FORECAST_REFUSAL_COPY.no_recorded_history);
    expect(carried).toContain(NO_HISTORY_COPY.never_run);
    // Three modules' prose in one sentence, and the whole of it is what gets linted.
    expect(carried.length).toBeGreaterThan(
      RECOMMENDATION_WITHHELD_COPY.no_forecast.length + FORECAST_REFUSAL_COPY.no_recorded_history.length,
    );
    expect(lintEducationCopy(carried)).toEqual([]);
  });

  it("still fires on advice, so a clean sweep means something", () => {
    // A sweep that could not fail would report the same green over any copy at all.
    const advice = "You should open more slots on Thursday. Next steps: consider adding a session.";
    expect(lintEducationCopy(advice).map((f) => f.rule).sort()).toEqual([
      "no-action-framing",
      "no-clinician-instruction",
      "no-soft-recommendation",
    ]);
  });

  it("says nothing that reads as a clinical claim about anybody", () => {
    for (const { id, text } of swept()) {
      expect(text, id).not.toMatch(/\bpatient(s)?\b|\bcondition\b|\bsymptom\b|\burgent\b|\bunwell\b/i);
    }
  });
});

describe("W226 the fixtures are checked against a real diary", () => {
  it("produces only declared kinds over the simulation too", () => {
    // The fixtures could drift into describing sentences the product no longer emits. The sim
    // reaches most of the happy path and none of the refusals, so it is a cross-check rather than
    // a replacement — stated here because a sweep that quietly relied on it would be weaker than
    // it looks.
    const overDiary = capacityCopyOverDiary(sim.appointments, AS_OF, PERIOD);
    expect(overDiary.length).toBeGreaterThan(100);
    const declared = new Set(CAPACITY_SENTENCE_KINDS.map((k) => k.id));
    for (const { id } of overDiary) expect(declared.has(id), `${id} is undeclared`).toBe(true);
    const reached = new Set(overDiary.map((s) => s.id));
    expect(reached.has("recommendation.sentence.plural")).toBe(true);
    expect(reached.has("recommendation.demand.never_full")).toBe(true);
    expect(reached.has("recommendation.demand.sometimes_full")).toBe(true);
    // The refusals the sim cannot reach, named rather than left as an apparent gap.
    expect(reached.has("forecast.withheld.no_recorded_history")).toBe(false);
    expect(reached.has("score.skipped.offered_nothing")).toBe(false);
  });

  it("binds a skipped week's id from the text, not from an assumption", () => {
    // Finding 5 of W234's review: `capacityCopyOverDiary` hard-coded `no_history_yet` for every
    // skip, so a zero-slot week bound the wrong text to a declared id — the exact mislabel
    // `mustContain` was added to catch, happening in the other function while that check watched
    // this one. Checked here by feeding a diary that contains a cancelled week.
    const cancelled = Array.from({ length: 7 }, (_, i) => ({
      id: `w234-copy-${i}` as never,
      practiceId: "p1" as never,
      clinicianId: "c1" as never,
      // `isoDaysFrom`, not day arithmetic — the first version wrote `2026-06-32` for the fifth
      // week and those appointments were silently dropped by the ISO check, so the cancelled week
      // never existed and the test failed on its own fixture.
      startsAt: `${isoDaysFrom("2026-06-04", i * 7)}T09:00:00+10:00`,
      status: (i === 6 ? "cancelled" : "booked") as "cancelled" | "booked",
      patientId: null,
      generatedByInvitation: false,
    }));
    const swept = capacityCopyOverDiary(cancelled, "2026-08-01", { fromIso: "2026-06-01", toIso: "2026-08-01" });
    const byId = new Map(CAPACITY_SENTENCE_KINDS.map((k) => [k.id, k.mustContain]));
    for (const { id, text } of swept) {
      const phrase = byId.get(id);
      if (phrase === undefined) continue;
      expect(text, `${id} bound to text belonging to another kind`).toContain(phrase);
    }
    expect(swept.some((s) => s.id === "score.skipped.offered_nothing"), "the cancelled week was not reached").toBe(true);
  });

  it("finds no advice in anything the real diary produces either", () => {
    for (const { id, text } of capacityCopyOverDiary(sim.appointments, AS_OF, PERIOD)) {
      expect(lintEducationCopy(text).map((f) => f.rule), `${id}: ${text}`).toEqual([]);
    }
  });
});
