// W211: what a RESPONSE to an intervention is, as recorded facts.
//
// Q17 is about learning from what this product does. Every unit after this one — the response
// graph (W212), counterfactual accounting (W215), attribution v2 (W219) — rests on being able to
// say "this happened BECAUSE of that". So the thing to get right first is when that sentence is
// allowed to be said at all, because the two ways of getting it wrong are both silent.
//
// THE FIRST WAY IS A DANGLING ATTRIBUTION: a response that names an intervention nobody can
// produce. An id is a string, and a string can be typed. So `Response` is a branded type with
// exactly one constructor, and that constructor takes THE INTERVENTION VALUE rather than its id —
// W114's `UsablePathway` and W152's `ApprovedContent`, applied to causality. There is no literal
// a caller can write that is a `Response`, so a response without an intervention is not a bug
// this module guards against; it is a state that cannot be represented.
//
// THE SECOND WAY IS THE ONE THIS TREE HAS ALREADY MET FIVE TIMES: reading an absence as a
// finding. "The patient did not respond" is a claim about a person. "Nothing is recorded" is a
// claim about a record, and on a young rail it will be most of the population. W170 settled this
// for outcomes and W120 for silence generally, so this module INHERITS THAT VOCABULARY RATHER
// THAN RESTATING IT — `OutcomeVerdict` and `OUTCOME_VERDICT_COPY` are imported, not redeclared.
// A second three-valued enum would drift from the first, and the drift would be invisible
// because nobody opens both files at once (W177's lesson about duplicated caveats).
//
// The consequence is a deliberate ABSENCE, tested as one: there is no exported `hasResponded`,
// no `responseRate`, no `nonResponders`. Every one of those is a boolean or a denominator built
// on treating `not_recorded` as "no", and the moment one exists a console will render it.
//
// A RESPONSE MUST NOT COME BEFORE WHAT IT ANSWERS. The error this prevents is the flattering one:
// fold an earlier fact into an intervention's responses and the intervention looks effective.
//
// W212 AMENDED THIS, AND THE AMENDMENT IS THE INTERESTING PART. The first version refused an event
// at OR BEFORE the intervention's timestamp, and a test pinned the same-instant case as refused.
// Then W212 ran the model over W12's synthetic loop and linked NOTHING: the sim's spine stamps one
// timestamp per simulated week, so all 1,552 recorded responses in a six-week run share the
// instant of the offer they answer. Zero were strictly after.
//
// The rule was not merely inconvenient there, it was WRONG IN THE MODULE'S OWN TERMS. Refusing all
// 1,552 would have made `responseState` return `not_recorded` for interventions the record plainly
// shows were answered — a claim about the record that the record contradicts, which is the exact
// failure the third value exists to prevent. An event recorded at the same instant is not an
// earlier fact; it is a fact the clock cannot separate, and `at` was being treated as a total
// order on recorded facts when the append-only log's total order is its sequence, not its clock.
//
// So: strictly-earlier events are still refused, because that is what the flattering error looks
// like. Same-instant events are linked, and the `Response` RECORDS WHICH IT RESTS ON — `ordering`
// is `"clock"` when the timestamps separate them and `"recorded_link"` when they do not and the
// link comes from the event naming the intervention's chain. W212's edges carry the split, so a
// reader can see how much of a graph rests on a clock that could not tell.
//
// NOT A TRIAGE, NOT A CLINICAL JUDGEMENT (founder gate, plan §4). Nothing here reads a symptom,
// scores a patient, or decides who should be seen. An intervention kind is a declared operational
// act and a response kind is a declared operational fact; both lists are data a reviewer reads in
// one place, and neither mentions a condition.

import { OUTCOME_VERDICT_COPY, type OutcomeVerdict, type RecordedEvent } from "./model";

/** The verdicts a RESPONSE can carry: a response is by definition something recorded. */
export type ResponseVerdict = Extract<OutcomeVerdict, "reached" | "stopped">;

/**
 * Something this product did, recorded as a fact.
 *
 * Anchored on W170's `chainId` rather than on a new identifier, so an intervention and the
 * outcome chain it acts on are the same thing seen twice — and W212's graph does not have to
 * join two vocabularies.
 */
export interface Intervention {
  interventionId: string;
  /** W209's discipline: the practice is on the record, not assumed from the store it came from. */
  practiceId: string;
  chainId: string;
  kind: InterventionKind;
  at: string;
}

export type InterventionKind =
  /** An invitation to book was generated and queued for this chain. */
  | "invitation_offered"
  /** A reminder was generated for an outstanding offer. */
  | "reminder_offered"
  /** A referral was written and sent. */
  | "referral_sent"
  /** Education material was surfaced to a clinician. */
  | "material_surfaced";

/**
 * The response kinds each intervention can be answered by, and which way they settle it.
 *
 * `advances` and `ends` are BOTH positive statements — somebody wrote something down. The
 * distinction is W170's `reached` versus `stopped`, and it matters because an opt-out is an
 * answer, not a silence, and a product that counted it as one would be describing a person who
 * told it something as a person who told it nothing.
 */
export const RESPONSE_KINDS: Record<
  InterventionKind,
  { advances: readonly string[]; ends: readonly string[] }
> = {
  invitation_offered: {
    advances: ["appointment_booked", "appointment_attended"],
    ends: ["invitation_declined", "patient_opted_out", "invitation_expired"],
  },
  reminder_offered: {
    advances: ["appointment_booked", "appointment_attended"],
    ends: ["invitation_declined", "patient_opted_out", "invitation_expired"],
  },
  referral_sent: {
    advances: ["referral_accepted", "referral_completed"],
    ends: ["referral_declined", "referral_withdrawn"],
  },
  material_surfaced: {
    advances: ["material_opened", "material_marked_read"],
    ends: ["material_withdrawn"],
  },
};

export const ALL_INTERVENTION_KINDS = Object.keys(RESPONSE_KINDS) as InterventionKind[];

/**
 * What the ordering of a link rests on.
 *
 * Carried rather than assumed: at a clock resolution coarser than the process being recorded —
 * the sim's weekly tick, and any real system stamping to the second — cause and effect routinely
 * share a timestamp, and a graph should be able to say how much of itself is in that position.
 */
export type LinkOrdering =
  /** The event's timestamp is strictly later than the intervention's. */
  | "clock"
  /** Same recorded instant; the link rests on the event naming the intervention's chain. */
  | "recorded_link";

declare const responseBrand: unique symbol;

/**
 * A recorded fact that answers a NAMED intervention.
 *
 * Obtainable only from `respondTo`, which takes the intervention itself. The brand is not
 * decoration: without it a caller could write an object literal with an `interventionId` they
 * made up, and the whole of Q17 would rest on strings nobody checked.
 */
export interface Response {
  readonly [responseBrand]: true;
  readonly interventionId: string;
  readonly chainId: string;
  readonly practiceId: string;
  readonly kind: string;
  readonly at: string;
  readonly verdict: ResponseVerdict;
  /** Whether the clock separated these two facts, or only the record did. */
  readonly ordering: LinkOrdering;
  /** The event this rests on, so a reader can check the link rather than believe it (W196). */
  readonly evidence: RecordedEvent;
}

export type ResponseRejection =
  /** The event belongs to a different chain, so it answers something else or nothing. */
  | "event_on_another_chain"
  /** The event was recorded BEFORE the intervention, so it cannot be an answer to it. */
  | "event_recorded_before_intervention"
  /** The kind is not declared as a response to this intervention kind. */
  | "kind_not_a_declared_response";

export type ResponseResult =
  | { ok: true; response: Response }
  | { ok: false; errors: ResponseRejection[] };

/**
 * Build the response an event constitutes to a named intervention, or say why it does not.
 *
 * TAKES THE INTERVENTION, NOT ITS ID. That is the whole design: the caller has to be holding the
 * thing it claims caused this, so an attribution to an intervention that does not exist has
 * nowhere to come from.
 *
 * Refuses rather than drops. A silently ignored event is an attribution quietly not made, and the
 * caller cannot tell that from an event that was never offered — the same distinction W205 had
 * to add to the reporting coverage list after shipping without it.
 */
export function respondTo(intervention: Intervention, event: RecordedEvent): ResponseResult {
  const errors: ResponseRejection[] = [];
  if (event.chainId !== intervention.chainId) errors.push("event_on_another_chain");
  if (event.at < intervention.at) errors.push("event_recorded_before_intervention");

  const declared = RESPONSE_KINDS[intervention.kind];
  const advances = declared.advances.includes(event.kind);
  const ends = declared.ends.includes(event.kind);
  if (!advances && !ends) errors.push("kind_not_a_declared_response");

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    response: {
      interventionId: intervention.interventionId,
      chainId: intervention.chainId,
      practiceId: intervention.practiceId,
      kind: event.kind,
      at: event.at,
      verdict: advances ? "reached" : "stopped",
      ordering: event.at > intervention.at ? "clock" : "recorded_link",
      evidence: event,
    } as Response,
  };
}

/**
 * Every response an intervention has, from a pool of recorded events.
 *
 * Order-independent by construction: the result is a filter over the set, and nothing here sorts
 * or takes a first match, so two events at the same instant are not a tie to break (W167/W168).
 */
export function responsesTo(
  intervention: Intervention,
  events: readonly RecordedEvent[],
): Response[] {
  const out: Response[] = [];
  for (const event of events) {
    const result = respondTo(intervention, event);
    if (result.ok) out.push(result.response);
  }
  return out;
}

/**
 * What is recorded about an intervention: an answer, or the honest absence of one.
 *
 * THE THIRD VALUE IS THE POINT. `not_recorded` is not "no response" and this module exports no
 * way to render it as one — see `RESPONSE_ABSENCE_COPY` and the absence tests.
 */
export type ResponseState =
  | { verdict: ResponseVerdict; responses: Response[]; wouldSettleIt: string[] }
  | { verdict: "not_recorded"; responses: []; wouldSettleIt: string[] };

export function responseState(
  intervention: Intervention,
  events: readonly RecordedEvent[],
): ResponseState {
  const responses = responsesTo(intervention, events);
  const declared = RESPONSE_KINDS[intervention.kind];
  if (responses.length === 0) {
    // W170's move: an unanswerable evaluation becomes a list of things somebody could go and
    // record, rather than a number a reader has to interpret.
    return {
      verdict: "not_recorded",
      responses: [],
      wouldSettleIt: [...declared.advances, ...declared.ends],
    };
  }
  // `reached` wins over `stopped` for the same reason W170 gives: a recorded arrival at the end
  // is not undone by a later cancellation event, which is a record to look at rather than a
  // reason to call the chain stopped.
  const verdict: ResponseVerdict = responses.some((r) => r.verdict === "reached")
    ? "reached"
    : "stopped";
  return { verdict, responses, wouldSettleIt: [] };
}

/**
 * The sentence a surface uses for each state.
 *
 * Inherited from W170 rather than written again. The `not_recorded` wording is the one that
 * matters and it already exists, correct, one module over — a second copy of it would be a
 * second thing to keep true.
 */
export const RESPONSE_STATE_COPY: Record<ResponseState["verdict"], string> = {
  reached: OUTCOME_VERDICT_COPY.reached,
  stopped: OUTCOME_VERDICT_COPY.stopped,
  not_recorded: OUTCOME_VERDICT_COPY.not_recorded,
};

/**
 * What a surface says instead of "no response".
 *
 * Exported so W212's graph and W220's console cannot each invent their own phrasing, and so the
 * phrase this module refuses has one place to be checked.
 */
export const RESPONSE_ABSENCE_COPY =
  "Nothing is recorded against this yet. That is a fact about the record, not about the person, and it is not counted as a decision either way.";

export const RESPONSE_REJECTION_COPY: Record<ResponseRejection, string> = {
  event_on_another_chain:
    "That event belongs to a different chain, so it answers something else. It has not been linked.",
  event_recorded_before_intervention:
    "That event was recorded before the intervention, so it cannot be an answer to it. It has not been linked.",
  kind_not_a_declared_response:
    "That kind of event is not one of the declared answers to this kind of intervention. It has not been linked, and adding it means declaring it.",
};
