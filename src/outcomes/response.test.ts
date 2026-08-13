// W211 verify gate: "no response can be constructed without the intervention it answers; an
// absent response is `not_recorded` and never 'no response' (W170's rule inherited, not
// restated)."
//
// Both halves are tested as things that CANNOT HAPPEN rather than as things that happen to be
// right today. The first is a type-level absence — there is no literal a caller can write that
// is a `Response` — and the second is a namespace absence: no exported function returns the
// boolean or the denominator that would turn silence into a finding.

import { describe, expect, it } from "vitest";
import * as responseModule from "./response";
import {
  ALL_INTERVENTION_KINDS,
  RESPONSE_ABSENCE_COPY,
  RESPONSE_KINDS,
  RESPONSE_REJECTION_COPY,
  RESPONSE_STATE_COPY,
  respondTo,
  responseState,
  responsesTo,
  type Intervention,
  type Response,
} from "./response";
import { OUTCOME_VERDICT_COPY, type RecordedEvent } from "./model";

const INVITE: Intervention = {
  interventionId: "int-1",
  practiceId: "prac-1",
  chainId: "chain-1",
  kind: "invitation_offered",
  at: "2026-05-01T09:00:00Z",
};

const event = (over: Partial<RecordedEvent> = {}): RecordedEvent => ({
  chainId: "chain-1",
  kind: "appointment_booked",
  at: "2026-05-02T09:00:00Z",
  ...over,
});

const built = (intervention: Intervention, ev: RecordedEvent): Response => {
  const result = respondTo(intervention, ev);
  if (!result.ok) throw new Error(`fixture refused: ${result.errors.join(", ")}`);
  return result.response;
};

describe("W211 a response cannot exist without the intervention it answers", () => {
  it("has exactly one way to obtain one, and it takes the intervention itself", () => {
    // The design, stated as a test. `respondTo` takes the VALUE, not an id, so an attribution to
    // an intervention nobody can produce has nowhere to come from.
    const result = respondTo(INVITE, event());
    expect(result.ok).toBe(true);
    expect(result.ok && result.response.interventionId).toBe("int-1");
  });

  it("cannot be written as an object literal", () => {
    // @ts-expect-error — `Response` is branded; there is no literal that satisfies it.
    const forged: Response = {
      interventionId: "int-does-not-exist",
      chainId: "chain-1",
      practiceId: "prac-1",
      kind: "appointment_booked",
      at: "2026-05-02T09:00:00Z",
      verdict: "reached",
      evidence: event(),
    };
    void forged;
  });

  it("copies the practice from the intervention rather than taking one", () => {
    // W209's discipline: a response inherits the tenancy of the thing it answers, so there is no
    // parameter through which it could be attributed to another practice.
    expect(built(INVITE, event()).practiceId).toBe("prac-1");
  });

  it("refuses an event on another chain rather than linking it", () => {
    const result = respondTo(INVITE, event({ chainId: "chain-2" }));
    expect(!result.ok && result.errors).toContain("event_on_another_chain");
  });

  it("refuses an event recorded before the intervention", () => {
    // The flattering error: fold an EARLIER fact into an intervention's responses and the
    // intervention looks effective.
    const before = respondTo(INVITE, event({ at: "2026-04-30T09:00:00Z" }));
    expect(!before.ok && before.errors).toContain("event_recorded_before_intervention");
  });

  it("links a same-instant event and says the clock did not separate them", () => {
    // AMENDED AT W212, which found the first version linked nothing at all over W12's sim: the
    // spine stamps one timestamp per simulated week, so all 1,552 recorded responses in a
    // six-week run share the instant of the offer they answer. Refusing them would have made
    // `responseState` say `not_recorded` for interventions the record shows were answered —
    // this module's own headline failure. Same instant is not an earlier fact.
    const same = respondTo(INVITE, event({ at: INVITE.at }));
    expect(same.ok).toBe(true);
    if (!same.ok) return;
    expect(same.response.ordering).toBe("recorded_link");
    // And a link the clock DOES separate says so, so the distinction is not cosmetic.
    const later = respondTo(INVITE, event({ at: "2026-05-03T09:00:00Z" }));
    expect(later.ok && later.response.ordering).toBe("clock");
  });

  it("refuses an undeclared kind rather than guessing what it means", () => {
    const result = respondTo(INVITE, event({ kind: "something_nobody_declared" }));
    expect(!result.ok && result.errors).toContain("kind_not_a_declared_response");
  });

  it("says why it refused, rather than dropping the event", () => {
    // A silently ignored event is an attribution quietly not made, and the caller cannot tell
    // that from an event nobody offered — W205's conflation, prevented rather than repeated.
    for (const reason of Object.keys(RESPONSE_REJECTION_COPY) as (keyof typeof RESPONSE_REJECTION_COPY)[]) {
      expect(RESPONSE_REJECTION_COPY[reason].length, reason).toBeGreaterThan(30);
      expect(RESPONSE_REJECTION_COPY[reason]).toContain("not been linked");
    }
  });
});

describe("W211 an absence is not a response", () => {
  it("answers not_recorded when nothing is recorded, with what would settle it", () => {
    const state = responseState(INVITE, []);
    expect(state.verdict).toBe("not_recorded");
    expect(state.responses).toEqual([]);
    expect(state.wouldSettleIt).toEqual([
      "appointment_booked",
      "appointment_attended",
      "invitation_declined",
      "patient_opted_out",
      "invitation_expired",
    ]);
  });

  it("answers not_recorded when every candidate event was refused", () => {
    // The state that would be easiest to get wrong: events exist, none of them answer THIS
    // intervention, and the honest verdict is still silence rather than a negative.
    const state = responseState(INVITE, [
      event({ chainId: "chain-2" }),
      event({ at: "2026-04-01T09:00:00Z" }),
      event({ kind: "undeclared_kind" }),
    ]);
    expect(state.verdict).toBe("not_recorded");
    expect(state.responses).toEqual([]);
  });

  it("counts an opt-out as an answer, never as a silence", () => {
    // Somebody who told this product something is not somebody who told it nothing. `stopped` is
    // a positive statement resting on a recorded fact, which is W170's whole distinction.
    const state = responseState(INVITE, [event({ kind: "patient_opted_out" })]);
    expect(state.verdict).toBe("stopped");
    expect(state.responses.map((r) => r.verdict)).toEqual(["stopped"]);
  });

  it("exports no way to say somebody did not respond", () => {
    // The absence this unit is really about. Every one of these names is a boolean or a
    // denominator built by treating `not_recorded` as "no", and the moment one exists a console
    // renders it — W219 is where the refusal has to hold under pressure.
    for (const name of Object.keys(responseModule)) {
      expect(name, `"${name}" reads as a negative finding about a person`).not.toMatch(
        /hasResponded|didNotRespond|nonResponder|noResponse|unresponsive|responseRate|ignored|failedTo/i,
      );
    }
  });

  it("says nothing in its copy that reads as a person's decision", () => {
    const allCopy = [
      ...Object.values(RESPONSE_STATE_COPY),
      ...Object.values(RESPONSE_REJECTION_COPY),
      RESPONSE_ABSENCE_COPY,
    ].join(" ");
    expect(allCopy.toLowerCase()).not.toMatch(
      /no response|did not respond|failed to respond|non-responder|ignored/,
    );
  });

  it("inherits W170's wording rather than restating it", () => {
    // Two three-valued vocabularies drift, and the drift is invisible because nobody opens both
    // files at once (W177's lesson about duplicated caveats). So this is identity, not similarity.
    expect(RESPONSE_STATE_COPY.not_recorded).toBe(OUTCOME_VERDICT_COPY.not_recorded);
    expect(RESPONSE_STATE_COPY.reached).toBe(OUTCOME_VERDICT_COPY.reached);
    expect(RESPONSE_STATE_COPY.stopped).toBe(OUTCOME_VERDICT_COPY.stopped);
  });
});

describe("W211 the declared response table is complete in both directions", () => {
  it("declares response kinds for every intervention kind, and nothing else", () => {
    expect(Object.keys(RESPONSE_KINDS).sort()).toEqual([...ALL_INTERVENTION_KINDS].sort());
  });

  it("gives every intervention kind a way to advance and a way to end", () => {
    // A kind with no `ends` can only ever be `reached` or `not_recorded`, which quietly makes
    // silence the only home for a decline — the exact collapse this unit exists to prevent.
    for (const kind of ALL_INTERVENTION_KINDS) {
      expect(RESPONSE_KINDS[kind].advances.length, kind).toBeGreaterThan(0);
      expect(RESPONSE_KINDS[kind].ends.length, kind).toBeGreaterThan(0);
    }
  });

  it("declares no kind as both advancing and ending", () => {
    for (const kind of ALL_INTERVENTION_KINDS) {
      const { advances, ends } = RESPONSE_KINDS[kind];
      expect(advances.filter((k) => ends.includes(k)), kind).toEqual([]);
    }
  });

  it("names no condition, symptom or clinical judgement in any declared kind", () => {
    // Founder gate (plan §4): an intervention kind is an operational act and a response kind is
    // an operational fact. Neither is allowed to become a triage vocabulary.
    const vocabulary = [
      ...ALL_INTERVENTION_KINDS,
      ...ALL_INTERVENTION_KINDS.flatMap((k) => [...RESPONSE_KINDS[k].advances, ...RESPONSE_KINDS[k].ends]),
    ].join(" ");
    expect(vocabulary).not.toMatch(
      /diabet|renal|ckd|cardio|derm|symptom|severity|urgen|risk|priorit|diagnos/i,
    );
  });
});

describe("W211 the fold is order-independent", () => {
  it("returns the same responses whatever order the events arrive in", () => {
    // W167's register: a fold whose answer depends on arrival order is a fold that is right for
    // one caller. There is no sort and no first-match here, so this is a property of the set.
    const events = [
      event({ kind: "appointment_booked", at: "2026-05-02T09:00:00Z" }),
      event({ kind: "appointment_attended", at: "2026-05-09T09:00:00Z" }),
      event({ kind: "invitation_declined", at: "2026-05-03T09:00:00Z" }),
    ];
    const forwards = responsesTo(INVITE, events).map((r) => r.kind).sort();
    const backwards = responsesTo(INVITE, [...events].reverse()).map((r) => r.kind).sort();
    expect(backwards).toEqual(forwards);
    expect(forwards).toEqual(["appointment_attended", "appointment_booked", "invitation_declined"]);
  });

  it("resolves a mixed set to reached, both orders", () => {
    // A recorded arrival is not undone by a later cancellation event — W170's rule, and the
    // answer must not depend on which one the caller happened to append first.
    const mixed = [event({ kind: "appointment_attended" }), event({ kind: "patient_opted_out", at: "2026-05-10T09:00:00Z" })];
    expect(responseState(INVITE, mixed).verdict).toBe("reached");
    expect(responseState(INVITE, [...mixed].reverse()).verdict).toBe("reached");
  });

  it("carries no responses when the verdict is not_recorded, and none when it is not", () => {
    // The two halves of the type, checked as behaviour: a verdict with responses cites them, and
    // `not_recorded` has nothing to cite, which is why it is the only one with a settle list.
    const silent = responseState(INVITE, []);
    const answered = responseState(INVITE, [event()]);
    expect(silent.responses).toHaveLength(0);
    expect(silent.wouldSettleIt.length).toBeGreaterThan(0);
    expect(answered.responses.length).toBeGreaterThan(0);
    expect(answered.wouldSettleIt).toEqual([]);
  });
});
