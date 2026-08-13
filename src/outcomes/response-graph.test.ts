// W212 verify gate: golden graph over W12's sim; zero real interventions; every edge states the
// recorded facts it rests on.

import { describe, expect, it } from "vitest";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import * as mod from "./response-graph";
import {
  SHIPPED_RESPONSE_GRAPHS,
  SPINE_NOT_RESPONSES,
  SPINE_RESPONSE_KINDS,
  buildResponseGraph,
  eventsFromSim,
  interventionsFromSim,
  renderResponseGraph,
} from "./response-graph";
import { ALL_INTERVENTION_KINDS, RESPONSE_KINDS } from "./response";

const PERIOD = { fromIso: "2026-08-08", toIso: "2026-09-19" };
const sim = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });

const built = () => {
  const result = buildResponseGraph(interventionsFromSim(sim), eventsFromSim(sim), PERIOD);
  if (!result.ok) throw new Error(`graph refused: ${result.errors.join(", ")}`);
  return result.graph;
};

describe("W212 the graph is built over the synthetic loop and nothing else", () => {
  it("finds interventions and answers in the sim at all", () => {
    // Non-vacuity before anything else: every assertion below is over these two lists, and the
    // first version of W211 linked ZERO of 1,552 responses because the sim stamps one timestamp
    // per simulated week. A graph over nothing would have passed most of this file.
    expect(interventionsFromSim(sim).length).toBeGreaterThan(100);
    expect(eventsFromSim(sim).length).toBeGreaterThan(100);
    expect(built().edges.length).toBeGreaterThan(0);
  });

  it("can be built from a SimResult and from nothing else", () => {
    // The founder gate, as an absence. There is no other producer of an Intervention here, so a
    // graph over real data has no constructor — G1/G2/G3 are unresolved and nothing has been sent.
    const producers = Object.keys(mod).filter((name) => /^(interventions|events)/.test(name));
    expect(producers.sort()).toEqual(["eventsFromSim", "interventionsFromSim"]);
    expect(built().provenance).toBe("synthetic_sim");
    for (const intervention of interventionsFromSim(sim)) {
      expect(intervention.practiceId).toBe(String(sim.practice.id));
    }
  });

  it("ships no graph", () => {
    expect(SHIPPED_RESPONSE_GRAPHS).toEqual([]);
  });
});

describe("W212 every edge states what it was counted over", () => {
  it("carries a basis with a denominator, a period and a source on every edge", () => {
    const graph = built();
    for (const edge of [...graph.edges]) {
      expect(edge.basis.recordedFacts, `${edge.from}→${edge.to} counts over nothing`).toBeGreaterThan(0);
      expect(edge.count, `${edge.from}→${edge.to} exceeds its own basis`).toBeLessThanOrEqual(edge.basis.recordedFacts);
      expect(edge.basis.fromIso).toBe(PERIOD.fromIso);
      expect(edge.basis.source).toMatch(/spine/);
      // The ordering split adds up, so the honesty signal is a count rather than a label.
      expect(edge.ordering.clock + edge.ordering.recorded_link).toBe(edge.count);
    }
    for (const node of [...graph.unanswered]) {
      expect(node.basis.recordedFacts).toBeGreaterThan(0);
      expect(node.wouldSettleIt.length).toBeGreaterThan(0);
    }
  });

  it("refuses a graph over nothing rather than returning an empty one", () => {
    // W196's argument: zero interventions and "no interventions answered" are different claims,
    // and only one of them is true of a rail nobody has used.
    const empty = buildResponseGraph([], [], PERIOD);
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.errors).toContain("nothing_recorded");
    const undated = buildResponseGraph(interventionsFromSim(sim), [], { fromIso: "soon", toIso: "later" });
    expect(undated.ok).toBe(false);
    if (undated.ok) return;
    expect(undated.errors).toContain("period_missing_or_unreadable");
  });

  it("records that this graph rests on a clock that could not separate the facts", () => {
    // The finding, pinned. The sim stamps one timestamp per simulated week, so every link here
    // rests on the event naming the chain rather than on the clock — and the graph says so
    // instead of presenting the same number as though the clock had confirmed it.
    const graph = built();
    const clock = graph.edges.reduce((n, e) => n + e.ordering.clock, 0);
    const recorded = graph.edges.reduce((n, e) => n + e.ordering.recorded_link, 0);
    expect(recorded).toBeGreaterThan(0);
    expect(clock).toBe(0);
  });
});

describe("W212 an absence is never an edge", () => {
  it("keeps unanswered interventions out of the edges entirely", () => {
    // Exercised on a FIXTURE rather than on the sim, and the reason is worth recording: in a
    // six-week run every one of the 1,552 offers resolves — 311 booked, 1,226 expired, 15 opted
    // out — so the sim never produces an unanswered intervention and this branch would go
    // untested behind a golden that looks thorough. On a real rail the unanswered are the
    // largest group for weeks, which is exactly when a denominator must not quietly acquire them.
    const orphan = [
      { interventionId: "i-1", practiceId: "prac-x", chainId: "c-1", kind: "invitation_offered" as const, at: "2026-08-10T09:00:00Z" },
    ];
    const result = buildResponseGraph(orphan, [], PERIOD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.edges).toEqual([]);
    expect(result.graph.unanswered.map((u) => [u.kind, u.count])).toEqual([["invitation_offered", 1]]);
    expect(result.graph.unanswered[0]!.copy).toMatch(/not about the person/);
    // And it is a basis of one, not a rate of zero.
    expect(result.graph.unanswered[0]!.basis.recordedFacts).toBe(1);
  });

  it("accounts for every intervention the sim performed, in one place or the other", () => {
    const graph = built();
    const answeredChains = graph.edges.reduce((n, e) => n + e.count, 0);
    const unanswered = graph.unanswered.reduce((n, u) => n + u.count, 0);
    expect(graph.edges.every((e) => e.count > 0)).toBe(true);
    // Responses can exceed interventions, because one offer can be answered twice.
    expect(answeredChains + unanswered).toBeGreaterThanOrEqual(graph.basis.recordedFacts);
  });

  it("lists a kind the sim never performed as unobserved, not as a zero", () => {
    const graph = built();
    const unobserved = graph.unobserved.map((k) => k.kind);
    expect(unobserved).toContain("referral_sent");
    expect(unobserved).toContain("material_surfaced");
    for (const kind of unobserved) {
      expect(graph.edges.some((e) => e.from === kind), `${kind} has an edge`).toBe(false);
    }
    // Both directions: every declared kind is either observed or listed as not.
    const observed = new Set(graph.edges.map((e) => e.from));
    for (const node of graph.unanswered) observed.add(node.kind);
    expect([...observed, ...unobserved].sort()).toEqual([...ALL_INTERVENTION_KINDS].sort());
  });
});

describe("W212 the spine-to-response translation is declared, both ways", () => {
  it("maps every spine kind either to a response or to a stated reason it is not one", () => {
    const spineKinds = new Set(sim.log.map((e) => e.kind));
    expect(spineKinds.size).toBeGreaterThan(4);
    for (const kind of spineKinds) {
      const mapped = kind in SPINE_RESPONSE_KINDS;
      const excused = kind in SPINE_NOT_RESPONSES;
      expect(mapped || excused, `${kind} is neither a declared response nor declared not to be`).toBe(true);
      expect(mapped && excused, `${kind} is both`).toBe(false);
    }
  });

  it("targets only response kinds W211 actually declares", () => {
    // A translation to a kind nobody declared would be silently dropped by `respondTo` and the
    // graph would just be smaller, which is the failure mode a map like this exists to prevent.
    const declared = new Set(
      ALL_INTERVENTION_KINDS.flatMap((k) => [...RESPONSE_KINDS[k].advances, ...RESPONSE_KINDS[k].ends]),
    );
    for (const target of Object.values(SPINE_RESPONSE_KINDS)) {
      expect(declared.has(target), `${target} is not a declared response kind`).toBe(true);
    }
    for (const [kind, why] of Object.entries(SPINE_NOT_RESPONSES)) {
      expect(why.length, `${kind} is excused without a reason`).toBeGreaterThan(40);
    }
  });
});

describe("W212 golden", () => {
  it("renders the same graph every time", () => {
    expect(renderResponseGraph(built())).toMatchInlineSnapshot(`
      "Response graph — synthetic_sim
      Over 1552 recorded interventions, 2026-08-08 to 2026-09-19.
      Source: the event spine (W10), as recorded by the synthetic loop (W12).

      Answered:
      - invitation_offered → appointment_booked (reached): 311 of 1552 recorded invitation_offered interventions [clock 0, recorded link 311]
      - invitation_offered → invitation_expired (stopped): 1226 of 1552 recorded invitation_offered interventions [clock 0, recorded link 1226]
      - invitation_offered → patient_opted_out (stopped): 15 of 1552 recorded invitation_offered interventions [clock 0, recorded link 15]

      Nothing recorded against:

      Not performed in this period:
      - material_surfaced: The synthetic loop does not perform this kind of intervention, so there is nothing to count. This is not a rate of zero.
      - referral_sent: The synthetic loop does not perform this kind of intervention, so there is nothing to count. This is not a rate of zero.
      - reminder_offered: The synthetic loop does not perform this kind of intervention, so there is nothing to count. This is not a rate of zero."
    `);
  });

  it("is deterministic across runs of the sim", () => {
    const again = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
    const result = buildResponseGraph(interventionsFromSim(again), eventsFromSim(again), PERIOD);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(renderResponseGraph(result.graph)).toBe(renderResponseGraph(built()));
  });
});
