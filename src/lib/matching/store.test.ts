// M1 verify gate: the store seeds GPs from the roster once, keeps edits, moves a match through
// its statuses exactly once, and resets to nothing.

import { beforeEach, describe, expect, it } from "vitest";
import {
  allFeedback,
  checklistFor,
  eraseMatchingPatient,
  exportMatchingPatient,
  feedbackForMatch,
  getMatching,
  gpById,
  listGPs,
  matchById,
  matchesForGP,
  matchesForPatient,
  matchingCounts,
  openPatients,
  patientById,
  resetMatching,
  saveChecklist,
  saveFeedback,
  saveGP,
  saveMatches,
  savePatient,
  setChecklistItem,
  setMatchStatus,
} from "./store";
import { gp, patient } from "./test-fixtures";
import type { Match } from "./types";

const TODAY = new Date("2026-09-09T00:00:00.000Z");

const match = (id: string, patientId: string, gpId: string, position = 1): Match => ({
  id,
  patientId,
  gpId,
  patientRankScore: 0.5,
  gpRankScore: 0.5,
  similarity: 0.5,
  position,
  matchStatus: "proposed",
  rationale: { headline: "", points: [], sharedConcepts: [] },
  patientBreakdown: [],
  createdAt: "2026-09-09T00:00:00.000Z",
  decidedAt: null,
  declineReason: null,
});

beforeEach(() => resetMatching());

describe("M1 seeding", () => {
  it("seeds the roster's GPs once, allied entries left out, and keeps an edit across reads", () => {
    const state = getMatching(TODAY);
    const seeded = listGPs(state);
    expect(seeded.length).toBeGreaterThan(10);
    expect(seeded.every((g) => g.conditions.includes("adhd"))).toBe(true);
    const first = seeded[0]!;
    saveGP({ ...first, credentials: { ...first.credentials, caseloadCapacityCurrent: 1 } }, state);
    expect(gpById(first.id, getMatching(TODAY))!.credentials.caseloadCapacityCurrent).toBe(1);
    expect(getMatching(TODAY).seededAt).toBe(state.seededAt);
  });

  it("resets to nothing and reseeds on the next read", () => {
    savePatient(patient(), getMatching(TODAY));
    resetMatching();
    expect(getMatching(TODAY).patients.size).toBe(0);
    expect(listGPs(getMatching(TODAY)).length).toBeGreaterThan(0);
  });
});

describe("M1 matches move through their statuses exactly once", () => {
  it("accepts a proposed match, books the patient, and takes one place off the GP", () => {
    const state = getMatching(TODAY);
    saveGP(gp({ id: "g" }), state);
    savePatient(patient({ id: "p" }), state);
    saveMatches([match("m", "p", "g")], state);
    const accepted = setMatchStatus("m", "accepted", "2026-09-10", null, state);
    expect(accepted.ok).toBe(true);
    expect(matchById("m", state)!.matchStatus).toBe("accepted");
    expect(patientById("p", state)!.status).toBe("booked");
    expect(gpById("g", state)!.credentials.caseloadCapacityCurrent).toBe(3);
    expect(openPatients(state)).toEqual([]);
  });

  it("refuses a second answer, and refuses to complete what was never accepted", () => {
    const state = getMatching(TODAY);
    saveMatches([match("m", "p", "g")], state);
    expect(setMatchStatus("m", "declined", "2026-09-10", "no_capacity", state).ok).toBe(true);
    expect(setMatchStatus("m", "accepted", "2026-09-10", null, state)).toEqual({ ok: false, reason: "not_open" });
    saveMatches([match("m2", "p", "g")], state);
    expect(setMatchStatus("m2", "completed", "2026-09-10", null, state)).toEqual({ ok: false, reason: "not_open" });
    expect(setMatchStatus("nope", "accepted", "2026-09-10", null, state)).toEqual({ ok: false, reason: "not_found" });
  });

  it("keeps the decline reason, and lists matches per patient by position and per GP by time", () => {
    const state = getMatching(TODAY);
    saveMatches([match("m2", "p", "g2", 2), match("m1", "p", "g1", 1), match("m3", "q", "g1", 1)], state);
    setMatchStatus("m2", "declined", "2026-09-10", "outside_scope", state);
    expect(matchById("m2", state)!.declineReason).toBe("outside_scope");
    expect(matchesForPatient("p", state).map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(matchesForGP("g1", state).map((m) => m.id)).toEqual(["m1", "m3"]);
  });
});

describe("M1 erasure and export reach everything held about one person", () => {
  it("exports the row, their matches, the feedback on those matches and the checklist, and erases the same set", () => {
    const state = getMatching(TODAY);
    savePatient(patient({ id: "p" }), state);
    savePatient(patient({ id: "q" }), state);
    saveMatches([match("m1", "p", "g1"), match("m2", "p", "g2", 2), match("m3", "q", "g1")], state);
    saveFeedback({ id: "f1", matchId: "m1", from: "patient", patientRating: { fit: 4, communication: 4, clinicalAppropriateness: 4 }, gpRating: null, freeTextFeedback: "", createdAt: "2026-09-10" }, state);
    saveFeedback({ id: "f3", matchId: "m3", from: "patient", patientRating: { fit: 2, communication: 2, clinicalAppropriateness: 2 }, gpRating: null, freeTextFeedback: "", createdAt: "2026-09-10" }, state);
    saveChecklist({ id: "c", patientId: "p", generatedAt: "2026-09-10", items: [] }, state);
    const held = exportMatchingPatient("p", state)!;
    expect(held.matches.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(held.feedback.map((f) => f.id)).toEqual(["f1"]);
    expect(held.checklist?.id).toBe("c");
    expect(eraseMatchingPatient("p", state)).toEqual({ erased: true, matches: 2, feedback: 1 });
    expect(patientById("p", state)).toBeNull();
    expect(matchesForPatient("p", state)).toEqual([]);
    expect(feedbackForMatch("m1", state)).toEqual([]);
    expect(checklistFor("p", state)).toBeNull();
    // The other person is untouched.
    expect(patientById("q", state)).not.toBeNull();
    expect(matchesForPatient("q", state).length).toBe(1);
    expect(feedbackForMatch("m3", state).length).toBe(1);
    expect(exportMatchingPatient("nobody", state)).toBeNull();
    expect(eraseMatchingPatient("nobody", state)).toEqual({ erased: false, matches: 0, feedback: 0 });
  });
});

describe("M1 feedback and checklists", () => {
  it("stores feedback per match and checklists per patient, with item toggles", () => {
    const state = getMatching(TODAY);
    saveFeedback({ id: "f", matchId: "m", from: "patient", patientRating: { fit: 5, communication: 4, clinicalAppropriateness: 4 }, gpRating: null, freeTextFeedback: "", createdAt: "2026-09-10" }, state);
    expect(feedbackForMatch("m", state).length).toBe(1);
    expect(allFeedback(state).length).toBe(1);
    saveChecklist({ id: "c", patientId: "p", generatedAt: "2026-09-10", items: [{ id: "i", label: "x", why: "y", required: true, done: false, triggeredBy: [] }] }, state);
    expect(setChecklistItem("p", "i", true, state)!.items[0]!.done).toBe(true);
    expect(checklistFor("p", state)!.items[0]!.done).toBe(true);
    expect(setChecklistItem("nobody", "i", true, state)).toBeNull();
    expect(matchingCounts(state)).toMatchObject({ patients: 0, matches: 0, feedback: 1, checklists: 1 });
  });
});
