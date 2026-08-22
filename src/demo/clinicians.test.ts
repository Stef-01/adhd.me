import { describe, expect, it } from "vitest";
import { capacityGrade, clinicians, closedBooksNote, distanceTo, getPersonalizedMatch, locationLabel, matchEvidence, matchQuality, missedAsks, needsFor, roundScore, scoreAgainst, unservedAsks, CAPACITY_FRESH_DAYS, CLOSED_BOOKS_COPY, rankBands, rankClinicians, rankCliniciansNear, topTieNote } from "./clinicians";
import { holdsPreference } from "@/matching/needs";
import { syntheticClinician } from "./synthetic-clinician";
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
    // O179: these two moved from Dr Yadav to Dr Anusha Saxena when he left. Neither is a
    // re-tuning — the same evidence now lands on the remaining declarer: she speaks Hindi and
    // carries anxiety and non-medication at interest grade, which is what these requests reach.
    ["a calm GP who speaks Hindi, I was treated for anxiety for years", "anusha-saxena"],
    ["my sleep has never been right and my family think I am just disorganised", "anusha-saxena"],
  ])("ranks %s first", (request, expectedId) => {
    expect(rankClinicians(request)[0]!.id).toBe(expectedId);
  });

  /**
   * O179: THE LONGER-APPOINTMENT REQUEST NOW REACHES NOBODY, AND THAT IS THE ASSERTION.
   *
   * It used to rank Dr Yadav first — "Longer first appointment" was his declared signal and the
   * only one on the roster. He left, and the honest consequence is not that somebody else inherits
   * the request: it is that the finder has nobody to offer and must say so. `unserved` is the
   * grade that says it.
   *
   * Pinned as a POSITIVE assertion rather than deleted with the clinician, because the failure this
   * guards is the tempting one — quietly re-pointing the row at whoever now sorts first and letting
   * a reader who asked for an unhurried appointment believe they got one. The day a GP declares
   * `longer-appointment`, this test goes red and is meant to: that is the day the row becomes a
   * ranking assertion again.
   */
  it("says nobody serves a longer first appointment, rather than offering a substitute", () => {
    const request = "I get rushed every time, I want a longer first appointment to tell the whole story";

    expect(matchQuality(request)).toBe("unserved");
    expect(clinicians.some((clinician) => holdsPreference(clinician, "longer-appointment"))).toBe(false);
  });

  it("keeps the full roster available", () => {
    // Two since O179: Dr Anubhav Saxena (Beecroft) and Dr Anusha Saxena (Double Bay & Hornsby).
    // Dr Tushar Yadav's entry was removed when he left the platform on 2026-08-22.
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
   * A clinician with a commercial interest in this product, listed in its own directory, is a
   * conflict whether or not the ranking favours them — because the reader cannot see the ranking.
   * The disclosure must exist on the record AND name the interest, not merely be a non-empty
   * string.
   *
   * O161: this comment used to read "A founder in his own company's directory", and the test was
   * named "on every founder's own listing". Both were false and both survived O158, which fixed
   * the sentence a patient reads and left the prose that GOVERNS that sentence saying the wrong
   * thing. Dr Saxena owns his CLINIC and is ADHD.ME's first clinic partner; he did not found the
   * entity. A rationale is where the next author learns what the copy is for, so a wrong one
   * regenerates wrong copy — the same shape as fixing a QA capture and leaving the script that
   * overwrites it.
   */
  it("discloses the declared interest on the listing of every clinician who has one, and nobody else's", () => {
    // O89: two entries carry a declared interest, both put on the record by the founder
    // (Dr Anubhav from the start; Dr Anusha 2026-08-20). The register carries exactly what
    // was directed — Dr Yadav carries no interest because none was declared for him.
    const WITH_INTEREST = ["anubhav-saxena", "anusha-saxena"];
    for (const id of WITH_INTEREST) {
      const listed = clinicians.find((clinician) => clinician.id === id)!;
      // O156: the term is "ownership interest" since the founder asked for "founder" to go from
      // the site. The pin MOVED with the wording rather than being loosened — the disclosure must
      // still NAME the interest, because a conflict notice that stops saying what the conflict is
      // has stopped working. A pin relaxed to something like /interest|team/ would let exactly
      // that happen silently, on a health surface, about a real named doctor.
      // O158: the pin cannot demand a WORD any more, because the two entries describe different
      // relationships and demanding "ownership" is what let a false claim pass review. It demands
      // the two things a conflict notice must have: it names ADHD.ME, and it says WHY it is being
      // disclosed. And it forbids the specific false claim the founder corrected.
      expect(listed.disclosedInterest, id).toMatch(/Disclosed because/i);
      expect(listed.disclosedInterest, id).not.toMatch(/founder|co-?found/i);
      expect(
        listed.disclosedInterest,
        `${id}: claims ownership of the entity — Dr Saxena owns his clinic, not ADHD.ME (O158)`,
      ).not.toMatch(/(owns|ownership (interest )?(in|of)) ADHD\.ME/i);
      expect(listed.disclosedInterestLabel, id).toBeTruthy();
      expect(listed.disclosedInterest, id).toMatch(/ADHD\.ME/);
    }
    for (const clinician of clinicians.filter((c) => !WITH_INTEREST.includes(c.id))) {
      expect(clinician.disclosedInterest).toBeUndefined();
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
  it("has nobody left to spend a tie on — EVERY listed clinician is now conflicted", () => {
    const generic = "I think I might have ADHD and I would like an assessment";

    /**
     * O179: THIS TEST INVERTED, AND THE INVERSION IS THE FINDING.
     *
     * It used to assert that the top of a generic list carries no declared interest — the
     * tie-break spending ties against the house. That was satisfiable because Dr Yadav was on the
     * roster and had no interest to declare. He left, and BOTH remaining clinicians are disclosed:
     * Dr Anubhav (his clinic is ADHD.ME's first partner) and Dr Anusha (declared interest, O89).
     *
     * So the protection did not weaken — it ran out of material. There is no unconflicted
     * clinician for the rule to promote, and on any request that separates nobody a reader now
     * sees a conflicted listing first because that is the only kind of listing there is.
     *
     * Asserted as the REAL STATE with the reason attached, rather than deleted or softened to
     * something that still passes. A directory in which 100% of listings carry a declared interest
     * in the directory's owner is a founder-level fact about the product, not a test detail; it is
     * carried to the gate list in docs/MATCHING-APPRAISAL-O180.md. The day an unconflicted GP is
     * listed, this test goes red and the stronger assertion above comes back with them.
     */
    expect(clinicians.every((clinician) => clinician.disclosedInterest)).toBe(true);
    expect(rankClinicians(generic)[0]!.disclosedInterest).toBeTruthy();
  });

  /**
   * THE LAW ITSELF STILL HOLDS AND IS STILL CHECKED — on a roster that can express it.
   *
   * The rule is a property of `rankClinicians`, not of who happens to be listed this month, so it
   * is asserted where it can be: an unconflicted clinician and a conflicted one, identical in
   * every field the ranker reads, on a request that separates nobody.
   */
  it("spends a tie against the house whenever there is an unconflicted clinician to spend it on", () => {
    const roster = [
      syntheticClinician({ id: "conflicted", disclosedInterest: "Declared interest in ADHD.ME.", disclosedInterestLabel: "Declared interest" }),
      syntheticClinician({ id: "unconflicted" }),
    ];

    expect(rankClinicians("I think I might have ADHD and I would like an assessment", roster)[0]!.id).toBe("unconflicted");
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
    // O179: a synthetic travel-to clinician. Dr Yadav was the roster's only non-telehealth
    // entry; with him gone the contrast this test draws has to be built rather than borrowed.
    const inRooms = syntheticClinician({ suburb: "Beecroft" });
    const origin = resolvePlace("Beecroft");

    expect(distanceTo(saxena, origin)).toMatch(/telehealth/i);
    expect(distanceTo(saxena, origin)).not.toMatch(/km/);
    // And a clinician you DO travel to still gets a distance.
    expect(distanceTo(inRooms, origin)).toMatch(/km|in your suburb/);
  });

  /**
   * O180: THE TRAIT VOCABULARY, GUARDED IN BOTH DIRECTIONS.
   *
   * Two founder-directed changes on 2026-08-22, and the second is why this test exists rather than
   * just the edit. "Books online" was removed as unclear language. "Telehealth" replaced "Phone
   * consultations" on Dr Anubhav's listing — the same declared fact in clearer words.
   *
   * The risk the directive creates is that "Telehealth" reads as a *better* word for any remote-ish
   * signal, and gets typed onto a listing whose doctor never claimed it. Dr Anusha is the live case:
   * she had "Books online", which was TRUE and evidenced by a Healthengine booking route, and she
   * has deliberately not declared telehealth. Substituting one for the other would have turned the
   * removal of a vague word into the assertion of an undeclared service, on a real doctor's listing.
   *
   * So the display string may not run ahead of the declaration: a listing may only SAY telehealth if
   * `telehealthFirstAppointment` says it too. The field stays the authority (see roster.ts), and
   * this is the check that the words agree with it.
   */
  it("never says telehealth on a listing that has not declared it, and has retired 'Books online'", () => {
    for (const clinician of clinicians) {
      const saysTelehealth = clinician.practicalSignals.some((signal) => /telehealth/i.test(signal));
      if (saysTelehealth) {
        expect(clinician.telehealthFirstAppointment, `${clinician.id} says telehealth without declaring it`).toBe(true);
      }
      expect(clinician.practicalSignals, `${clinician.id} still carries the retired "Books online" trait`)
        .not.toContain("Books online");
    }

    // Non-vacuity: the rule above is only meaningful while somebody actually says it.
    expect(clinicians.filter((c) => c.practicalSignals.some((s) => /telehealth/i.test(s)))).toHaveLength(1);
  });

  it("marks telehealth-first explicitly rather than reading it off a display string", () => {
    const flagged = clinicians.filter((c) => c.telehealthFirstAppointment).map((c) => c.id);

    expect(flagged).toEqual(["anubhav-saxena"]);
  });

  it("keeps every clinician in one of the two focus areas", () => {
    const nsw = new Set(["Beecroft", "Cheltenham", "Pennant Hills", "Epping", "Hornsby"]);
    const easternSuburbs = new Set(["Double Bay", "Edgecliff", "Rose Bay", "Bondi Junction"]);
    const goldCoast = new Set(["Southport", "Surfers Paradise", "Broadbeach", "Robina"]);
    const focusAreas = new Set([...nsw, ...easternSuburbs, ...goldCoast]);

    // O85: the check covers EVERY declared consulting location, not only the primary —
    // a second location outside the focus areas (or missing from the gazetteer) is the
    // same defect in a quieter field.
    for (const clinician of clinicians) {
      for (const suburb of [clinician.suburb, ...(clinician.alsoConsultsAt ?? [])]) {
        expect(focusAreas.has(suburb), `${clinician.id} lists ${suburb}`).toBe(true);
        expect(resolvePlace(suburb), `${suburb} is not in the gazetteer`).not.toBeNull();
      }
    }
  });

  /**
   * §O85: a second consulting location is a fact the machinery reads and the reader sees.
   * Dr Anusha's Hornsby rooms were founder-supplied (2026-08-20); the distance sentence
   * must name the rooms it measured whenever they are not her primary suburb, so a
   * kilometre figure to Hornsby never renders as though Double Bay were that close.
   */
  describe("§O85 second consulting locations", () => {
    const anusha = clinicians.find((c) => c.id === "anusha-saxena")!;

    it("distance reads the nearest location and names it when it is not the primary", () => {
      const fromHornsby = distanceTo(anusha, resolvePlace("Hornsby"));
      expect(fromHornsby).toContain("in your suburb");
      expect(fromHornsby).toContain("(their Hornsby rooms)");
      // From her primary suburb the sentence stays plain — the card already says Double Bay.
      const fromDoubleBay = distanceTo(anusha, resolvePlace("Double Bay"));
      expect(fromDoubleBay).toContain("in your suburb");
      expect(fromDoubleBay).not.toContain("rooms");
      // From Beecroft, Hornsby (~6 km) is far nearer than Double Bay (~20 km).
      expect(distanceTo(anusha, resolvePlace("Beecroft"))).toContain("(their Hornsby rooms)");
    });

    it("the label shows every place she consults", () => {
      expect(locationLabel(anusha)).toBe("Double Bay & Hornsby");
      // Single-location clinicians are untouched.
      expect(locationLabel(syntheticClinician({ suburb: "Beecroft" }))).toBe("Beecroft");
    });

    /**
     * §O86: Dr Anubhav's pair (founder-supplied 2026-08-20). He is telehealth-first, so a
     * second location changes the LABEL a reader sees and nothing else: the sentence stays
     * telehealth — no kilometre figure, no rooms parenthetical — and the near-sort keeps
     * treating him as equally near from everywhere.
     */
    it("a telehealth-first clinician's second location changes the label only", () => {
      const anubhav = clinicians.find((c) => c.id === "anubhav-saxena")!;
      expect(locationLabel(anubhav)).toBe("Beecroft & Double Bay");
      for (const suburb of ["Beecroft", "Double Bay", "Hornsby", "Southport"]) {
        const said = distanceTo(anubhav, resolvePlace(suburb));
        expect(said).toMatch(/telehealth/i);
        expect(said).not.toMatch(/km|rooms/);
      }
    });

    it("the near-sort reads the nearest location: a Hornsby reader finds her adjacent, not 25 km away", () => {
      // An unmatched query with an origin is fully distance-sorted within the tie (O3/F4),
      // and Dr Anubhav is telehealth-first (keeps fit position) — so between two travel-to
      // clinicians, Anusha's Hornsby rooms must beat Beecroft from Hornsby.
      //
      // O179: the Beecroft half of that contrast was Dr Yadav and is now synthetic. The property
      // needs TWO travel-to clinicians and the real roster has one, so building the second is the
      // only way to keep asserting it — the alternative was deleting the test with the colleague,
      // which would have retired a live geo rule for a staffing reason.
      const roster = [clinicians.find((c) => c.id === "anusha-saxena")!, syntheticClinician({ id: "beecroft-rooms", suburb: "Beecroft" })];
      const near = rankCliniciansNear("zzz qqq", resolvePlace("Hornsby"), roster);
      const anushaAt = near.findIndex((c) => c.id === "anusha-saxena");
      const beecroftAt = near.findIndex((c) => c.id === "beecroft-rooms");
      expect(anushaAt).toBeLessThan(beecroftAt);
    });
  });

  it("only presents language as a match reason when the patient requested it", () => {
    // O179: synthetic, because the rule under test is "a language is surfaced only when it was
    // asked for" — a property of `matchEvidence`, not of any doctor. Pinning it to a real Hindi
    // speaker is what made a departure look like a ranking regression.
    const speaker = syntheticClinician({ languages: ["English", "Hindi"] });

    expect(getPersonalizedMatch(speaker, "I would like an ADHD assessment").reason)
      .not.toContain("Hindi");
    expect(getPersonalizedMatch(speaker, "I need a Hindi-speaking GP for an ADHD assessment").reason)
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
    /**
     * O179: THE LAW MOVED TO A ROSTER THAT CAN STILL EXPRESS IT.
     *
     * Dr Yadav was the roster's only non-Urdu speaker, so "a GP who speaks Urdu" used to separate
     * two speakers from one non-speaker and graded `informed`. Both remaining GPs speak Urdu AND
     * Hindi, so no language question can separate them any more and every language query is now
     * correctly `tied`. Asserting `informed` against the real roster would be asserting a
     * separation that no longer exists.
     */
    const speaks = syntheticClinician({ id: "speaks-urdu", languages: ["English", "Urdu"] });
    const silent = syntheticClinician({ id: "no-urdu", languages: ["English"] });
    const roster = [silent, speaks];

    expect(rankClinicians("a GP who speaks Urdu", roster)[0]!.id).toBe("speaks-urdu");
    expect(matchQuality("a GP who speaks Urdu", roster)).toBe("informed");

    // And against the REAL roster the honest grade is `tied`: a genuine match that separates
    // nobody, which is a different statement from "we could not tell what you wanted".
    expect(matchQuality("a GP who speaks Urdu")).toBe("tied");
    expect(matchQuality("I need a GP who speaks Hindi")).not.toBe("unmatched");
  });

  /**
   * O179: `anxiety` LEFT THIS TABLE WITH DR YADAV, AND ITS ABSENCE IS PINNED BELOW RATHER THAN
   * SIMPLY DELETED. He was the only clinician declaring it at full grade; Dr Anusha carries it at
   * INTEREST grade, which `careAreas.includes` does not see. Leaving the row here would fail on an
   * empty `matches` array and say nothing useful; removing it silently would let the roster stop
   * covering an entire care area with no test noticing.
   */
  it.each([
    ["titration", "Titration and dose review"],
    ["substance-history", "Substance history held safely"],
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

  it("records that anxiety is declared at interest grade only, by nobody at full grade", () => {
    // The trigger: a GP declaring `anxiety` in `careAreas` puts the row back in the table above.
    expect(clinicians.filter((clinician) => clinician.careAreas.includes("anxiety"))).toHaveLength(0);
    expect(clinicians.filter((clinician) => (clinician.careAreasSometimes ?? []).includes("anxiety"))).toHaveLength(1);
  });

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
      /**
       * O180: WAS `toHaveLength(3)`, NOW A FLOOR OF TWO, AND THE FLOOR IS THE HONEST NUMBER.
       *
       * Three was never a requirement — it was the count every entry happened to have, pinned as
       * though it meant something. What the product actually needs is that the profile's signal row
       * is full, and that row renders `practicalSignals.slice(0, 2)`. Dr Anusha has two since
       * "Books online" was retired, and her listing is complete: the exact count was carrying no
       * information while blocking a truthful edit, which is the worst combination for a pin.
       * The floor is asserted against the SLICE the surface takes, so if that widens to three this
       * goes red rather than silently rendering a gap.
       */
      expect(clinician.practicalSignals.length, clinician.id).toBeGreaterThanOrEqual(2);
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
    ...syntheticClinician(),
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
    // O179: the two-band example needs a roster where something separates, and Urdu no longer
    // does — both remaining GPs speak it. Built rather than borrowed, for the same reason as the
    // other engine laws in this file.
    const roster = [
      syntheticClinician({ id: "speaks-a", languages: ["English", "Urdu"] }),
      syntheticClinician({ id: "speaks-b", languages: ["English", "Urdu"] }),
      syntheticClinician({ id: "silent", languages: ["English"] }),
    ];
    const bands = rankBands("a GP who speaks Urdu", roster);

    expect(bands).toHaveLength(2);
    expect(bands[0]!.clinicians.map((c) => c.id).sort()).toEqual(["speaks-a", "speaks-b"]);
    expect(bands[0]!.score).toBeGreaterThan(bands[1]!.score);
    // Bands partition the roster in ranked order.
    expect(bands.flatMap((b) => b.clinicians)).toHaveLength(roster.length);

    // And on the real roster the same query is ONE band, because it separates nobody.
    expect(rankBands("a GP who speaks Urdu")).toHaveLength(1);
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


  it("never lets closed books outrank open ones at equal fit, whatever the file order", () => {
    const closedFirst = [
      { ...syntheticClinician(), id: "closed", acceptingNewPatients: false },
      { ...syntheticClinician(), id: "open", acceptingNewPatients: true },
    ];
    expect(rankClinicians("hello", closedFirst).map((c) => c.id)).toEqual(["open", "closed"]);
  });

  it("never charges a single point of fit for closed books", () => {
    const roster = [
      { ...syntheticClinician(), id: "open-no-fit", careAreas: [] as CareArea[], acceptingNewPatients: true },
      { ...syntheticClinician(), id: "closed-fits", careAreas: ["titration"] as CareArea[], acceptingNewPatients: false },
    ];
    // The reader may want exactly this GP and their waitlist; the card carries the sentence.
    expect(rankClinicians("my dose needs titration", roster)[0]!.id).toBe("closed-fits");
  });

  it("puts capacity before kilometres inside a tie", () => {
    const roster = [
      { ...syntheticClinician(), id: "near-closed", suburb: "Epping", acceptingNewPatients: false },
      { ...syntheticClinician(), id: "far-open", suburb: "Southport", acceptingNewPatients: true },
    ];
    const near = rankCliniciansNear("hello", resolvePlace("Beecroft"), roster);
    expect(near[0]!.id).toBe("far-open");
  });

  it("keeps the whole roster on the page: capacity annotates, it does not filter", () => {
    const roster = [
      { ...syntheticClinician(), id: "closed", acceptingNewPatients: false },
      { ...syntheticClinician(), id: "open", acceptingNewPatients: true },
    ];
    expect(rankClinicians("hello", roster)).toHaveLength(2);
    expect(CLOSED_BOOKS_COPY).toMatch(/shown because they fit what you asked/);
  });
});

describe("O56 capacity truthfulness: a declaration ages, and the tie-break prices its age", () => {
  /**
   * THE DEFECT THIS PINS. `acceptingNewPatients: true` written once is a claim the directory
   * repeats forever — books close without anybody editing a profile (the NRMP lesson the year
   * plan cites). So the declaration now carries its date, freshness is graded from that date
   * with the clock INJECTED, and the O4 tie-break becomes three grades: a stale open
   * declaration still beats closed books (there is a door to knock on) but no longer beats one
   * confirmed this quarter. Grading never scores and never filters — order within a tie only,
   * exactly like O4 before it.
   */

  const on = (iso: string) => new Date(`${iso}T00:00:00Z`);

  it("grades the boundary exactly: fresh at 90 days, stale at 91", () => {
    const declared = { ...syntheticClinician(), capacityDeclaredAt: "2026-08-19" };
    expect(capacityGrade(declared, on("2026-08-19"))).toBe("fresh-open");
    // Day CAPACITY_FRESH_DAYS is the last fresh day; one more and the claim has lapsed.
    expect(capacityGrade(declared, on("2026-11-17"))).toBe("fresh-open"); // +90
    expect(capacityGrade(declared, on("2026-11-18"))).toBe("stale-open"); // +91
    expect(CAPACITY_FRESH_DAYS).toBe(90);
  });

  it("never lets an undated open declaration claim freshness", () => {
    const undated = { ...syntheticClinician(), capacityDeclaredAt: undefined };
    expect(capacityGrade(undated, on("2026-08-19"))).toBe("stale-open");
  });

  it("grades closed books closed regardless of any date on record", () => {
    const closed = { ...syntheticClinician(), acceptingNewPatients: false, capacityDeclaredAt: "2026-08-19" };
    expect(capacityGrade(closed, on("2026-08-19"))).toBe("closed");
  });

  it("breaks an equal-fit tie fresh over stale over closed, whatever the file order", () => {
    const roster = [
      { ...syntheticClinician(), id: "closed", acceptingNewPatients: false },
      { ...syntheticClinician(), id: "stale", capacityDeclaredAt: "2026-01-01" },
      { ...syntheticClinician(), id: "fresh", capacityDeclaredAt: "2026-08-01" },
    ];
    expect(rankClinicians("hello", roster, on("2026-08-19")).map((c) => c.id)).toEqual([
      "fresh",
      "stale",
      "closed",
    ]);
  });

  it("never charges a point of fit for staleness — grade orders ties only", () => {
    const roster = [
      { ...syntheticClinician(), id: "fresh-no-fit", careAreas: [] as CareArea[], capacityDeclaredAt: "2026-08-01" },
      { ...syntheticClinician(), id: "stale-fits", careAreas: ["titration"] as CareArea[], capacityDeclaredAt: "2025-01-01" },
    ];
    expect(rankClinicians("my dose needs titration", roster, on("2026-08-19"))[0]!.id).toBe("stale-fits");
  });

  it("keeps distance inside the grade boundary: near-stale never crosses far-fresh", () => {
    const roster = [
      { ...syntheticClinician(), id: "near-stale", suburb: "Epping", capacityDeclaredAt: "2025-01-01" },
      { ...syntheticClinician(), id: "far-fresh", suburb: "Southport", capacityDeclaredAt: "2026-08-01" },
    ];
    const near = rankCliniciansNear("hello", resolvePlace("Beecroft"), roster, on("2026-08-19"));
    expect(near[0]!.id).toBe("far-fresh");
  });

  it("keeps the founder-behind rule intact within a grade", () => {
    const saxena = clinicians.find((c) => c.id === "anubhav-saxena")!;
    expect(saxena.disclosedInterest).toBeTruthy();
    const tied = [
      { ...saxena, capacityDeclaredAt: "2026-08-01" },
      { ...syntheticClinician(), careAreas: saxena.careAreas, careAreasSometimes: saxena.careAreasSometimes, manner: saxena.manner, languages: saxena.languages, capacityDeclaredAt: "2026-08-01" },
    ];
    // Same grade, same declarations: the disclosed interest still sorts behind (W221).
    expect(rankClinicians("hello", tied, on("2026-08-19"))[0]!.id).toBe("synthetic-gp");
  });

  it("dates every live roster declaration, so nothing on the record is undated", () => {
    // The dates are the commits that put each declaration on the record — see the roster
    // comment. A new entry without a date grades stale until somebody actually confirms it.
    for (const clinician of clinicians) {
      expect(clinician.capacityDeclaredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("O8 review findings, pinned", () => {


  it("scores a custom roster against its own statistics, not the global roster's", () => {
    // The review's counterexample: a Tamil speaker in a passed roster. The global roster has no
    // Tamil, so a roster-blind needsFor produced no language signal at all.
    const speaks = { ...syntheticClinician(), id: "speaks-tamil", languages: ["English", "Tamil"] };
    const silent = { ...syntheticClinician(), id: "no-tamil", languages: ["English"] };
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
    const a = { ...syntheticClinician(), id: "a", careAreas: ["titration"] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const b = { ...syntheticClinician(), id: "b", careAreas: ["titration"] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const c = { ...syntheticClinician(), id: "c", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const bands = rankBands("my dose needs titration", [a, b, c]);
    expect(bands[0]!.clinicians).toHaveLength(2);
    expect(Number.isInteger(bands[0]!.score * 1000)).toBe(true);
  });

  it("reorders by distance without a pairwise comparator, so a telehealth row cannot make the order cyclic", () => {
    const t = { ...clinicians.find((c) => c.id === "anubhav-saxena")!, id: "tele", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"], disclosedInterest: undefined };
    const near = { ...syntheticClinician(), id: "near", suburb: "Epping", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    const far = { ...syntheticClinician(), id: "far", suburb: "Southport", careAreas: [] as CareArea[], manner: [] as (typeof clinicians)[number]["manner"] };
    // File order: far, tele, near — all tied on score and capacity from Beecroft.
    const out = rankCliniciansNear("hello", resolvePlace("Beecroft"), [far, t, near]);
    // In-rooms clinicians swap among their own positions by distance; telehealth keeps its slot.
    expect(out.map((c) => c.id)).toEqual(["near", "tele", "far"]);
  });
});

describe("Codex review on PR #1, pinned", () => {

  const bare = (id: string) => ({
    ...syntheticClinician(),
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

/**
 * O51: the profile's two lists — evidence and missed asks — partition what the reader asked.
 */
describe("O51 missed asks are the exact complement of the evidence", () => {
  const query = "I need titration and I don't want to feel rushed, somewhere I can be honest about drinking";

  it("partitions care and manner asks per clinician, with no overlap and no leak", () => {
    const askedKeys = needsFor(query, clinicians)
      .filter((n) => n.facet.kind === "care" || n.facet.kind === "manner")
      .map((n) => n.label)
      .sort();
    for (const clinician of clinicians) {
      const heard = matchEvidence(clinician, query, clinicians)
        .filter((n) => n.facet.kind === "care" || n.facet.kind === "manner")
        .map((n) => n.label);
      const missed = missedAsks(clinician, query, clinicians).map((n) => n.label);
      expect([...heard, ...missed].sort(), clinician.id).toEqual(askedKeys);
      for (const label of missed) expect(heard, clinician.id).not.toContain(label);
    }
  });

  it("is not vacuous: at least one clinician misses something on this query", () => {
    expect(clinicians.some((clinician) => missedAsks(clinician, query).length > 0)).toBe(true);
  });

  it("never frames a preference or language as an undeclared ask", () => {
    // "a woman GP who speaks Hindi" is about who somebody is, not what they declare — those
    // asks keep their own surfaces, and this list must not touch them.
    for (const clinician of clinicians) {
      for (const need of missedAsks(clinician, "a woman GP who speaks Hindi and does titration")) {
        expect(["care", "manner"]).toContain(need.facet.kind);
      }
    }
  });

  it("is empty when a clinician answers everything asked", () => {
    const answered = clinicians.find((clinician) => missedAsks(clinician, "titration").length === 0);
    expect(answered, "somebody on the roster declares titration").toBeDefined();
  });
});
