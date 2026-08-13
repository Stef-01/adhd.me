// W212: the response graph, over the synthetic loop and nothing else.
//
// W211 settled when "this happened because of that" may be said about one intervention. This
// builds the aggregate a practice would actually read — how each kind of thing the product does
// was answered — and the only source it can be built from is W12's simulation.
//
// ZERO REAL INTERVENTIONS, BY CONSTRUCTION RATHER THAN BY POLICY. `interventionsFromSim` takes a
// `SimResult` and there is no other producer of an `Intervention` in this module; `provenance` is
// a union of one member. Nothing has ever been sent to a real patient — G1, G2 and G3 are all
// unresolved and W174 is still blocked — so a real intervention does not exist anywhere in this
// tree, and the graph is built so that it could not consume one if it did.
//
// EVERY EDGE STATES WHAT IT WAS COUNTED OVER. W196's rule, and it bites harder here than in
// reporting: "reminders are answered 20% of the time" is a sentence about people, and the honest
// version needs the denominator, the period, and the rail it came from attached to the number
// rather than remembered beside it. So an edge carries a `RecordedBasis` and a graph over nothing
// is a REFUSAL, not an empty graph — the same argument W196 makes about zero.
//
// AN UNANSWERED INTERVENTION IS NOT A NEGATIVE RESULT. It is the largest category in the sim and
// it will be the largest category on a young rail. It is kept out of the edges entirely, so no
// denominator can quietly acquire it, and rendered with W211's `RESPONSE_ABSENCE_COPY`.
//
// AND A KIND THE SIM NEVER PRODUCED IS NOT A ZERO. Three of the four declared intervention kinds
// never occur in the sim — it models invitations, not referrals or education — and a graph that
// showed them as edges of weight zero would be describing a referral rail that answered nobody.
// They are listed as UNOBSERVED, with the reason, which is the distinction W179 drew between
// nothing happened and nothing arrived.
//
// THE SPINE-TO-RESPONSE MAPPING IS DECLARED DATA, CHECKED BOTH WAYS. The event spine (W10) names
// its events for the rail that emits them — `invitation_booked` — and W211 names response kinds
// for what they mean — `appointment_booked`. Something has to translate, and a translation buried
// in a `switch` is a translation nobody audits: the test checks that every spine kind that
// constitutes a response is mapped, and that every mapping targets a kind W211 actually declares.

import type { RecordedBasis } from "@/reporting/model";
import type { SimResult } from "@/sim/harness";
import type { RecordedEvent } from "./model";
import {
  ALL_INTERVENTION_KINDS,
  RESPONSE_ABSENCE_COPY,
  RESPONSE_KINDS,
  type Intervention,
  type InterventionKind,
  type LinkOrdering,
  type ResponseVerdict,
  responseState,
} from "./response";

/** Where a graph's interventions came from. One member, deliberately. */
export type GraphProvenance = "synthetic_sim";

/**
 * Spine event kind → the response kind it constitutes.
 *
 * Declared rather than switched on. The spine names events after the rail that emits them and
 * W211 names them after what they mean; both directions of this map are checked by the test, so a
 * new spine event that answers an offer cannot be silently unlinked.
 */
export const SPINE_RESPONSE_KINDS: Readonly<Record<string, string>> = {
  invitation_booked: "appointment_booked",
  invitation_expired: "invitation_expired",
  invitation_opted_out: "patient_opted_out",
};

/**
 * Spine kinds that are deliberately NOT responses, with the reason.
 *
 * The other half of the map. Without it, "every response kind is mapped" is a claim about the
 * three somebody remembered rather than about the spine.
 */
export const SPINE_NOT_RESPONSES: Readonly<Record<string, string>> = {
  invitation_queued: "The offer being prepared. It precedes the intervention rather than answering it.",
  invitation_sent: "The intervention itself. An intervention is not its own response.",
  patient_opted_out:
    "The patient-level opt-out, which is not attached to any one offer. The per-invitation `invitation_opted_out` is the answer to a specific offer; counting both would double one decision.",
  holdout_assigned: "An arm assignment, made before any offer exists and answering nothing.",
  config_changed: "A practice changing a setting. Not a fact about any patient.",
};

export interface GraphEdge {
  from: InterventionKind;
  /** The declared response kind, in W211's vocabulary. */
  to: string;
  verdict: ResponseVerdict;
  count: number;
  /** How many of those links the clock separated, and how many rest on the record. */
  ordering: Readonly<Record<LinkOrdering, number>>;
  /** W196: the number is not readable without this. */
  basis: RecordedBasis;
}

export interface UnansweredNode {
  kind: InterventionKind;
  /** Interventions of this kind with nothing recorded against them. Never an edge. */
  count: number;
  wouldSettleIt: readonly string[];
  copy: string;
  basis: RecordedBasis;
}

export interface UnobservedKind {
  kind: InterventionKind;
  why: string;
}

export interface ResponseGraph {
  provenance: GraphProvenance;
  basis: RecordedBasis;
  edges: readonly GraphEdge[];
  unanswered: readonly UnansweredNode[];
  unobserved: readonly UnobservedKind[];
}

export type GraphRefusal =
  /** No interventions at all. A graph over nothing is not an empty graph, it is no graph. */
  | "nothing_recorded"
  /** No period, or a period that runs backwards. */
  | "period_missing_or_unreadable";

export type GraphResult =
  | { ok: true; graph: ResponseGraph }
  | { ok: false; errors: GraphRefusal[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The interventions the synthetic loop performed.
 *
 * Every `invitation_sent` on the spine. Takes a `SimResult` and nothing else — the type is the
 * founder gate here, because there is no real-data shape this function would accept.
 */
export function interventionsFromSim(result: SimResult): Intervention[] {
  const out: Intervention[] = [];
  for (const entry of result.log) {
    if (entry.kind !== "invitation_sent") continue;
    out.push({
      interventionId: String(entry.invitationId),
      practiceId: String(result.practice.id),
      chainId: String(entry.invitationId),
      kind: "invitation_offered",
      at: entry.at,
    });
  }
  return out;
}

/**
 * The recorded facts that could answer them, translated through the declared map.
 *
 * A spine event with no mapping is skipped here and accounted for in `SPINE_NOT_RESPONSES`, so
 * "skipped" is a declaration rather than a gap.
 */
export function eventsFromSim(result: SimResult): RecordedEvent[] {
  const out: RecordedEvent[] = [];
  for (const entry of result.log) {
    const mapped = SPINE_RESPONSE_KINDS[entry.kind];
    if (!mapped) continue;
    if (!("invitationId" in entry)) continue;
    out.push({ chainId: String(entry.invitationId), kind: mapped, at: entry.at });
  }
  return out;
}

/**
 * Build the graph, or refuse it.
 *
 * Edges are grouped by (intervention kind, response kind) and emitted in a fixed order, so the
 * result is a value rather than a rendering of iteration order — the property W167's register
 * exists to keep true.
 */
export function buildResponseGraph(
  interventions: readonly Intervention[],
  events: readonly RecordedEvent[],
  period: { fromIso: string; toIso: string },
): GraphResult {
  const errors: GraphRefusal[] = [];
  if (!ISO_DATE.test(period.fromIso) || !ISO_DATE.test(period.toIso) || period.fromIso > period.toIso) {
    errors.push("period_missing_or_unreadable");
  }
  if (interventions.length === 0) errors.push("nothing_recorded");
  if (errors.length > 0) return { ok: false, errors };

  const byChain = new Map<string, RecordedEvent[]>();
  for (const event of events) {
    byChain.set(event.chainId, [...(byChain.get(event.chainId) ?? []), event]);
  }

  const perKind = new Map<InterventionKind, number>();
  const unansweredCount = new Map<InterventionKind, number>();
  const tally = new Map<string, { edge: Omit<GraphEdge, "basis">; }>();

  for (const intervention of interventions) {
    perKind.set(intervention.kind, (perKind.get(intervention.kind) ?? 0) + 1);
    const state = responseState(intervention, byChain.get(intervention.chainId) ?? []);
    if (state.verdict === "not_recorded") {
      unansweredCount.set(intervention.kind, (unansweredCount.get(intervention.kind) ?? 0) + 1);
      continue;
    }
    for (const response of state.responses) {
      const key = `${intervention.kind}::${response.kind}`;
      const existing = tally.get(key);
      if (existing) {
        existing.edge.count += 1;
        existing.edge.ordering = {
          ...existing.edge.ordering,
          [response.ordering]: existing.edge.ordering[response.ordering] + 1,
        };
        continue;
      }
      tally.set(key, {
        edge: {
          from: intervention.kind,
          to: response.kind,
          verdict: response.verdict,
          count: 1,
          ordering: { clock: response.ordering === "clock" ? 1 : 0, recorded_link: response.ordering === "recorded_link" ? 1 : 0 },
        },
      });
    }
  }

  const basisFor = (recordedFacts: number): RecordedBasis => ({
    source: "the event spine (W10), as recorded by the synthetic loop (W12)",
    recordedFacts,
    fromIso: period.fromIso,
    toIso: period.toIso,
  });

  const edges: GraphEdge[] = [...tally.values()]
    .map(({ edge }) => ({ ...edge, basis: basisFor(perKind.get(edge.from) ?? 0) }))
    .sort((a, b) => (a.from === b.from ? a.to.localeCompare(b.to) : a.from.localeCompare(b.from)));

  const unanswered: UnansweredNode[] = [...unansweredCount.entries()]
    .map(([kind, count]) => ({
      kind,
      count,
      wouldSettleIt: [...RESPONSE_KINDS[kind].advances, ...RESPONSE_KINDS[kind].ends],
      copy: RESPONSE_ABSENCE_COPY,
      basis: basisFor(perKind.get(kind) ?? 0),
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));

  const unobserved: UnobservedKind[] = ALL_INTERVENTION_KINDS.filter((kind) => !perKind.has(kind))
    .map((kind) => ({
      kind,
      why: "The synthetic loop does not perform this kind of intervention, so there is nothing to count. This is not a rate of zero.",
    }))
    .sort((a, b) => a.kind.localeCompare(b.kind));

  return {
    ok: true,
    graph: {
      provenance: "synthetic_sim",
      basis: basisFor(interventions.length),
      edges,
      unanswered,
      unobserved,
    },
  };
}

/** The graph as a reader sees it. Golden-tested, so a change to any number is a visible diff. */
export function renderResponseGraph(graph: ResponseGraph): string {
  const lines: string[] = [
    `Response graph — ${graph.provenance}`,
    `Over ${graph.basis.recordedFacts} recorded interventions, ${graph.basis.fromIso} to ${graph.basis.toIso}.`,
    `Source: ${graph.basis.source}.`,
    "",
    "Answered:",
  ];
  for (const edge of graph.edges) {
    lines.push(
      `- ${edge.from} → ${edge.to} (${edge.verdict}): ${edge.count} of ${edge.basis.recordedFacts} recorded ${edge.from} interventions` +
        ` [clock ${edge.ordering.clock}, recorded link ${edge.ordering.recorded_link}]`,
    );
  }
  lines.push("", "Nothing recorded against:");
  for (const node of graph.unanswered) {
    lines.push(`- ${node.kind}: ${node.count} of ${node.basis.recordedFacts}. ${node.copy}`);
    lines.push(`  Would settle it: ${node.wouldSettleIt.join(", ")}.`);
  }
  lines.push("", "Not performed in this period:");
  for (const kind of graph.unobserved) lines.push(`- ${kind.kind}: ${kind.why}`);
  return lines.join("\n");
}

/**
 * PROPOSED FOR NOBODY — nothing ships.
 *
 * Pinned empty by its own test, the posture W183, W196 and the pathway registries all take. A
 * response graph over anything but the simulation would need real interventions, and there are
 * none.
 */
export const SHIPPED_RESPONSE_GRAPHS: readonly ResponseGraph[] = [];
