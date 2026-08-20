// W221: the clinician background a reviewer works on, and the metrics behind a match.
//
// THE THREE THINGS THIS FILE HOLDS, and why they are one file: they are three views of the same
// object, and separating them would let them disagree.
//
//   1. `ClinicianBackground` — the reviewable state between a transcript and a profile. Facets
//      that are PROPOSED, ACCEPTED or REJECTED, each with the clinician's own sentence.
//   2. `matchAudit` — what actually happened in a match, for the console. Which facets the reader
//      reached, which the clinician declared, which overlapped, and what each was worth.
//   3. `professionalBio` — the bio, ASSEMBLED rather than written. See below.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE BIO IS ASSEMBLED FROM DECLARED FACETS AND IS NOT A FREE-TEXT FIELD. THIS IS THE WHOLE
// DESIGN AND IT IS THE THING MOST LIKELY TO BE UNDONE BY SOMEBODY WHO HAS NOT READ W183.
//
// `src/directory/profile.ts` refuses `bio` outright: "a free-text biography is where every refusal
// above reappears in prose. It is the field nobody can lint meaningfully and everybody wants."
// Ratings, comparisons, superlatives and specialty claims all come back the moment there is a
// paragraph to put them in.
//
// A console that offers a clinician a text box labelled "your professional bio" would reintroduce
// exactly that field, through the back door, at the exact moment the clinician most wants to sell
// themselves. So the bio here is GENERATED from the facets they declared, and the editable surface
// is the FACETS — tick, untick, correct. The clinician edits what is true about them; the sentence
// follows. They can see the sentence, and they must confirm it, and they cannot type into it.
//
// That is a real constraint on expression and it is worth stating what it costs: a GP cannot write
// "I have a particular interest in adult women who were missed at school" in their own voice. They
// can declare the facet that says it, and the assembled sentence says it in the product's voice.
// The trade is that no clinician's page can carry an unlinted claim, which is the thing that would
// end this product if it went wrong once beside a registration number.

import { EI_QUALITIES, type EIQuality } from "@/demo/emotional-fit";
import type { CareArea } from "@/demo/care-archetypes";
import type { CapacityGrade, Clinician } from "@/demo/clinicians";
import { capacityGrade, matchEvidence, needsFor, roundScore } from "@/demo/clinicians";
import { facetKey } from "@/matching/needs";
import type { Frequency } from "./interview";
import { CARE_LABEL_BY_AREA, type ProposedFacet } from "./transcript";

/** Where a proposed facet has got to. Nothing reaches a profile without passing through here. */
export type FacetStatus = "proposed" | "accepted" | "rejected";

export type BackgroundFacet = {
  key: string;
  kind: "care" | "manner";
  label: string;
  /** The clinician's own words. Absent only for a facet a reviewer added by hand. */
  quote?: string;
  /** The cue that reached it, so a reviewer can see WHY it was proposed, not just that it was. */
  cue?: string;
  status: FacetStatus;
  /**
   * Set when a human changed the status.
   *
   * A facet that reads `accepted` with nobody named is one the machine accepted, which must never
   * happen — so the console shows the name, and its absence on an accepted facet is a bug that is
   * visible rather than silent.
   */
  decidedBy?: string;
  /**
   * The clinician's own answer at confirm time — often / sometimes / not-me (O30).
   *
   * The interview refuses tickboxes because three states carry information a boolean throws away
   * (interview.ts's header), so the record keeps what was SAID, not just whether the facet
   * survived review: "sometimes" and "often" both read `accepted`, and collapsing them at the
   * moment of capture would rebuild the tickbox one layer down. Absent on a facet decided by a
   * reviewer working from the transcript alone rather than from the clinician's spoken answer.
   */
  frequency?: Frequency;
};

export type ClinicianBackground = {
  clinicianId: string;
  displayName: string;
  facets: BackgroundFacet[];
  /** Transcript sentences the vocabulary could not read. The lexicon's to-do list. */
  unread: string[];
  /**
   * Sentences the PATIENT'S reader heard nothing in (W227's `reachGaps`), kept per onboarding
   * since O38 so the reach-gap feed is a record rather than a live panel that evaporates with
   * the tab. `unread` is what the CLINICIAN vocabulary missed; this is what a patient's own
   * words could not reach — each entry a candidate O13 caught at onboarding instead of in
   * production. Optional because rows saved before O38 do not carry it, and absence must stay
   * distinguishable from "read everything".
   */
  patientSilent?: string[];
  /** True once the clinician has seen the assembled bio and said it is them. */
  readBackConfirmed: boolean;
};

/** Turn a transcript's proposals into a reviewable background. Everything starts `proposed`. */
export function backgroundFromProposals(
  clinicianId: string,
  displayName: string,
  proposals: readonly ProposedFacet[],
  unread: readonly string[],
): ClinicianBackground {
  return {
    clinicianId,
    displayName,
    unread: [...unread],
    readBackConfirmed: false,
    facets: proposals.map((proposal) => ({
      key: proposal.kind === "care" ? `care:${proposal.area}` : `manner:${proposal.trait}`,
      kind: proposal.kind,
      label: proposal.label,
      quote: proposal.quote,
      cue: proposal.cue,
      status: "proposed" as const,
    })),
  };
}

/**
 * The assembled professional bio.
 *
 * ONLY ACCEPTED FACETS. A proposal is a machine's reading of a sentence and has no business in
 * anything a patient sees; the whole point of the review step is that somebody stood between the
 * two. If nothing is accepted the bio is empty rather than optimistic, because an empty profile is
 * an honest one and a padded profile is a claim.
 */
export function professionalBio(background: ClinicianBackground): string {
  const accepted = background.facets.filter((facet) => facet.status === "accepted");
  const care = accepted.filter((facet) => facet.kind === "care").map((facet) => facet.label.toLowerCase());
  const manner = accepted.filter((facet) => facet.kind === "manner").map((facet) => facet.label.toLowerCase());
  if (care.length === 0 && manner.length === 0) return "";

  const sentences: string[] = [];
  /* "says they often SEE X" only reads for the labels that name a group of people — "sees adults",
     "sees children". Half the vocabulary names a procedure, and "says they often see baseline
     physical screening" is not a sentence. "Lists ... as areas they see often" is grammatical
     across the whole vocabulary and keeps the declaration posture in the verb. */
  if (care.length > 0) {
    /* Singular and plural, because a bio that reads "lists assessment as areas they see often" is
       a sentence nobody wrote and everybody notices. The assembled-bio design means the product
       owns this grammar; a free-text field would have made it the clinician's problem, which is
       one of the small costs of the trade and worth paying properly rather than ignoring. */
    const noun = care.length === 1 ? "an area" : "areas";
    sentences.push(`${background.displayName} lists ${asList(care)} as ${noun} they say they see often.`);
  }
  if (manner.length > 0) sentences.push(`On how they work, they describe themselves as: ${asList(manner)}.`);
  /* "Says they" and "on how they work" are load-bearing. W193's rule is that a declaration is
     rendered AS a declaration, and the difference between "Dr X sees adults" and "Dr X says they
     often see adults" is the difference between this product vouching for a clinician and this
     product reporting them. It has never checked, and the sentence must not imply it has. */
  return sentences.join(" ");
}

function asList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * WHAT HAPPENED IN A MATCH, for the console.
 *
 * The finder tells a patient one sentence. This is the rest of it, for whoever has to answer
 * "why was he first" a month later — which today would mean reading the lexicon and doing the
 * arithmetic by hand.
 *
 * IT REPORTS, IT DOES NOT DECIDE. Every number here is read back out of the same functions the
 * finder uses. If this file computed a score of its own it would eventually disagree with the
 * ranking, and a metrics panel that disagrees with the product is worse than no panel.
 */
export type MatchAudit = {
  query: string;
  /** Facets the reader's words reached, whether or not anybody answers them. Weights carry the
   *  O2 rarity discount, so a facet the whole roster declares shows what it can actually earn. */
  /**
   * What the reader asked for, and — O126 — the phrase from their OWN WORDS that reached it.
   *
   * `matched` is the same field the patient profile renders as "from your words: …" (O21). It
   * was computed here all along and dropped on the way out, so a doctor reading their own
   * listing could see "A woman GP (+30)" with no way to learn it came from somebody typing
   * "woman gp". That is the half W190's correction path needs: a doctor who thinks a reason is
   * wrong cannot contest it without seeing what produced it.
   */
  asked: Array<{ key: string; label: string; weight: number; matched: string }>;
  rows: Array<{
    clinicianId: string;
    name: string;
    total: number;
    /** The asked facets this clinician declared, with what each ACTUALLY contributed for them
     *  (halved where the declaration was "sometimes"). */
    matched: Array<{ key: string; label: string; weight: number }>;
    /** The asked facets this clinician does NOT declare. The reason they are not first. */
    missed: Array<{ key: string; label: string; weight: number }>;
    /** Declaration breadth, so inflation is visible where it is priced (O2/F1):
     *  "declares 15 of 17 areas" is a sentence a reviewer can act on. */
    declares: { often: number; sometimes: number; of: number };
    /** Capacity breaks score ties in the finder (O4, three grades since O56), so the audit
     *  must carry the GRADE or its sort disagrees with the ranking it claims to reproduce
     *  (Codex review on PR #1; the boolean stopped being the tie-break in O56). */
    capacity: CapacityGrade;
  }>;
};

export function matchAudit(query: string, roster: readonly Clinician[], today: Date = new Date()): MatchAudit {
  // The same needs the ranking scores — including asked-for languages — so the audit cannot
  // show a total the finder did not compute (the O1/F2 unity repair). Computed over the roster
  // being audited, for the same reason the ranking is (O8 review).
  const needs = needsFor(query, roster);
  const asked = needs.map((need) => ({ key: facetKey(need.facet), label: need.label, weight: need.weight, matched: need.matched }));

  return {
    query,
    asked,
    rows: roster.map((clinician) => {
      const evidence = matchEvidence(clinician, query, roster);
      const earned = new Map(evidence.map((need) => [facetKey(need.facet), need.weight]));
      const matched = asked
        .filter((entry) => earned.has(entry.key))
        .map((entry) => ({ ...entry, weight: earned.get(entry.key)! }));
      // An area listed under both "often" and "sometimes" is one declaration, not two —
      // declarationFactor already reads it as "often", and a breadth column that could show
      // "18 of 17" would undermine the inflation-visibility it exists for (O8 review).
      const often = new Set(clinician.careAreas);
      const sometimesOnly = (clinician.careAreasSometimes ?? []).filter((area) => !often.has(area));
      return {
        clinicianId: clinician.id,
        name: clinician.name,
        total: roundScore(matched.reduce((sum, entry) => sum + entry.weight, 0)),
        matched,
        missed: asked.filter((entry) => !earned.has(entry.key)),
        declares: {
          often: often.size,
          sometimes: sometimesOnly.length,
          of: CARE_LABEL_BY_AREA.size,
        },
        capacity: capacityGrade(clinician, today),
      };
    }),
  };
}

/** Every tag a clinician carries, for the console's tag view. Declared facets, nothing inferred. */
export function clinicianTags(clinician: Clinician): Array<{ kind: "care" | "manner"; key: string; label: string }> {
  return [
    ...clinician.careAreas.map((area: CareArea) => ({
      kind: "care" as const,
      key: `care:${area}`,
      label: CARE_LABEL_BY_AREA.get(area) ?? area,
    })),
    ...clinician.manner.map((trait: EIQuality) => ({
      kind: "manner" as const,
      key: `manner:${trait}`,
      label: EI_QUALITIES[trait].label,
    })),
  ];
}
