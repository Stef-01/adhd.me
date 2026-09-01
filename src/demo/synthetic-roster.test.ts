// O217: the synthetic-roster census — the both-directions law behind the finder's tickbox.
//
// The persona purge removed invented profiles because invented detail was PRESENTED AS REAL.
// Founder decision `synthetic-roster-tickbox` brings example profiles back for testing, and this
// file is the machinery that keeps them from becoming what the purge removed: every defence the
// module's header promises is asserted here, so a persona edited to look more real fails the
// suite naming the line rather than shipping.

import { describe, expect, it } from "vitest";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { lintLandingCopy } from "@/compliance/landing";
import { resolvePlace } from "@/geo/suburbs";
import { clinicians } from "./roster";
import { ROSTER_SIZE } from "./roster-size";
import {
  demoRoster,
  SYNTHETIC_ABOUT_NOTICE,
  SYNTHETIC_BOOKING_NOTE,
  SYNTHETIC_CLINICIANS,
} from "./synthetic-roster";

/** Every string a persona can put in front of a reader, one flat list per entry. */
function renderedStrings(entry: (typeof SYNTHETIC_CLINICIANS)[number]): string[] {
  return [
    entry.name,
    entry.title,
    entry.practice,
    entry.reach,
    entry.focus,
    entry.matchLine,
    entry.summary,
    entry.about,
    entry.appointmentLength,
    entry.booking.via === "synthetic-none" ? entry.booking.note : "",
    ...entry.fitSignals,
    ...entry.practicalSignals,
    ...entry.experience,
  ];
}

describe("O217 — synthetic example roster census", () => {
  it("is the founder's eight, and the live exports stay real-only", () => {
    // G-SYN-3: the plan's recommended eight, as decided. A different count is a new decision.
    expect(SYNTHETIC_CLINICIANS).toHaveLength(8);
    // The purge's core invariant survives the reversal: `clinicians` (and therefore
    // ROSTER_SIZE, the coverage map and every public count derived from it) holds real
    // people only. The tickbox roster is a separate export.
    expect(clinicians.every((c) => c.realPerson === true)).toBe(true);
    expect(clinicians.some((c) => c.synthetic)).toBe(false);
    expect(ROSTER_SIZE).toBe(clinicians.length);
    expect(demoRoster).toHaveLength(clinicians.length + SYNTHETIC_CLINICIANS.length);
    // The demo roster removes and reorders nothing real.
    expect(demoRoster.slice(0, clinicians.length)).toEqual(clinicians);
  });

  it("every persona is marked, faceless, and unbookable — exactly one of realPerson/synthetic", () => {
    for (const entry of SYNTHETIC_CLINICIANS) {
      expect(entry.synthetic, entry.id).toBe(true);
      expect(entry.realPerson, entry.id).toBeUndefined();
      // No face: a generated portrait is a fabricated person presented as genuine.
      expect(entry.image, entry.id).toBeNull();
      // Nobody to book, and no url that could pretend otherwise.
      expect(entry.booking.via, entry.id).toBe("synthetic-none");
      expect("url" in entry.booking, entry.id).toBe(false);
      expect(entry.booking.via === "synthetic-none" && entry.booking.note, entry.id).toBe(
        SYNTHETIC_BOOKING_NOTE,
      );
      // An invented conflict of interest is still an invented claim about the product's
      // relationships — and the founder-behind ranking laws stay testable on real data only.
      expect(entry.disclosedInterest, entry.id).toBeUndefined();
      expect(entry.disclosedInterestLabel, entry.id).toBeUndefined();
      // The about text carries the fictional notice VERBATIM — labels live in the UI, but the
      // copy itself must say what it is, because copy travels (compare tables, screenshots).
      expect(entry.about, entry.id).toContain(SYNTHETIC_ABOUT_NOTICE);
      // Practice names self-mark, so no invented practice can collide with a real business.
      expect(entry.practice, entry.id).toMatch(/Example Practice$/);
      // Ids are namespaced, so /go, analytics and portrait layoutIds can never collide with a
      // real clinician's, and a stray synthetic id in a log reads as what it is.
      expect(entry.id, entry.id).toMatch(/^example-/);
    }
  });

  it("no persona shares a name, id or practice with a real roster entry", () => {
    const realNames = new Set(clinicians.map((c) => c.name.toLowerCase()));
    const realIds = new Set(clinicians.map((c) => c.id));
    const seenIds = new Set<string>();
    for (const entry of SYNTHETIC_CLINICIANS) {
      expect(realNames.has(entry.name.toLowerCase()), entry.id).toBe(false);
      expect(realIds.has(entry.id), entry.id).toBe(false);
      expect(seenIds.has(entry.id), entry.id).toBe(false);
      seenIds.add(entry.id);
    }
  });

  it("suburbs are real gazetteer rows, so computed distance works", () => {
    for (const entry of SYNTHETIC_CLINICIANS) {
      expect(resolvePlace(entry.suburb), `${entry.id}: ${entry.suburb}`).not.toBeNull();
      for (const extra of entry.alsoConsultsAt ?? []) {
        expect(resolvePlace(extra), `${entry.id}: ${extra}`).not.toBeNull();
      }
    }
  });

  it("the demo roster covers every care area in the closed vocabulary", () => {
    // The set exists to exercise the matcher; a care area nobody on the demo roster declares
    // is a scenario the tickbox cannot test — and `unservedAsks` would honestly say so, which
    // is the finder admitting the demo set has a hole.
    const held = new Set(
      demoRoster.flatMap((c) => [...c.careAreas, ...(c.careAreasSometimes ?? [])]),
    );
    for (const area of CARE_AREA_LABELS) {
      expect(held.has(area.id), `no demo-roster entry declares ${area.id}`).toBe(true);
    }
  });

  it("the set exercises the ranking's distinguishing states by construction", () => {
    // Two closed books: the closed-never-outranks-open law is visible to a tester.
    expect(SYNTHETIC_CLINICIANS.filter((c) => !c.acceptingNewPatients)).toHaveLength(2);
    // Telehealth-first exists: the distance law's exception is exercised.
    expect(SYNTHETIC_CLINICIANS.some((c) => c.telehealthFirstAppointment)).toBe(true);
    // A stale-open declaration exists (past the 90-day window against any plausible today).
    expect(
      SYNTHETIC_CLINICIANS.some(
        (c) => c.acceptingNewPatients && c.capacityDeclaredAt !== undefined && c.capacityDeclaredAt < "2026-06-01",
      ),
    ).toBe(true);
    // Languages beyond the real roster's, so a language ask can separate personas from people.
    const languages = new Set(SYNTHETIC_CLINICIANS.flatMap((c) => c.languages));
    for (const language of ["Mandarin", "Spanish", "Vietnamese"]) {
      expect(languages.has(language), language).toBe(true);
    }
    // All three genders the roster can express.
    const genders = new Set(SYNTHETIC_CLINICIANS.map((c) => c.gender));
    expect(genders).toEqual(new Set(["woman", "man", "non-binary"]));
  });

  it("every rendered string passes the public web-copy linter — invented is not exempt", () => {
    // W23 (`lintLandingCopy`) is the instrument, deliberately: it is what every public page's
    // copy — real profiles included — is held to. W6's message rules stay out for the same
    // reason `sweepSurface`'s own header gives: they lint a message SENT to a patient, and
    // running them over page copy asks the wrong question of every line.
    for (const entry of SYNTHETIC_CLINICIANS) {
      for (const text of renderedStrings(entry)) {
        const findings = lintLandingCopy(text);
        expect(findings, `${entry.id}: "${text}" -> ${findings.map((f) => f.rule).join(", ")}`).toEqual([]);
      }
    }
  });
});
