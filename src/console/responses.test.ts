// W220 verify gate: the three empty states are each REACHED, no undisclosed count can leave the
// view, and nothing on the page reads as a clinical claim.
//
// The empty states are the point of the row's gate, and the way an empty state usually ships is
// reasoned about rather than reached — somebody writes the branch, reads it, and is satisfied. So
// each of the three is constructed here from a graph that actually produces it, and the fourth
// combination the branch does not handle is asserted UNREACHABLE rather than given a fallback.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { ATTRIBUTION_VERSION, type AttributionResult } from "@/engine/attribution";
import { counterfactual } from "@/outcomes/counterfactual";
import { lintEducationCopy } from "@/education/advice-lint";
import {
  RESPONSE_GRAPH_CELL_FLOOR,
  buildResponseGraph,
  eventsFromSim,
  interventionsFromSim,
  type GraphResult,
} from "@/outcomes/response-graph";
import type { Intervention } from "@/outcomes/response";
import type { RecordedEvent } from "@/outcomes/model";
import {
  RESPONSES_EMPTY_COPY,
  RESPONSES_REFUSAL_COPY,
  responsesView,
} from "./responses";

const PERIOD = { fromIso: "2026-08-08", toIso: "2026-09-19" };
const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });

const arms = (
  invitedPatients: number,
  invitedAttended: number,
  holdoutPatients: number,
  holdoutAttended: number,
): AttributionResult => {
  const per1000 = (attended: number, size: number) => (size === 0 ? 0 : (attended / size) * 1000);
  return {
    version: ATTRIBUTION_VERSION,
    window: PERIOD,
    inviteArm: { patients: invitedPatients, attended: invitedAttended, attendedPer1000: per1000(invitedAttended, invitedPatients) },
    holdoutArm: { patients: holdoutPatients, attended: holdoutAttended, attendedPer1000: per1000(holdoutAttended, holdoutPatients) },
    incrementalPer1000: null,
    incrementalAttended: null,
    naiveGeneratedAttended: 0,
  };
};
const HEALTHY = counterfactual(arms(400, 80, 100, 10));

const offer = (n: number): Intervention[] =>
  Array.from({ length: n }, (_, i) => ({
    interventionId: `i${i}`,
    practiceId: "p1",
    chainId: `c${i}`,
    kind: "invitation_offered" as const,
    at: "2026-08-10T00:00:00.000Z",
  }));

const booked = (chainIds: readonly string[]): RecordedEvent[] =>
  chainIds.map((chainId) => ({ chainId, kind: "appointment_booked", at: "2026-08-10T00:00:00.000Z" }));

const simGraph = (): GraphResult =>
  buildResponseGraph(interventionsFromSim(sim), eventsFromSim(sim), PERIOD);

describe("W220 the three empty states are each reached, not reasoned about", () => {
  it("says nothing HAPPENED when no message went out", () => {
    // The graph refuses over nothing, so the view never sees a graph at all.
    const view = responsesView(buildResponseGraph([], [], PERIOD), HEALTHY);
    expect(view.empty).toBe("nothing_happened");
    expect(view.emptyCopy).toBe(RESPONSES_EMPTY_COPY.nothing_happened);
    expect(view.rates).toEqual([]);
    expect(view.disclosure).toBeNull();
    expect(view.refusals.map((r) => r.reason)).toEqual(["nothing_recorded"]);
  });

  it("says nothing was RECORDED when messages went out and nothing came back", () => {
    // Distinct from the above in the data as well as the copy: 40 interventions exist and every
    // one of them is in the unanswered pile. Reading this as "nothing happened" would report a
    // rail that was never used; reading it as "nobody answered" would report a decision nobody
    // made. It is the record being silent, and it gets its own sentence.
    const view = responsesView(buildResponseGraph(offer(40), [], PERIOD), HEALTHY);
    expect(view.empty).toBe("nothing_recorded");
    expect(view.emptyCopy).toBe(RESPONSES_EMPTY_COPY.nothing_recorded);
    expect(view.rates).toHaveLength(1);
    expect(view.rates[0]!.offered).toBe(40);
    expect(view.rates[0]!.answeredAtLeastOnce).toBe(0);
    expect(view.rates[0]!.unanswered).toBe(40);
  });

  it("says everything was WITHHELD when every group is below the disclosure floor", () => {
    // Two cells, both under W218's floor of 5: one answered, three unanswered. The kind is
    // withheld whole, so the disclosed graph has no rates at all — and the page must not report
    // that as silence, because answers exist and are simply too small to show.
    const belowFloor = RESPONSE_GRAPH_CELL_FLOOR.floor - 1;
    expect(belowFloor).toBeGreaterThan(0);
    const view = responsesView(
      buildResponseGraph(offer(belowFloor + 1), booked(["c0"]), PERIOD),
      HEALTHY,
    );
    expect(view.empty).toBe("everything_withheld");
    expect(view.emptyCopy).toBe(RESPONSES_EMPTY_COPY.everything_withheld);
    expect(view.rates).toEqual([]);
    expect(view.disclosure?.withheldKinds.map((w) => w.kind)).toEqual(["invitation_offered"]);
  });

  it("is not empty at all over the real simulated period", () => {
    // Non-vacuity for everything above: if the sim produced an empty page, three of these tests
    // would be describing the only state the product can reach.
    const view = responsesView(simGraph(), HEALTHY);
    expect(view.empty).toBeNull();
    expect(view.emptyCopy).toBeNull();
    expect(view.rates.length).toBeGreaterThan(0);
    expect(view.rates[0]!.answeredAtLeastOnce).toBeGreaterThan(RESPONSE_GRAPH_CELL_FLOOR.floor);
  });

  it("leaves no fourth state for a fallback to cover", () => {
    // The branch handles withheld-and-empty and answered-nothing. "No rates and nothing withheld"
    // is the combination it does not handle, and it is unreachable: a BUILT graph holds at least
    // one intervention, so it always yields at least one kind. Asserted rather than defended with
    // a fallback, which would return plausible copy for a state nobody has reasoned about.
    for (const n of [1, 2, RESPONSE_GRAPH_CELL_FLOOR.floor, 50]) {
      const result = buildResponseGraph(offer(n), [], PERIOD);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const disclosed = responsesView(result, HEALTHY);
      const noRatesAndNothingWithheld =
        disclosed.rates.length === 0 && (disclosed.disclosure?.withheldKinds.length ?? 0) === 0;
      expect(noRatesAndNothingWithheld, `n=${n} reached the unhandled state`).toBe(false);
    }
  });

  it("gives every refusal the graph can produce a sentence, both directions", () => {
    const unreadable = buildResponseGraph(offer(9), [], { fromIso: "not-a-date", toIso: "x" });
    expect(unreadable.ok).toBe(false);
    const view = responsesView(unreadable, HEALTHY);
    expect(view.refusals.map((r) => r.reason)).toContain("period_missing_or_unreadable");
    for (const refusal of view.refusals) expect(refusal.copy.length).toBeGreaterThan(40);
    expect(Object.keys(RESPONSES_REFUSAL_COPY).sort()).toEqual([
      "nothing_recorded",
      "period_missing_or_unreadable",
    ]);
  });
});

describe("W220 no undisclosed count can leave the view", () => {
  it("holds the disclosed graph and nothing else", () => {
    // The raw graph goes no further than the call to `discloseResponseGraph`. Asserted on the
    // VALUE: a withheld kind appears nowhere in the view, at any depth.
    const withheld = responsesView(
      buildResponseGraph(offer(RESPONSE_GRAPH_CELL_FLOOR.floor - 1), booked(["c0"]), PERIOD),
      HEALTHY,
    );
    expect(withheld.disclosure?.graph.edges).toEqual([]);
    expect(withheld.disclosure?.graph.unanswered).toEqual([]);
    expect(withheld.rates).toEqual([]);
    // And the statement is present whether or not anything was withheld — a reader who sees it
    // only sometimes learns to read its presence as a warning (W218).
    expect(withheld.disclosure?.statement).toMatch(/withheld/i);
    expect(responsesView(simGraph(), HEALTHY).disclosure?.statement.length).toBeGreaterThan(20);
  });

  it("recomputes the total over what it shows, so nothing is recoverable by subtraction", () => {
    const view = responsesView(
      buildResponseGraph(offer(RESPONSE_GRAPH_CELL_FLOOR.floor - 1), booked(["c0"]), PERIOD),
      HEALTHY,
    );
    expect(view.disclosure?.graph.basis.recordedFacts).toBe(0);
  });
});

describe("W220 the page carries W219's honesty devices rather than restating them", () => {
  it("carries the caveat as its own field, at the table rather than as a footnote", () => {
    const view = responsesView(simGraph(), HEALTHY);
    expect(view.caveat).toBe(view.rates[0]!.caveat);
    expect(view.caveat).toMatch(/do not say what would have happened without/);
  });

  it("carries W219's withheld sentence when the claim cannot be split", () => {
    const view = responsesView(simGraph(), counterfactual(arms(400, 80, 0, 0)));
    expect(view.attribution?.claimed).toBe(false);
    expect(view.attributionWithheldCopy).toMatch(/withheld/i);
  });

  it("keeps unobserved kinds out of the rate table entirely", () => {
    // A rate of zero describes a rail that answered nobody. These were never used, and the
    // distinction is W212's — carried here rather than re-argued.
    const view = responsesView(simGraph(), HEALTHY);
    const rateKinds = view.rates.map((r) => r.kind);
    for (const kind of view.unobserved) expect(rateKinds).not.toContain(kind.kind);
    expect(view.unobserved.length).toBeGreaterThan(0);
  });
});

describe("W220 nothing on this page is a clinical claim", () => {
  it("passes the advice linter on every sentence the module authors", () => {
    const texts = [
      ...Object.values(RESPONSES_EMPTY_COPY),
      ...Object.values(RESPONSES_REFUSAL_COPY),
    ];
    for (const text of texts) {
      expect(lintEducationCopy(text).map((f) => f.rule), text.slice(0, 50)).toEqual([]);
    }
  });

  it("still fires on advice, so the clean result means something", () => {
    expect(lintEducationCopy("You should follow up on this patient.").length).toBeGreaterThan(0);
  });

  it("negates the specific wrong reading of each state, not a generic one", () => {
    // Each empty state has its OWN false reading, so a shared "does not say zero" check would
    // pass while two of the three left their own misreading standing.
    expect(RESPONSES_EMPTY_COPY.nothing_happened).toMatch(/not a response rate of zero/i);
    expect(RESPONSES_EMPTY_COPY.nothing_recorded).toMatch(/not everybody declining/i);
    expect(RESPONSES_EMPTY_COPY.everything_withheld).toMatch(/not a zero and not a silence/i);
  });
});
