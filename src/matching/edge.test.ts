// O9: the pipeline held against inputs nobody designs for.
//
// Everything upstream tests the finder on sentences a person would plausibly write. This file
// tests what actually arrives at a public text box: emoji, other scripts, pasted junk, pipes,
// ten thousand words, markup, the same ask fifty times — and the degenerate rosters (empty,
// one entry, everything closed, nothing locatable) that refactors silently assume away. The
// bar everywhere is the same: no crash, deterministic output, nothing echoed back that is not
// in the closed vocabulary, and every stated ordering guarantee holding at the edge.

import { describe, expect, it } from "vitest";
import {
  clinicians,
  matchEvidence,
  matchQuality,
  needsFor,
  rankBands,
  rankClinicians,
  rankCliniciansNear,
  scoreAgainst,
  topTieNote,
  unservedAsks,
  getPersonalizedMatch,
} from "@/demo/clinicians";
import { NEED_LABELS, facetKey, readNeeds } from "./needs";
import { clarifiers } from "./clarify";
import { matchSlots } from "./match";
import { resolvePlace } from "@/geo/suburbs";
import type { CareArea } from "@/demo/care-archetypes";

const JUNK: readonly string[] = [
  "",
  "   \n\t  ",
  "....!!!???;;;",
  "|||| | |",
  "😞💊🧠 help me 🙏",
  "मुझे मदद चाहिए, मेरा ध्यान नहीं लगता",
  "café résumé naïve coöperate",
  "<script>alert(1)</script>",
  "' OR 1=1 --",
  "{{constructor.constructor('return 1')()}}",
  "a".repeat(5000),
  "titration ".repeat(200),
  "TITRATION AND A LONGER FIRST APPOINTMENT",
  "don’t rush me, i don't want to be rushed",
  "null undefined NaN Infinity __proto__ toString",
];

describe("O9 hostile and accidental input", () => {
  it.each(JUNK.map((q) => [q.slice(0, 40) || "(empty)", q]))("survives %s", (_label, query) => {
    // The whole pipeline, twice, compared: no crash, and deterministic to the byte.
    const run = () => ({
      needs: needsFor(query),
      ranked: rankClinicians(query).map((c) => c.id),
      bands: rankBands(query).map((b) => [b.score, b.clinicians.map((c) => c.id)]),
      quality: matchQuality(query),
      note: topTieNote(query),
      unserved: unservedAsks(query),
      questions: clarifiers(query, clinicians, 20).map((c) => c.facetKey),
      evidence: clinicians.map((c) => matchEvidence(c, query).map((n) => n.label)),
    });
    expect(run()).toEqual(run());
  });

  it("never says anything back that is not in the closed vocabulary, whatever comes in", () => {
    const allowed = new Set<string>(NEED_LABELS);
    for (const query of JUNK) {
      for (const clinician of clinicians) {
        for (const need of matchEvidence(clinician, query)) {
          expect(allowed.has(need.label) || /-speaking$/.test(need.label), `${need.label}`).toBe(true);
        }
        // The reason sentence is composed from labels and fixed copy — a pasted script tag or
        // template string must never travel through it.
        const { reason } = getPersonalizedMatch(clinician, query);
        expect(reason).not.toContain("<script>");
        expect(reason).not.toContain("{{");
      }
    }
  });

  it("reads markup-wrapped asks as their words, not their markup", () => {
    const needs = readNeeds("<b>titration</b> and my dose is wearing off");
    expect(needs.some((n) => facetKey(n.facet) === "care:titration")).toBe(true);
  });

  it("counts an ask once however many times it is pasted", () => {
    const once = needsFor("my dose needs titration");
    const fifty = needsFor(`my dose needs titration. ${"titration ".repeat(50)}`);
    const key = "care:titration";
    expect(fifty.filter((n) => facetKey(n.facet) === key)).toHaveLength(1);
    expect(fifty.find((n) => facetKey(n.facet) === key)!.weight).toBe(
      once.find((n) => facetKey(n.facet) === key)!.weight,
    );
  });

  it("reads shouted asks the same as lower-case ones", () => {
    expect(needsFor("TITRATION AND A LONGER FIRST APPOINTMENT").map((n) => facetKey(n.facet))).toEqual(
      needsFor("titration and a longer first appointment").map((n) => facetKey(n.facet)),
    );
  });

  it("treats both apostrophes alike in the one negator that matters", () => {
    const straight = readNeeds("i don't want just medication, alternatives please");
    const typographic = readNeeds("i don’t want just medication, alternatives please");
    expect(straight.map((n) => n.label)).toEqual(typographic.map((n) => n.label));
  });

  it("applies the stated-importance lift once, not per occurrence", () => {
    const answer = "I want the first appointment by phone";
    const once = needsFor(`hello, ${answer}`);
    const twice = needsFor(`hello, ${answer}, ${answer}`);
    const key = "pref:telehealth-first";
    expect(twice.find((n) => facetKey(n.facet) === key)!.weight).toBe(
      once.find((n) => facetKey(n.facet) === key)!.weight,
    );
  });

  it("handles a ten-thousand-word essay without falling over — by reading its opening (O55)", () => {
    // REWRITTEN WITH THE CONTRACT, deliberately. This pin used to plant the ask at the END of
    // the essay and require it heard, which quietly demanded the reader scale with whatever
    // arrived. The year plan's budget (Q2 item 6) chose the other side of that trade: the
    // reader is input-capped so no request can stall the finder, and a request beyond any
    // good-faith length is read as its opening. Both directions of the new contract are
    // pinned: the same monster essay still crashes nothing and ranks everybody, an ask in its
    // OPENING is heard, and an ask planted past the cap is honestly not.
    const filler = "my life story continues here and ".repeat(1500);
    const askFirst = `my dose needs titration. ${filler}`;
    expect(needsFor(askFirst).some((n) => facetKey(n.facet) === "care:titration")).toBe(true);
    expect(rankClinicians(askFirst)).toHaveLength(clinicians.length);

    const askLast = `${filler} my dose needs titration`;
    expect(needsFor(askLast).some((n) => facetKey(n.facet) === "care:titration")).toBe(false);
    expect(rankClinicians(askLast)).toHaveLength(clinicians.length);
  });
});

describe("O9 degenerate rosters", () => {
  const yadav = () => clinicians.find((c) => c.id === "tushar-yadav")!;
  const bare = (id: string) => ({
    ...yadav(),
    id,
    careAreas: [] as CareArea[],
    manner: [] as (typeof clinicians)[number]["manner"],
  });

  it("an empty roster returns empty everything and crashes nothing", () => {
    expect(rankClinicians("titration", [])).toEqual([]);
    expect(rankBands("titration", [])).toEqual([]);
    expect(topTieNote("titration", [])).toBeNull();
    expect(clarifiers("titration", [], 5)).toEqual([]);
    expect(() => matchQuality("titration", [])).not.toThrow();
    expect(needsFor("titration", [])).toEqual(
      needsFor("titration", []).map((n) => ({ ...n, weight: n.weight })),
    );
  });

  it("a roster of one is a listing, not a ranking", () => {
    const solo = [bare("only")];
    expect(rankClinicians("titration", solo).map((c) => c.id)).toEqual(["only"]);
    expect(rankBands("titration", solo)).toHaveLength(1);
    expect(clarifiers("titration", solo, 5)).toEqual([]);
    expect(topTieNote("titration", solo)).toBeNull();
  });

  it("a roster where every book is closed keeps its fit order", () => {
    const closed = [
      { ...bare("a"), careAreas: ["titration"] as CareArea[], acceptingNewPatients: false },
      { ...bare("b"), acceptingNewPatients: false },
    ];
    expect(rankClinicians("my dose needs titration", closed)[0]!.id).toBe("a");
  });

  it("a roster nobody can locate keeps its fit order under a distance sort", () => {
    const lost = [
      { ...bare("first"), suburb: "Nowhereville" },
      { ...bare("second"), suburb: "Atlantis" },
    ];
    const near = rankCliniciansNear("hello", resolvePlace("Beecroft"), lost);
    expect(near.map((c) => c.id)).toEqual(["first", "second"]);
  });

  it("an all-telehealth roster ignores the origin entirely", () => {
    const phones = [
      { ...bare("x"), telehealthFirstAppointment: true as const },
      { ...bare("y"), telehealthFirstAppointment: true as const },
    ];
    expect(rankCliniciansNear("hello", resolvePlace("Beecroft"), phones).map((c) => c.id)).toEqual([
      "x",
      "y",
    ]);
  });

  it("a clinician who declares nothing at all still renders, at the bottom", () => {
    const roster = [bare("empty"), { ...bare("full"), careAreas: ["titration"] as CareArea[] }];
    const ranked = rankClinicians("my dose needs titration", roster);
    expect(ranked.map((c) => c.id)).toEqual(["full", "empty"]);
    expect(scoreAgainst(ranked[1]!, needsFor("my dose needs titration", roster))).toBe(0);
  });
});

describe("O9 slot-matcher degenerate inputs", () => {
  it("zero candidates and zero slots produce an empty, valid plan", () => {
    expect(matchSlots([], [])).toEqual([]);
  });

  it("availability naming a slot that does not exist reads as no availability", () => {
    const decisions = matchSlots(
      [{ candidateRef: "c1", practiceId: "p1", availableSlotIds: ["ghost"], outstandingOffers: 0 }],
      [{ slotId: "real", practiceId: "p1", startsAt: "2026-09-01T00:00:00Z" }],
    );
    expect(decisions[0]!.reason).toBe("no_offered_slot_within_recorded_availability");
  });

  it("duplicate slot ids in recorded availability cannot double-book", () => {
    const decisions = matchSlots(
      [
        { candidateRef: "c1", practiceId: "p1", availableSlotIds: ["s1", "s1", "s1"], outstandingOffers: 0 },
        { candidateRef: "c2", practiceId: "p1", availableSlotIds: ["s1"], outstandingOffers: 0 },
      ],
      [{ slotId: "s1", practiceId: "p1", startsAt: "2026-09-01T00:00:00Z" }],
    );
    expect(decisions.filter((d) => d.slotId === "s1")).toHaveLength(1);
  });
});
