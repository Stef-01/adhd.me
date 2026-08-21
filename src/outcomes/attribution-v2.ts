// W219: intervention attribution v2, over the response graph — and the first honest thing this
// module has to say is that the response graph cannot carry an attribution.
//
// THE GRAPH HOLDS ONE ARM, BY CONSTRUCTION. W212 builds its edges from `interventionsFromSim`,
// which reads every `invitation_sent` off the spine. A holdout patient is never invited — W12's
// harness lists "holdout patient received an invitation" among the violations it refuses to
// produce — so a holdout patient generates no intervention, appears in no chain, and is absent
// from every edge. The graph is therefore a picture of the invited arm alone, and the comparator
// W215 requires is not anywhere inside it.
//
// WHICH MATTERS BECAUSE THE EDGES READ LIKE AN EFFECT. "invitation_offered → appointment_booked:
// 1,552 of 1,552" is a within-arm response rate: it counts what the messaged group did, against
// itself. A practice reading it will hear "the messages produced 1,552 appointments", and the
// difference between those two sentences is every patient who would have booked anyway. W9 calls
// that displacement and refuses to report the naive figure as impact; the same refusal has to
// hold here, or v2 becomes the surface where the naive count comes back wearing a graph.
//
// SO THE SIGNATURE IS THE REFUSAL. `attributeByKind` cannot be called with a graph alone: it
// takes W215's `CounterfactualResult` as well, because the only claimable figure in this product
// comes from the observed holdout arm and this module is not allowed to compute one. There is no
// comparator parameter here for the same reason W215 has none — the second comparator is the
// whole risk, and it is declared in one place.
//
// AND THE APPORTIONMENT QUESTION IS REFUSED RATHER THAN SOLVED. One practice-wide holdout arm
// yields one incremental figure. With a single observed intervention kind that figure belongs
// wholly to that kind and no arithmetic is needed — which is the case the synthetic loop is in,
// since it performs invitations and nothing else. With two or more observed kinds it would have
// to be SPLIT between them, and every split is a guess: proportional-to-volume assumes the kinds
// are equally effective, proportional-to-response-rate assumes the responses are comparable, and
// a practice reads either as a measurement. This is the exact shape a "v2" is tempted to invent,
// so the refusal is a declared value with a sentence, not an omission.
//
// RATES ARE STILL REPORTED WHEN THE CLAIM IS WITHHELD. W72 and W215's shape: counts are recorded
// facts and a withheld claim is not a zero and not a gap. Every rate ships with
// `RESPONSE_RATE_CAVEAT` attached to the value rather than printed near it, so a caller cannot
// render the number without the sentence that says what it is not.
//
// NOTHING PER PATIENT. "Did the message work for Mrs Nguyen" is unanswerable and is the input to
// a triage. No function here takes a patient — asserted on the namespace and on every exported
// signature, since `estimateFor(patient)` passes a name check.

import type { CounterfactualBasis, CounterfactualRefusal, CounterfactualResult } from "./counterfactual";
import type { InterventionKind } from "./response";
import type { RecordedBasis } from "@/reporting/model";
import type { ResponseGraph } from "./response-graph";

export const ATTRIBUTION_V2_VERSION = "v2";

/**
 * Why a per-kind causal claim is withheld.
 *
 * Note what is NOT in this union: "the graph has no comparator". That is not a runtime condition
 * to be detected — it is always true, and it is why `attributeByKind` requires a counterfactual
 * in its signature. A permanent fact enforced by a type does not belong in a list of reasons.
 */
export type KindClaimRefusal =
  /** W215 refused the practice-wide figure, so there is nothing to attribute to any kind. */
  | "counterfactual_withheld"
  /** More than one intervention kind was performed against a single practice-wide holdout arm. */
  | "kinds_share_one_comparator"
  /**
   * No intervention kind survived to be attributed to.
   *
   * FOUND BY W220, not by this module's own tests, which only ever fed it the sim's graph or a
   * fixture with a kind in it. W218's disclosure floor can withhold every kind of a small graph,
   * leaving a graph with no rates — and a claimable practice-wide figure with nowhere to put it.
   * The first version read `rates[0]!` and threw on the non-null assertion; a crash is the good
   * outcome of that bug and the bad one is the figure being attributed to whatever kind happened
   * to be first. There is nothing to attribute a figure to, so the claim is refused.
   */
  | "no_kind_to_attribute";

export const ALL_KIND_CLAIM_REFUSALS: readonly KindClaimRefusal[] = [
  "counterfactual_withheld",
  "kinds_share_one_comparator",
  "no_kind_to_attribute",
];

export const KIND_CLAIM_WITHHELD_COPY: Record<KindClaimRefusal, string> = {
  counterfactual_withheld:
    "The practice-wide impact figure is withheld, so there is nothing to attribute to any one kind of message. The counts below are still what was recorded.",
  no_kind_to_attribute:
    "There is no kind of message left to attribute a figure to. Either nothing was sent, or every group of answers was too small to show — and a practice-wide figure with nothing to attach it to would be a claim about a rail this page cannot show you.",
  kinds_share_one_comparator:
    "More than one kind of message went out, and there is only one comparison group covering all of them. Splitting one figure between several kinds would mean assuming how much each contributed, which is a guess rather than a measurement, so the split is not offered. The counts for each kind are below.",
};

/**
 * The sentence that rides every response rate.
 *
 * Attached to the value, not left to the surface. A response rate is the messaged group measured
 * against itself; the number is real and the effect it suggests is not in it.
 */
export const RESPONSE_RATE_CAVEAT =
  "These are response rates: how often each kind of message was answered by the people who received one. They are counted within the messaged group only, so they do not say what would have happened without the message — the comparison group is the only thing that can say that, and it is reported separately.";

/** What one kind of intervention was answered with, counted within the messaged group. */
export interface KindResponseRate {
  kind: InterventionKind;
  /** Interventions of this kind performed in the period. */
  offered: number;
  /** How many had nothing at all recorded against them. W211's `not_recorded`, never "no". */
  unanswered: number;
  /**
   * How many drew at least one recorded response.
   *
   * Deliberately not a sum of edge counts: one intervention can be answered more than once, and a
   * numerator that double-counts a person produces a rate above what actually happened.
   */
  answeredAtLeastOnce: number;
  /** `answeredAtLeastOnce` per 1000 offered. Normalised so kinds of different size compare. */
  answeredPer1000: number;
  /** Raw link counts per response kind. Counts, not rates — these can double-count and say so. */
  linksByResponseKind: Readonly<Record<string, number>>;
  /** W196: the number is not readable without this. */
  basis: RecordedBasis;
  caveat: typeof RESPONSE_RATE_CAVEAT;
}

/** The claimable figure, when exactly one kind was performed and W215 allowed a claim. */
export interface KindAttribution {
  kind: InterventionKind;
  /**
   * The whole practice-wide incremental figure, because this kind is the only one performed.
   *
   * Not apportioned, not scaled and not modelled: the number is W215's, carried through
   * unchanged. If a second kind ever appears, this field does not get shared out — the claim is
   * withheld instead.
   */
  incrementalAttended: number;
  /** W215's basis, carried rather than restated, so the two cannot disagree. */
  counterfactualBasis: CounterfactualBasis;
}

export type AttributionV2Result =
  | {
      version: typeof ATTRIBUTION_V2_VERSION;
      claimed: true;
      perKind: readonly KindAttribution[];
      rates: readonly KindResponseRate[];
    }
  | {
      version: typeof ATTRIBUTION_V2_VERSION;
      claimed: false;
      /** Every reason, not the first. */
      withheld: readonly KindClaimRefusal[];
      /** W215's own reasons when it refused, carried through rather than summarised away. */
      counterfactualWithheld: readonly CounterfactualRefusal[];
      rates: readonly KindResponseRate[];
    };

/**
 * The response rates a graph holds, per intervention kind.
 *
 * Always available, claim or no claim. `offered` is read off the basis W212 already stamps on
 * every edge and every unanswered node — the per-kind denominator — rather than recounted here,
 * so this cannot disagree with the graph it describes.
 */
export function responseRates(graph: ResponseGraph): readonly KindResponseRate[] {
  const offered = new Map<InterventionKind, number>();
  const basisOf = new Map<InterventionKind, RecordedBasis>();
  const links = new Map<InterventionKind, Record<string, number>>();

  for (const edge of graph.edges) {
    offered.set(edge.from, edge.basis.recordedFacts);
    basisOf.set(edge.from, edge.basis);
    const byKind = links.get(edge.from) ?? {};
    byKind[edge.to] = (byKind[edge.to] ?? 0) + edge.count;
    links.set(edge.from, byKind);
  }
  for (const node of graph.unanswered) {
    offered.set(node.kind, node.basis.recordedFacts);
    basisOf.set(node.kind, node.basis);
  }

  const unansweredOf = new Map<InterventionKind, number>();
  for (const node of graph.unanswered) unansweredOf.set(node.kind, node.count);

  const out: KindResponseRate[] = [];
  for (const [kind, total] of offered) {
    const unanswered = unansweredOf.get(kind) ?? 0;
    const answeredAtLeastOnce = total - unanswered;
    out.push({
      kind,
      offered: total,
      unanswered,
      answeredAtLeastOnce,
      answeredPer1000: total === 0 ? 0 : (answeredAtLeastOnce / total) * 1000,
      linksByResponseKind: links.get(kind) ?? {},
      basis: basisOf.get(kind)!,
      caveat: RESPONSE_RATE_CAVEAT,
    });
  }
  return out.sort((a, b) => a.kind.localeCompare(b.kind));
}

/**
 * Attribution per intervention kind, or the reason there is none.
 *
 * Takes the counterfactual as an argument rather than computing one. That is the whole design:
 * this module can see how each kind was answered and cannot see what would have happened without
 * it, and a signature that admits the second half is the only thing stopping the first half from
 * being presented as an effect.
 */
export function attributeByKind(
  graph: ResponseGraph,
  counterfactual: CounterfactualResult,
): AttributionV2Result {
  const rates = responseRates(graph);
  const withheld: KindClaimRefusal[] = [];

  if (!counterfactual.claimed) withheld.push("counterfactual_withheld");
  if (rates.length === 0) withheld.push("no_kind_to_attribute");
  if (rates.length > 1) withheld.push("kinds_share_one_comparator");

  // Both reasons when both apply — a caller shown one of two is shown half the refusal. Split in
  // two returns rather than one, because narrowing `counterfactual` is what makes the figure below
  // reachable at all.
  if (!counterfactual.claimed) {
    return {
      version: ATTRIBUTION_V2_VERSION,
      claimed: false,
      withheld,
      counterfactualWithheld: counterfactual.withheld,
      rates,
    };
  }
  if (withheld.length > 0) {
    return { version: ATTRIBUTION_V2_VERSION, claimed: false, withheld, counterfactualWithheld: [], rates };
  }

  // Exactly one observed kind and a claimable practice-wide figure. The figure is carried, not
  // divided — there is nothing to divide it between. Read without a non-null assertion: the empty
  // case is a refusal above, and an assertion here is what hid it in the first place.
  const only = rates[0];
  if (only === undefined) {
    return {
      version: ATTRIBUTION_V2_VERSION,
      claimed: false,
      withheld: ["no_kind_to_attribute"],
      counterfactualWithheld: [],
      rates,
    };
  }
  return {
    version: ATTRIBUTION_V2_VERSION,
    claimed: true,
    perKind: [
      {
        kind: only.kind,
        incrementalAttended: counterfactual.figure.difference,
        counterfactualBasis: counterfactual.figure.basis,
      },
    ],
    rates,
  };
}

/**
 * The sentence to render when the per-kind claim is withheld.
 *
 * Exported so every surface says the same thing, and so a withheld claim cannot be rendered as a
 * zero — the defect W215 found live on the incrementality dashboard.
 */
export function kindWithheldCopy(result: AttributionV2Result): string | null {
  if (result.claimed) return null;
  return result.withheld.map((reason) => KIND_CLAIM_WITHHELD_COPY[reason]).join(" ");
}

/**
 * PROPOSED FOR NOBODY — nothing ships.
 *
 * W212's posture, inherited: the only graphs that exist come from the simulation, so the only
 * attributions that could exist do too.
 */
export const SHIPPED_KIND_ATTRIBUTIONS: readonly AttributionV2Result[] = [];
