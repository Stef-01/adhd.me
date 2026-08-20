// W236 (O79) verify gate: the weighted pair-scoring model — filters refuse by name, every
// sub-score is normalised and sayable, the total equals the printed breakdown, and the top
// three per patient is deterministic with its ties said out loud.
import { describe, expect, it } from "vitest";
import { CRITERION_WEIGHTS, DEFAULT_ALLOCATION_CONFIG, MATCHES_PER_PATIENT, PROXIMITY_CAP_KM, hardFilterReasons, matchPatientsToPrescribers, requestFromWords, scorePair, type DoctorRecord, type PatientRequest } from "./allocation";
import { readNeeds } from "./needs";

const doctor = (overrides: Partial<DoctorRecord> & { doctorRef: string }): DoctorRecord => ({
  specialty: DEFAULT_ALLOCATION_CONFIG.requiredSpecialty,
  location: "Beecroft",
  capacity: { booked: 2, limit: 10 },
  insuranceAccepted: ["bulk-billing", "medicare-gap"],
  communicationStyle: ["unhurried", "sense_making"],
  careAreas: ["adhd-assessment", "titration"],
  ...overrides,
});

const patient = (overrides: Partial<PatientRequest> & { patientRef: string }): PatientRequest => ({
  location: "Epping",
  insuranceType: "bulk-billing",
  urgency: "this-month",
  communicationPreference: ["unhurried"],
  ...overrides,
});

// A small synthetic roster: near/far, open/full, gap-only, wrong specialty.
const DOCTORS: DoctorRecord[] = [
  doctor({ doctorRef: "dr-near-open", location: "Beecroft", waitDays: 10 }),
  doctor({ doctorRef: "dr-far-open", location: "Southport", waitDays: 5 }),
  doctor({ doctorRef: "dr-full", capacity: { booked: 10, limit: 10 } }),
  doctor({
    doctorRef: "dr-gap-only",
    insuranceAccepted: ["private"],
    insuranceAcceptedWithGap: ["bulk-billing"],
  }),
  doctor({ doctorRef: "dr-wrong-specialty", specialty: "dermatology" }),
  doctor({ doctorRef: "dr-slow", waitDays: 60 }),
];

describe("W236 the declared weights", () => {
  it("are exactly the directed 30/25/20/15/10 and sum to 1", () => {
    expect(CRITERION_WEIGHTS).toEqual({
      clinicalFit: 0.3,
      availability: 0.25,
      proximity: 0.2,
      costMatch: 0.15,
      communicationFit: 0.1,
    });
    expect(Object.values(CRITERION_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe("W236 hard filters refuse by name, never silently", () => {
  const p = patient({ patientRef: "p1" });

  it("names every reason that applies to a pair", () => {
    expect(hardFilterReasons(p, doctor({ doctorRef: "d", specialty: "dermatology" }))).toEqual(["specialty_mismatch"]);
    expect(hardFilterReasons(p, doctor({ doctorRef: "d", capacity: { booked: 10, limit: 10 } }))).toEqual(["at_capacity"]);
    expect(hardFilterReasons(p, doctor({ doctorRef: "d", insuranceAccepted: ["private"] }))).toEqual(["insurance_not_accepted"]);
    // Reasons stack: a full dermatologist who refuses the arrangement is all three.
    expect(
      hardFilterReasons(
        p,
        doctor({
          doctorRef: "d",
          specialty: "dermatology",
          capacity: { booked: 1, limit: 1 },
          insuranceAccepted: ["private"],
        }),
      ),
    ).toEqual(["specialty_mismatch", "at_capacity", "insurance_not_accepted"]);
  });

  it("a gap-fee acceptance passes the filter — the cost criterion prices it instead", () => {
    expect(hardFilterReasons(p, DOCTORS.find((d) => d.doctorRef === "dr-gap-only")!)).toEqual([]);
  });

  it("excluded pairs ride the result with their reasons", () => {
    const [result] = matchPatientsToPrescribers([p], DOCTORS);
    const excludedRefs = result!.excluded.map((e) => e.doctorRef).sort();
    expect(excludedRefs).toEqual(["dr-full", "dr-wrong-specialty"]);
    for (const e of result!.excluded) expect(e.reasons.length).toBeGreaterThan(0);
  });
});

describe("W236 every sub-score is normalised and the total equals the printed breakdown", () => {
  const pairs = DOCTORS.filter((d) => hardFilterReasons(patient({ patientRef: "p" }), d).length === 0);

  it("raw scores stay in [0,1] and every criterion carries a sentence", () => {
    for (const d of pairs) {
      const scored = scorePair(patient({ patientRef: "p" }), d);
      expect(scored.breakdown).toHaveLength(5);
      for (const item of scored.breakdown) {
        expect(item.raw, `${d.doctorRef} ${item.criterion}`).toBeGreaterThanOrEqual(0);
        expect(item.raw, `${d.doctorRef} ${item.criterion}`).toBeLessThanOrEqual(1);
        expect(item.sentence.length, `${d.doctorRef} ${item.criterion} says nothing`).toBeGreaterThan(10);
      }
    }
  });

  it("holds the W213 unity: total === sum of weighted breakdown, to the thousandth", () => {
    for (const d of pairs) {
      const scored = scorePair(patient({ patientRef: "p" }), d);
      const sum = scored.breakdown.reduce((a, item) => a + item.weighted, 0);
      expect(scored.total).toBe(Math.round(sum * 1000) / 1000);
    }
  });
});

describe("W236 each criterion prices the declared fact it names", () => {
  const p = patient({ patientRef: "p" });

  it("proximity: nearer scores higher; both ends unresolvable scores the neutral midpoint", () => {
    const near = scorePair(p, doctor({ doctorRef: "a" })).breakdown.find((b) => b.criterion === "proximity")!;
    const far = scorePair(p, doctor({ doctorRef: "b", location: "Southport" })).breakdown.find(
      (b) => b.criterion === "proximity",
    )!;
    expect(near.raw).toBeGreaterThan(far.raw);
    // Beyond the cap, far is floor-far: Southport is ~700 km from Epping.
    expect(far.raw).toBe(0);
    expect(far.sentence).toContain(`${PROXIMITY_CAP_KM} km`);

    const unknown = scorePair(p, doctor({ doctorRef: "c", location: "Nowhereville" })).breakdown.find(
      (b) => b.criterion === "proximity",
    )!;
    expect(unknown.raw).toBe(0.5);
    expect(unknown.sentence).toContain("gazetteer");
  });

  it("availability: the binding fact is the one reported", () => {
    // Wait 60 days against a stated 30-day horizon binds harder than 8 open places.
    const slow = scorePair(p, DOCTORS.find((d) => d.doctorRef === "dr-slow")!).breakdown.find(
      (b) => b.criterion === "availability",
    )!;
    expect(slow.raw).toBe(0.5); // 30/60
    expect(slow.sentence).toContain("60 days");
    // "whenever" binds nothing from the patient's side: open places decide.
    const whenever = scorePair(patient({ patientRef: "p", urgency: "whenever" }), DOCTORS.find((d) => d.doctorRef === "dr-slow")!)
      .breakdown.find((b) => b.criterion === "availability")!;
    expect(whenever.raw).toBe(0.8); // 8 of 10 open
    expect(whenever.sentence).toContain("8 of 10");
    // An undeclared wait is said, never invented.
    const undeclared = scorePair(p, doctor({ doctorRef: "d" })).breakdown.find((b) => b.criterion === "availability")!;
    expect(undeclared.sentence).toContain("not declared");
  });

  it("cost: asked arrangement outright is 1, with a declared gap is 0.5", () => {
    const outright = scorePair(p, doctor({ doctorRef: "a" })).breakdown.find((b) => b.criterion === "costMatch")!;
    expect(outright.raw).toBe(1);
    const gap = scorePair(p, DOCTORS.find((d) => d.doctorRef === "dr-gap-only")!).breakdown.find(
      (b) => b.criterion === "costMatch",
    )!;
    expect(gap.raw).toBe(0.5);
    expect(gap.sentence).toContain("gap fee");
  });

  it("communication: the share of stated preferences; unstated cannot separate and says so", () => {
    const half = scorePair(
      patient({ patientRef: "p", communicationPreference: ["unhurried", "steadying"] }),
      doctor({ doctorRef: "a" }),
    ).breakdown.find((b) => b.criterion === "communicationFit")!;
    expect(half.raw).toBe(0.5);
    expect(half.sentence).toContain("1 of the 2");
    const unstated = scorePair(patient({ patientRef: "p", communicationPreference: [] }), doctor({ doctorRef: "a" }))
      .breakdown.find((b) => b.criterion === "communicationFit")!;
    expect(unstated.raw).toBe(1);
    expect(unstated.sentence).toContain("alike");
  });

  it("clinical fit: the share of stated care asks; no stated asks is a said 1, not a guess", () => {
    const depth = scorePair(
      patient({ patientRef: "p", statedNeeds: ["adhd-assessment", "trauma-informed"] }),
      doctor({ doctorRef: "a" }),
    ).breakdown.find((b) => b.criterion === "clinicalFit")!;
    expect(depth.raw).toBe(0.5);
    expect(depth.sentence).toContain("1 of the 2");
    const none = scorePair(p, doctor({ doctorRef: "a" })).breakdown.find((b) => b.criterion === "clinicalFit")!;
    expect(none.raw).toBe(1);
    expect(none.sentence).toContain("no further care areas were stated");
  });
});

describe("W236 the ranked output", () => {
  const patients = [
    patient({ patientRef: "p-epping" }),
    patient({ patientRef: "p-gold-coast", location: "Southport", urgency: "this-week" }),
  ];

  it("returns at most three matches per patient, best first", () => {
    const results = matchPatientsToPrescribers(patients, DOCTORS);
    expect(results.map((r) => r.patientRef)).toEqual(["p-epping", "p-gold-coast"]);
    for (const r of results) {
      expect(r.matches.length).toBeLessThanOrEqual(MATCHES_PER_PATIENT);
      for (let i = 1; i < r.matches.length; i++) {
        expect(r.matches[i - 1]!.total).toBeGreaterThanOrEqual(r.matches[i]!.total);
      }
    }
  });

  it("is deterministic under permutation of both input lists", () => {
    const a = matchPatientsToPrescribers(patients, DOCTORS);
    const b = matchPatientsToPrescribers([...patients].reverse(), [...DOCTORS].reverse());
    expect(a).toEqual(b);
  });

  it("says when the cut at three falls inside an exact tie instead of rendering it as a ranking", () => {
    // Four identical doctors: any three shown are an alphabetical accident, and the note says so.
    const clones = ["dr-a", "dr-b", "dr-c", "dr-d"].map((doctorRef) => doctor({ doctorRef }));
    const [result] = matchPatientsToPrescribers([patient({ patientRef: "p" })], clones);
    expect(result!.matches).toHaveLength(3);
    expect(result!.matches.map((m) => m.doctorRef)).toEqual(["dr-a", "dr-b", "dr-c"]);
    expect(result!.tieNote).toContain("fell inside an exact tie");
  });

  it("says when equal totals sit inside the list", () => {
    const twins = [doctor({ doctorRef: "dr-x" }), doctor({ doctorRef: "dr-y" }), doctor({ doctorRef: "dr-near-open", waitDays: 10 })];
    const [result] = matchPatientsToPrescribers([patient({ patientRef: "p" })], twins);
    expect(result!.tieNote).toContain("not an order");
  });

  it("a patient every doctor refuses gets an empty list and a full excluded register, never a guess", () => {
    const [result] = matchPatientsToPrescribers(
      [patient({ patientRef: "p", insuranceType: "dva" })],
      DOCTORS,
    );
    expect(result!.matches).toEqual([]);
    expect(result!.excluded).toHaveLength(DOCTORS.length);
  });
});

/**
 * O132 (allocation lane): the allocator and the finder share ONE vocabulary.
 *
 * The lane's own next step. Before this, `statedNeeds` and `communicationPreference` were
 * hand-supplied arrays while the finder derived exactly that vocabulary from a sentence — two
 * ways of saying what a patient asked for, which is the shape W221 found when the ranker and the
 * explainer held separate lexicons and had already drifted apart.
 */
describe("O132 the allocator reads a patient the way the finder does", () => {
  const base = {
    patientRef: "p1",
    location: "Beecroft",
    insuranceType: "bulk-billing",
    urgency: "this-month" as const,
  };

  it("derives exactly what readNeeds produces — no facet added, none dropped", () => {
    for (const words of [
      "a woman GP who bulk bills, unhurried, and can do adult ADHD assessment and titration",
      "someone who explains things properly and does shared care with my psychiatrist",
      "hindi speaking GP who takes time",
    ]) {
      const built = requestFromWords(base, words);
      const needs = readNeeds(words);
      expect([...built.statedNeeds!].sort()).toEqual(
        needs.flatMap((n) => (n.facet.kind === "care" ? [n.facet.area] : [])).sort(),
      );
      expect([...built.communicationPreference].sort()).toEqual(
        needs.flatMap((n) => (n.facet.kind === "manner" ? [n.facet.trait] : [])).sort(),
      );
    }
  });

  it("hears nothing the finder cannot hear", () => {
    // The one thing that would make this a second reader: a facet appearing here that the
    // finder's own read of the same words does not contain.
    const words = "I want a longer first appointment and someone who is not judgmental";
    const built = requestFromWords(base, words);
    const readable = new Set<string>(
      readNeeds(words).map((n) => (n.facet.kind === "care" ? n.facet.area : n.facet.kind === "manner" ? n.facet.trait : "")),
    );
    for (const area of built.statedNeeds!) expect(readable.has(area)).toBe(true);
    for (const trait of built.communicationPreference) expect(readable.has(trait)).toBe(true);
  });

  it("says nothing when the words reach nothing, rather than guessing", () => {
    const built = requestFromWords(base, "qqzz wibble");
    expect(built.statedNeeds).toEqual([]);
    expect(built.communicationPreference).toEqual([]);
    // And the scorer's own "nothing stated" branch is what then applies — a 1 with a sentence
    // saying why, not a guess in either direction.
  });

  /**
   * G7: URGENCY IS NEVER DERIVED FROM THE WORDS.
   *
   * Reading clinical priority out of a sentence is triage, in the one lane whose header promises
   * stated urgency is a timing preference and never a judgement. The patient may state it; this
   * constructor will not deduce it — including from a sentence that says it plainly.
   */
  it("does not infer urgency, even from a sentence that shouts it", () => {
    const built = requestFromWords(base, "this is urgent, I need to be seen as soon as possible");
    expect(built.urgency).toBe("this-month");
    expect(requestFromWords({ ...base, urgency: "whenever" }, "urgent urgent urgent").urgency).toBe("whenever");
  });
});
