// W244: what happened to an exchange — W170's rule at the one boundary this tree cannot see across.
//
// Everywhere else in this product, "did it happen" is answered from the practice's own records. At
// an integration boundary it is answered by somebody else's system, and the honest default when
// that system says nothing useful is that we do not know.
//
// A 200 IS NOT AN ACKNOWLEDGEMENT, and this is the sharp point. A success status says a request
// reached something willing to answer — a load balancer, a gateway, a queue that will drop it on
// the floor. Every integration in the world reads it as success, and it is the single most common
// way "we sent it" becomes "they got it" without anybody deciding to lie. An acknowledgement is the
// OTHER SIDE saying what it did with the thing, in the payload it returned. A status code is not
// that, and this module will not let one stand in for it.
//
// UNKNOWN CAN ONLY BE RESOLVED BY THE OTHER SIDE. Not by a retry that also timed out, not by time
// passing, not by nobody complaining. W243 needed monotonicity pointing one way — time can only
// remove consent — and this needs it pointing the other: silence can only leave the question open.
// The shapes that break it are the ones nobody writes a case for: a retry whose second failure
// clears the first, a "no news is good news" window, a reconciliation that reads absence from an
// error report as confirmation.
//
// AND A REFUSAL IS NOT A FAILURE. The other side saying "no, that patient is not ours" is a
// SUCCESSFUL exchange with a negative answer. Folding it into the error bucket loses the one piece
// of information that would tell somebody what to fix, and makes a working integration look broken.
// Three outcomes where a careless model has two — W170's shape exactly.

/** What the other side told us it did. Positive statements only. */
export type ExchangeOutcome =
  /** The receiving system said it accepted the thing. A statement THEY made, in their payload. */
  | "acknowledged"
  /** The receiving system said no, and said why. A successful exchange with a negative answer. */
  | "refused"
  /** Everything else. Not a failure count — the honest answer to a question nobody answered. */
  | "unknown";

export const EXCHANGE_OUTCOME_COPY: Record<ExchangeOutcome, string> = {
  acknowledged:
    "The receiving system confirmed it took this. That confirmation came from the system itself rather than from the request having completed without an error.",
  refused:
    "The receiving system took this and said no, with a reason. That is a working exchange with a negative answer, not a failure — the reason it gave is the thing worth reading.",
  unknown:
    "Nothing came back that says what happened to this. It may have arrived, it may have been dropped, and this product cannot tell which. It is recorded as unknown rather than as sent, because a request that completed without an error is not the same as a thing that was received.",
};

/** Why an exchange's outcome is unknown. Recorded so "unknown" is not one undifferentiated bucket. */
export type UnknownReason =
  | "no_acknowledgement_in_payload"
  | "transport_failed"
  | "timed_out"
  | "malformed_response"
  | "never_attempted";

export const UNKNOWN_REASON_COPY: Record<UnknownReason, string> = {
  no_acknowledgement_in_payload:
    "The request completed and the response said nothing about what was done with it. A success status means a request reached something willing to answer — a gateway, a queue, a load balancer — and none of those is the system that was supposed to receive this.",
  transport_failed: "The request did not complete. Whether anything arrived before it failed is not knowable from here.",
  timed_out:
    "No response arrived in time. A timeout says nothing about whether the other side received the thing, only that it did not tell us in time — which is why waiting longer next time would change the wait rather than the answer.",
  malformed_response:
    "A response arrived and could not be read. It is treated as no answer rather than guessed at, because a half-parsed acknowledgement is the most convincing wrong answer available here.",
  never_attempted: "Nothing was sent, so nothing came back. Recorded rather than left blank.",
};

/** One recorded exchange. `unknown` carries its reason; the other two carry the other side's words. */
export type ExchangeRecord =
  | { outcome: "acknowledged"; acknowledgedBy: string; theirReference: string; atIso: string }
  | { outcome: "refused"; refusedBy: string; theirReason: string; atIso: string }
  | { outcome: "unknown"; why: UnknownReason; atIso: string };

/**
 * What a receiving system said, as this module is willing to read it.
 *
 * Note the shape: a status code is here, and it is NOT sufficient for an acknowledgement. The only
 * route to `acknowledged` is `theirAcknowledgement`, which the other side has to have put in its
 * payload. A caller cannot get an acknowledgement by reporting a 200.
 */
export interface ExchangeResponse {
  /** Whether the transport completed at all. */
  completed: boolean;
  /** The status, if one arrived. Recorded, and deliberately not decisive. */
  status: number | null;
  /**
   * What the receiving system said it did, from its own payload. Absent means it said nothing —
   * which is `unknown`, whatever the status was.
   */
  theirAcknowledgement: { by: string; reference: string } | null;
  /** What it said when it said no. Absent means it did not refuse. */
  theirRefusal: { by: string; reason: string } | null;
  /** True where a response arrived and could not be parsed. */
  unreadable: boolean;
  atIso: string;
}

/**
 * Read a response into an outcome.
 *
 * ORDERED SO A STATUS CODE CANNOT WIN. Refusal and acknowledgement are read from what the other
 * side SAID; everything else falls through to `unknown` with a reason. There is no branch anywhere
 * that consults `status` to decide the outcome — it is carried for the record and nothing more.
 */
export function readExchange(response: ExchangeResponse): ExchangeRecord {
  if (response.theirRefusal !== null) {
    return {
      outcome: "refused",
      refusedBy: response.theirRefusal.by,
      theirReason: response.theirRefusal.reason,
      atIso: response.atIso,
    };
  }
  if (response.theirAcknowledgement !== null) {
    return {
      outcome: "acknowledged",
      acknowledgedBy: response.theirAcknowledgement.by,
      theirReference: response.theirAcknowledgement.reference,
      atIso: response.atIso,
    };
  }
  if (!response.completed) {
    return { outcome: "unknown", why: "transport_failed", atIso: response.atIso };
  }
  if (response.unreadable) {
    return { outcome: "unknown", why: "malformed_response", atIso: response.atIso };
  }
  return { outcome: "unknown", why: "no_acknowledgement_in_payload", atIso: response.atIso };
}

/**
 * The record of a whole attempt, including retries.
 *
 * A retry does not clear an earlier unknown. The later attempt's own outcome is the record's
 * outcome — because the other side may have answered the second time — but a run of unknowns stays
 * unknown however long it is, and the count is kept so nobody reads one timeout and five timeouts
 * as the same thing.
 */
export interface ExchangeHistory {
  attempts: readonly ExchangeRecord[];
}

/**
 * What the history says happened.
 *
 * SILENCE CAN ONLY LEAVE THE QUESTION OPEN. There is no attempt count, no elapsed time and no
 * absence-of-complaint that turns a run of unknowns into a delivery — and no argument to this
 * function that could. The only thing that resolves an unknown is the other side saying something,
 * which arrives as an attempt with a non-unknown outcome.
 */
export function exchangeOutcome(history: ExchangeHistory): ExchangeRecord {
  if (history.attempts.length === 0) {
    return { outcome: "unknown", why: "never_attempted", atIso: "" };
  }
  // The most recent thing the other side actually SAID, if it ever said anything. A refusal
  // followed by an unknown is still a refusal — they told us once, and a later silence does not
  // withdraw it.
  const spoken = [...history.attempts].reverse().find((a) => a.outcome !== "unknown");
  return spoken ?? history.attempts[history.attempts.length - 1]!;
}

/** Whether this exchange may be described to anybody as having been received. */
export function wasReceived(history: ExchangeHistory): boolean {
  return exchangeOutcome(history).outcome === "acknowledged";
}
