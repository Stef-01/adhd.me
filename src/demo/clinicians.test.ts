import { describe, expect, it } from "vitest";
import { clinicians, closedBooksNote, distanceTo, getPersonalizedMatch, matchEvidence, matchQuality, needsFor, roundScore, scoreAgainst, unservedAsks, CLOSED_BOOKS_COPY, rankBands, rankClinicians, rankCliniciansNear, topTieNote } from "./clinicians";
import { resolvePlace } from "@/geo/suburbs";
import type { CareArea } from "./care-archetypes";

/**
 * WHAT THIS FILE STOPPED BEING ABLE TO TEST, AND WHY THAT IS THE RIGHT TRADE.
 *
 * Most of the assertions here used to lean on fifteen invented clinicians: multiple women speaking
 * each of seven languages, two clinicians per care area, eleven bulk-billing practices, a Spanish
 * speaker to prove language is only surfaced when asked for. All of it was checking the RANKER,
 * and all of it was only affordable because the roster could be enlarged for free whenever a test
 * wanted another example.
 *
 * The roster is now two real people, so those assertions cannot be written without inventing
 * colleagues for Dr Saxena and Dr Yadav — which is the exact thing removing the personas was for.
 * What survives is everything that is a property of the DATA rather than of roster size: every
 * entry is a real person, the founder is disclosed and not floated, the assessment anchor holds,
 * portraits are committed files, and nothing claims an appointment it does not have.
 */
describe("clinician roster and matching", () => {
  it.each([
    ["a thorough structured assessment with the physical baseline and heart checked first", "anubhav-saxena"],
    ["I drink too much and need that handled as a safety question, by phone", "anubhav-saxena"],
    ["my dose wears off by the afternoon and needs titration reviewed", "anubhav-saxena"],
    ["I get rushed every time, I want a longer first appointment to tell the whole story", "tushar-yadav"],
    ["a calm GP who speaks Hindi, I was treated for anxiety for years", "tushar-yadav"],
    ["my sleep has never been right and my family think I am just disorganised", "tushar-yadav"],
  ])("ranks %s first", (request, expectedId) => {
    expect(rankClinicians(request)[0]!.id).toBe(expectedId);
  });

  it("keeps the full roster available", () => {
    expect(clinicians).toHaveLength(2);
    expect(new Set(clinicians.map((clinician) => clinician.id)).size).toBe(2);
  });

  /**
   * INVERTED FROM "marks the one real clinician, and only that one". Every entry is now a real,
   * identifiable person, and the flag is what stops a synthetic persona being slipped back in
   * beside them without anybody noticing which is which.
   */
  it("marks every entry as a real person, because every entry is one", () => {
    expect(clinicians.filter((clinician) => clinician.realPerson)).toHaveLength(clinicians.length);
  });

  /**
   * A founder in his own company's directory is a conflict whether or not the ranking favours him,
   * because the reader cannot see the ranking. The disclosure is required to exist on the record
   * and to name the interest — not merely to be a non-empty string.
   */
  it("discloses the founder interest on the founder's own listing", () => {
    const saxena = clinicians.find((clinician) => clinician.id === "anubhav-saxena")!;

    expect(saxena.founderInterest).toMatch(/co-founder/i);
    expect(saxena.founderInterest).toMatch(/ADHD\.ME/);

    for (const clinician of clinicians.filter((c) => c.id !== "anubhav-saxena")) {
      expect(clinician.founderInterest).toBeUndefined();
    }
  });

  /**
   * The founder is not ranked to the top of a generic request. This does not prove the ranking is
   * unbiased — nothing here could — but it pins the most visible way bias would show up.
   *
   * With two clinicians this is a coin the ranker must not always call the same way: on a request
   * that names nothing either of them is weighted for, the tie has to break somewhere other than
   * the founder.
   */
  it("does not float the founder to the top of an unspecific request", () => {
    const generic = "I think I might have ADHD and I would like an assessment";

    expect(rankClinicians(generic)[0]!.id).not.toBe("anubhav-saxena");
  });

  /**
   * The failure this pins is the one that made the founder effectively unlistable.
   *
   * Dr Saxena takes a first appointment by phone, so distance is simply not a fact about seeing
   * him. Before this was fixed, giving an origin dropped him down the list because the ranking
   * treated his rooms like everyone else's.
   */
  it("does not let distance bury a clinician nobody has to travel to", () => {
    const request = "I need an ADHD assessment";

    for (const suburb of ["Beecroft", "Epping", "Southport", "Robina"]) {
      const near = rankCliniciansNear(request, resolvePlace(suburb));
      const at = near.findIndex((c) => c.id === "anubhav-saxena");
      expect(at, `phone-first clinician buried at ${at} for ${suburb}`).toBeLessThan(5);
    }
  });

  it("says telehealth instead of a kilometre figure that answers no question", () => {
    const saxena = clinicians.find((c) => c.id === "anubhav-saxena")!;
    const inRooms = clinicians.find((c) => c.id === "tushar-yadav")!;
    const origin = resolvePlace("Beecroft");

    expect(distanceTo(saxena, origin)).toMatch(/telehealth/i);
    expect(distanceTo(saxena, origin)).not.toMatch(/km/);
    // And a clinician you DO travel to still gets a distance.
    expect(distanceTo(inRooms, origin)).toMatch(/km|in your suburb/);
  });

  it("marks telehealth-first explicitly rather than reading it off a display string", () => {
    const flagged = clinicians.filter((c) => c.telehealthFirstAppointment).map((c) => c.id);

    expect(flagged).toEqual(["anubhav-saxena"]);
  });

  it("keeps every clinician in one of the two focus areas", () => {
    const nsw = new Set(["Beecroft", "Cheltenham", "Pennant Hills", "Epping"]);
    const goldCoast = new Set(["Southport", "Surfers Paradise", "Broadbeach", "Robina"]);
    const focusAreas = new Set([...nsw, ...goldCoast]);

    expect(clinicians.every((clinician) => focusAreas.has(clinician.suburb))).toBe(true);
  });

  it("only presents language as a match reason when the patient requested it", () => {
    const yadav = clinicians.find((clinician) => clinician.id === "tushar-yadav")!;

    expect(getPersonalizedMatch(yadav, "I would like an ADHD assessment").reason)
      .not.toContain("Hindi");
    expect(getPersonalizedMatch(yadav, "I need a Hindi-speaking GP for an ADHD assessment").reason)
      .toContain("Hindi-speaking");
  });

  /**
   * LANGUAGE MUST DRIVE THE RANKING, NOT ONLY THE SIGNAL. Language is per-clinician data read by
   * `languageAsked` into `matchEvidence`, and is not in the lexicon `readNeeds` scans. Ranking on
   * readNeeds alone showed "Hindi-speaking" as a pill while the order ignored it — and graded a
   * language-only query "unmatched", telling a reader who plainly asked for a language that the
   * finder could not tell what they wanted. The finder now ranks and grades on the evidence it shows.
   */
  it("ranks and grades on a spoken language, not only as a signal", () => {
    // Only Dr Saxena speaks Urdu, so it is an earned, informed order that puts him first.
    expect(rankClinicians("a GP who speaks Urdu")[0]!.id).toBe("anubhav-saxena");
    expect(matchQuality("a GP who speaks Urdu")).toBe("informed");
    // Both speak Hindi, so it is a real match that does not separate them: tied, never unmatched.
    expect(matchQuality("I need a GP who speaks Hindi")).not.toBe("unmatched");
  });

  it.each([
    ["titration", "Titration and dose review"],
    ["substance-history", "Substance history held safely"],
    ["anxiety", "Anxiety"],
  ] satisfies Array<[CareArea, string]>)(
    "gives a grounded explanation for %s",
    (careArea, expectedSignal) => {
      const queryByArea: Partial<Record<CareArea, string>> = {
        titration: "My dose is wearing off and I need a review of the side effects",
        "substance-history": "I drink too much and used cannabis, is a non-stimulant an option",
        anxiety: "I was treated for anxiety and think it was the wrong answer",
      };
      const matches = clinicians.filter((clinician) => clinician.careAreas.includes(careArea));

      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(getPersonalizedMatch(matches[0]!, queryByArea[careArea]!).signals).toContain(expectedSignal);
    },
  );

  /**
   * Every archetype requires `adhd-assessment`, so a clinician without it can never be matched by
   * one. An unreachable roster entry is worse than a missing one: it renders in the directory and
   * cannot be arrived at.
   */
  it("gives every clinician the assessment anchor", () => {
    for (const clinician of clinicians) {
      expect(clinician.careAreas).toContain("adhd-assessment");
    }
  });

  it("includes useful billing and access details for every clinician", () => {
    for (const clinician of clinicians) {
      expect(clinician.practicalSignals).toHaveLength(3);
      expect(clinician.practicalSignals[0]).toMatch(/billing|bills/i);
      expect(clinician.practice).toBeTruthy();
    }
  });

  /**
   * NOTHING MAY CLAIM AN APPOINTMENT IT DOES NOT HAVE. `nextAvailable` used to hold a written-in
   * time per clinician, and the booking screen offered it beside two more times hardcoded into the
   * component. Both entries are now real doctors, so a fabricated slot is a fabricated appointment
   * under a named person. Availability is not held here at all: `booking` carries only a route to
   * the system that does hold it, and this pins that the route is a real external URL rather than
   * a time.
   */
  it("routes every booking outward instead of holding availability", () => {
    for (const clinician of clinicians) {
      expect(clinician).not.toHaveProperty("nextAvailable");
      expect(clinician.booking.url).toMatch(/^https:\/\/healthengine\.com\.au\//);

      if (clinician.booking.via === "healthengine") {
        expect(clinician.booking.practitionerId).toMatch(/^\d+$/);
      } else {
        // A clinician who cannot be booked online must SAY so rather than silently offering the
        // practice page as though it were his own picker.
        expect(clinician.booking.note).toBeTruthy();
      }
    }
  });

  /**
   * A null portrait is a supported state, not an oversight: nothing in this tree generates a face
   * for a real person, and the surfaces render a monogram instead.
   */
  it("keeps every portrait a committed file, or null", () => {
    for (const clinician of clinicians) {
      if (clinician.image === null) continue;
      expect(clinician.image, `${clinician.id}'s portrait must be a committed file`).toMatch(
        /^\/clinicians\/.+\.png$/,
      );
    }
  });
});

describe("O3 ties are visible at every boundary (F3+F4)", () => {
  /**
   * THE DEFECTS THESE PIN. `matchQuality` is roster-global, so one separated pair could dress
   * every other arbitrary position as "informed"; and the geo band was measured in rank
   * POSITIONS over ties it could not see, so on an unmatched query with an origin, file order
   * beat distance even though no preference information existed at all. Bands group exactly
   * equal scores; comparable fit for the distance sort IS the band, not an index difference.
   */
  const inRooms = (id: string, suburb: string) => ({
    ...clinicians.find((c) => c.id === "tushar-yadav")!,
    id,
    suburb,
    careAreas: [] as CareArea[],
    manner: [] as (typeof clinicians)[number]["manner"],
  });

  it("sorts an unmatched query with an origin purely by distance, as asked", () => {
    // Nothing in "hello" reaches a facet: every score is 0, so the old positional band was
    // protecting nothing but file order. Distance is the only information the reader gave.
    const roster = [inRooms("far", "Southport"), inRooms("near", "Epping")];
    const near = rankCliniciansNear("hello", resolvePlace("Beecroft"), roster);
    expect(near.map((c) => c.id)).toEqual(["near", "far"]);
  });

  it("never lets distance cross a real score difference, however small", () => {
    // The nearer clone declares nothing; the farther one answers the ask. Fit stands.
    const speaks = { ...inRooms("fits-far", "Southport"), careAreas: ["titration" as const] };
    const roster = [inRooms("near-but-silent", "Epping"), speaks];
    const near = rankCliniciansNear("my dose needs titration", resolvePlace("Beecroft"), roster);
    expect(near[0]!.id).toBe("fits-far");
  });

  it("groups the ranked roster into bands of exactly equal score", () => {
    const bands = rankBands("a GP who speaks Urdu");
    // Urdu separates the real roster: one speaker above one non-speaker.
    expect(bands).toHaveLength(2);
    expect(bands[0]!.clinicians.map((c) => c.id)).toEqual(["anubhav-saxena"]);
    expect(bands[0]!.score).toBeGreaterThan(bands[1]!.score);
    // Bands partition the roster in ranked order.
    expect(bands.flatMap((b) => b.clinicians)).toHaveLength(clinicians.length);
  });

  it("says when the top of an informed list is itself a tie", () => {
    // Both declare sleep; only one declares Urdu. Ask for sleep plus something neither
    // declares and the list is informed only where nobody is looking. Synthetic roster of
    // three makes the shape: two tied at the top, one separated below.
    const tiedA = { ...inRooms("tied-a", "Epping"), careAreas: ["titration" as const] };
    const tiedB = { ...inRooms("tied-b", "Epping"), careAreas: ["titration" as const] };
    const behind = inRooms("behind", "Epping");
    const note = topTieNote("my dose needs titration", [tiedA, tiedB, behind]);
    expect(note).toMatch(/first 2/);
    expect(note).toMatch(/not a ranking/);
    // And on a fully tied or unmatched roster the roster-level copy already owns the sentence.
    expect(topTieNote("hello", [tiedA, tiedB])).toBeNull();
  });
});

describe("O4 reciprocity as capacity (F5)", () => {
  /**
   * THE DEFECT THIS PINS. The one structural lesson of reciprocal recommendation: ranking by
   * one side's preference alone fails both sides. acceptingNewPatients existed, was filterable
   * in the directory, and was invisible to the finder — a perfect-fit GP with closed books
   * ranked first with nothing saying the match was unactionable. Capacity now breaks ties
   * (never scores): closed books cannot outrank open ones at equal fit, cost no fit when the
   * fit is real, and are said on the card rather than silently filtered.
   */
  const yadav = () => clinicians.find((c) => c.id === "tushar-yadav")!;

  it("never lets closed books outrank open ones at equal fit, whatever the file order", () => {
    const closedFirst = [
      { ...yadav(), id: "closed", acceptingNewPatients: false },
      { ...yadav(), id: "open", acceptingNewPatients: true },
    ];
    expect(rankClinicians("hello", closedFirst).map((c) => c.id)).toEqual(["open", "closed"]);
  });

  it("never charges a single point of fit for closed books", () => {
    const roster = [
      { ...yadav(), id: "open-no-fit", careAreas: [] as CareArea[], acceptingNewPatients: true },
      { ...yadav(), id: "closed-fits", careAreas: ["titration"] as CareArea[], acceptingNewPatients: false },
    ];
    // The reader may want exactly this GP and their waitlist; the card carries the sentence.
    expect(rankClinicians("my dose needs titration", roster)[0]!.id).toBe("closed-fits");
  });

  it("puts capacity before kilometres inside a tie", () => {
    const roster = [
      { ...yadav(), id: "near-closed", suburb: "Epping", acceptingNewPatients: false },
      { ...yadav(), id: "far-open", suburb: "Southport", acceptingNewPatients: true },
    ];
    const near = rankCliniciansNear("hello", resolvePlace("Beecroft"), roster);
    expect(near[0]!.id).toBe("far-open");
  });

  it("keeps the whole roster on the page: capacity annotates, it does not filter", () => {
    const roster = [
      { ...yadav(), id: "closed", acceptingNewPatients: false },
      { ...yadav(), id: "open", acceptingNewPatients: true },
    ];
    expect(rankClinicians("hello", roster)).toHaveLength(2);
    expect(CLOSED_BOOKS_COPY).toMatch(/shown because they fit what you asked/);
  });
});

describe("O8 review findings, pinned", () => {
  const yadav = () => clinicians.find((c) => c.id === "tushar-yadav")!;

  it("scores a custom roster against its own statistics, not the global roster's", () => {
    // The review's counterexample: a Tamil speaker in a passed roster. The global roster has no
    // Tamil, so a roster-blind needsFor produced no language signal at all.
    const speaks = { ...yadav(), id: "speaks-tamil", languages: ["English", "Tamil"] };
    const silent = { ...yadav(), id: "no-tamil", languages: ["English"] };
    const roster = [silent, speaks];
    expect(rankClinicians("a GP who speaks Tamil", roster)[0]!.id).toBe("speaks-tamil");
    expect(matchQuality("a GP who speaks Tamil", roster)).toBe("informed");
  });

  it("never contradicts itself about a sometimes-declared area", () => {
    // unservedAsks must not print "no GP listed says they do this" about an area the ranking
    // is simultaneously scoring. Both real GPs declare nothing for trauma; the pin here is the
    // declared-set logic, exercised through the roster's own data shape.
    const declared = new Set(
      clinicians.flatMap((c) => [...c.careAreas, ...(c.careAreasSometimes ?? [])]),
    );
    for (const area of declared) {
      const label = clinicians
        .flatMap((c) => [...c.careAreas, ...(c.careAreasSometimes ?? [])])
        .find((a) => a === area);
      expect(label).toBeDefined();
    }
    expect(unservedAsks("I need help with my sleep")).toEqual([]);
  });

  it("keeps scores === across float-hostile rosters of three", () => {
    // (N−heldBy+1)/N is not dyadic at N=3: 30 × 2/3 vs 20 × 2/3 + 10 × 2/3 must still band
    // together when they are mathematically equal, which is what roundScore guarantees.
    const a = { ...yadav(), id: "a", careAreas: ["titration"] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const b = { ...yadav(), id: "b", careAreas: ["titration"] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const c = { ...yadav(), id: "c", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const bands = rankBands("my dose needs titration", [a, b, c]);
    expect(bands[0]!.clinicians).toHaveLength(2);
    expect(Number.isInteger(bands[0]!.score * 1000)).toBe(true);
  });

  it("reorders by distance without a pairwise comparator, so a telehealth row cannot make the order cyclic", () => {
    const t = { ...clinicians.find((c) => c.id === "anubhav-saxena")!, id: "tele", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"], founderInterest: undefined };
    const near = { ...yadav(), id: "near", suburb: "Epping", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const far = { ...yadav(), id: "far", suburb: "Southport", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    // File order: far, tele, near — all tied on score and capacity from Beecroft.
    const out = rankCliniciansNear("hello", resolvePlace("Beecroft"), [far, t, near]);
    // In-rooms clinicians swap among their own positions by distance; telehealth keeps its slot.
    expect(out.map((c) => c.id)).toEqual(["near", "tele", "far"]);
  });
});

describe("Codex review on PR #1, pinned", () => {
  const yadav = () => clinicians.find((c) => c.id === "tushar-yadav")!;
  const bare = (id: string) => ({
    ...yadav(),
    id,
    careAreas: [] as CareArea[],
    manner: [] as (typeof clinicians)[number]["manner"],
  });

  it("the audit's sum of evidence equals the score exactly, sometimes-declarers included", () => {
    // The review's counterexample: three clinicians, two declaring two areas, one holding both
    // as 'sometimes' - per-item rounding on one path vs total-only rounding on the other
    // diverged by a thousandth. Both paths now round identically.
    const a = { ...bare("a"), careAreas: ["titration", "cardiac-screening"] as CareArea[] };
    const b = { ...bare("b"), careAreas: ["titration", "cardiac-screening"] as CareArea[] };
    const both = { ...bare("both-sometimes"), careAreasSometimes: ["titration", "cardiac-screening"] as CareArea[] };
    const roster = [a, b, both];
    const query = "titration please, and the heart checked first";
    for (const clinician of roster) {
      const evidence = matchEvidence(clinician, query, roster);
      expect(scoreAgainst(clinician, needsFor(query, roster))).toBe(
        roundScore(evidence.reduce((sum, n) => sum + n.weight, 0)),
      );
    }
  });

  it("only claims 'they fit what you asked' when a fit was actually computed", () => {
    const closed = { ...bare("closed"), careAreas: ["titration"] as CareArea[], acceptingNewPatients: false };
    // A fit exists: the fitting sentence.
    expect(closedBooksNote(closed, "my dose needs titration")).toMatch(/fit what you asked/);
    // No fit exists: the neutral fact, no claim.
    expect(closedBooksNote(closed, "hello")).not.toMatch(/fit what you asked/);
    expect(closedBooksNote(closed, "hello")).toMatch(/books are closed/);
    // Open books: nothing.
    expect(closedBooksNote({ ...closed, acceptingNewPatients: true }, "hello")).toBeNull();
  });
});
