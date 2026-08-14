// W218: the response-graph disclosure floor, and the privacy classification it settles.
//
// W212 built the graph and its record-class entry deferred one question to here: a graph can hold
// shape a single link cannot, and the shape is a SMALL CELL — a count of one is a person. These
// tests pin the settlement: the floor is declared data (not a tunable parameter), a kind with a
// sub-floor cell is withheld WHOLE, the total is recomputed over disclosed kinds so a withheld
// count cannot be recovered by subtraction (W197), the statement is always present (W145/W197), and
// the graph holds no patient identity by type. Erasure is composed — nothing is stored.
//
// Non-vacuity, four breaks: raise a kept cell's floor exposure by dropping the recompute and the
// total test fails; drop the whole-kind rule to per-cell and the render leaks "2 of 9"; add a
// floor parameter and the arity test fails; give the edge a patient field and the @ts-expect-error
// goes unused and tsc fails.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RecordedBasis } from "@/reporting/model";
import { RECORD_CLASSES } from "@/privacy/record-classes";
import type { InterventionKind } from "./response";
import {
  RESPONSE_GRAPH_CELL_FLOOR,
  RESPONSE_GRAPH_DISCLOSURE_COPY,
  SHIPPED_RESPONSE_GRAPHS,
  discloseResponseGraph,
  renderResponseGraph,
  type GraphEdge,
  type ResponseGraph,
} from "./response-graph";

const basis = (recordedFacts: number): RecordedBasis => ({
  source: "test fixture",
  recordedFacts,
  fromIso: "2026-01-01",
  toIso: "2026-03-31",
});

const edge = (
  from: InterventionKind,
  to: string,
  count: number,
  perKind: number,
): GraphEdge => ({
  from,
  to,
  verdict: "reached",
  count,
  ordering: { clock: 0, recorded_link: count },
  basis: basis(perKind),
});

/**
 * A graph with one kept kind (all cells >= 5) and one withheld kind (a cell of 2).
 *
 * invitation_offered: 20 booked + 8 expired + 10 unanswered = 38 interventions, every cell clears.
 * reminder_offered:    2 booked +               7 unanswered =  9 interventions, the 2 does not.
 * referral_sent:      unobserved — a count of zero people, never a small cell.
 */
const mixedGraph = (): ResponseGraph => ({
  provenance: "synthetic_sim",
  basis: basis(47),
  edges: [
    edge("invitation_offered", "appointment_booked", 20, 38),
    edge("invitation_offered", "invitation_expired", 8, 38),
    edge("reminder_offered", "appointment_booked", 2, 9),
  ],
  unanswered: [
    { kind: "invitation_offered", count: 10, wouldSettleIt: ["appointment_booked"], copy: "nothing recorded", basis: basis(38) },
    { kind: "reminder_offered", count: 7, wouldSettleIt: ["appointment_booked"], copy: "nothing recorded", basis: basis(9) },
  ],
  unobserved: [{ kind: "referral_sent", why: "The synthetic loop does not perform this kind." }],
});

describe("W218 the floor is declared data, not a tunable parameter", () => {
  it("is fixed at 5 with a written reason", () => {
    expect(RESPONSE_GRAPH_CELL_FLOOR.floor).toBe(5);
    expect(RESPONSE_GRAPH_CELL_FLOOR.why.length).toBeGreaterThan(40);
  });

  it("is read from the register, so the function takes no floor argument", () => {
    // W196's rule: a floor passed per disclosure is a floor somebody tunes after seeing the cell.
    // Adding a parameter raises the arity and fails this — the same mutation guard W196 used.
    expect(discloseResponseGraph.length).toBe(1);
  });
});

describe("W218 a kind with a sub-floor cell is withheld whole", () => {
  it("names the withheld kind and keeps the clearing one", () => {
    const disclosed = discloseResponseGraph(mixedGraph());
    expect(disclosed.withheldKinds.map((w) => w.kind)).toEqual(["reminder_offered"]);
    expect(disclosed.graph.edges.every((e) => e.from !== "reminder_offered")).toBe(true);
    expect(disclosed.graph.unanswered.every((n) => n.kind !== "reminder_offered")).toBe(true);
  });

  it("leaves no sub-floor count in the rendered graph, while the clearing kind is shown", () => {
    // W197: the test hunts the rendered document for the value. A per-cell suppression that left
    // the kind's basis and other cells in place would render "2 of 9" and let a reader subtract.
    const rendered = renderResponseGraph(discloseResponseGraph(mixedGraph()).graph);
    expect(rendered).not.toContain("reminder_offered");
    expect(rendered).not.toContain("2 of 9");
    expect(rendered).toContain("20 of 38");
  });

  it("recomputes the total over kept kinds, so the withheld count is not recoverable", () => {
    // The differencing guard, stated as an assertion: 47 - 38 would recover reminder_offered's 9.
    // The disclosed total is the kept kinds' sum alone, so a withheld kind contributes to no shown
    // number.
    expect(discloseResponseGraph(mixedGraph()).graph.basis.recordedFacts).toBe(38);
  });
});

describe("W218 the statement is always present", () => {
  it("names what was withheld", () => {
    const disclosed = discloseResponseGraph(mixedGraph());
    expect(disclosed.statement).toContain(RESPONSE_GRAPH_DISCLOSURE_COPY.withheld);
    expect(disclosed.statement).toContain("reminder_offered");
  });

  it("says so even when nothing was withheld — its absence would be information", () => {
    const clean: ResponseGraph = {
      ...mixedGraph(),
      edges: [edge("invitation_offered", "appointment_booked", 20, 38), edge("invitation_offered", "invitation_expired", 8, 38)],
      unanswered: [{ kind: "invitation_offered", count: 10, wouldSettleIt: ["appointment_booked"], copy: "nothing recorded", basis: basis(38) }],
      basis: basis(38),
    };
    const disclosed = discloseResponseGraph(clean);
    expect(disclosed.withheldKinds).toEqual([]);
    expect(disclosed.statement).toBe(RESPONSE_GRAPH_DISCLOSURE_COPY.nothing_withheld);
    // Nothing withheld means nothing removed and the total is untouched.
    expect(disclosed.graph.basis.recordedFacts).toBe(38);
  });
});

describe("W218 the graph holds no patient identity it does not need", () => {
  it("an edge has nowhere to put one — by type", () => {
    // @ts-expect-error — a patient identity is an excess property the edge type forbids.
    const leak: GraphEdge = { ...edge("invitation_offered", "appointment_booked", 5, 5), patientId: "p1" };
    expect(leak.count).toBe(5);
  });

  it("an edge has nowhere to put one — by value", () => {
    const one = edge("invitation_offered", "appointment_booked", 5, 5);
    expect(Object.keys(one).sort()).toEqual(["basis", "count", "from", "ordering", "to", "verdict"]);
  });
});

describe("W218 erasure reaches every class the graph holds", () => {
  it("stores nothing, so there is nothing to scrub", () => {
    // Composed erasure (W180): no globalThis store here, and no shipped graph, so scrubbing the
    // source rail leaves nothing behind in this module.
    const source = readFileSync(path.resolve(__dirname, "response-graph.ts"), "utf8");
    expect(/globalThis as \{/.test(source)).toBe(false);
    expect(SHIPPED_RESPONSE_GRAPHS).toEqual([]);
  });

  it("is classified no_patient_identity, and the record-class deferral is settled", () => {
    const rc = RECORD_CLASSES.find((c) => c.module === "src/outcomes/response-graph.ts");
    expect(rc?.handling).toBe("no_patient_identity");
    expect(rc?.rationale).toContain("W218");
    expect(rc?.rationale).toContain("discloseResponseGraph");
    // The deferral W212 left must be gone, not still promising the question to a later unit.
    expect(rc?.rationale).not.toContain("W218 is where the floor question is settled");
  });
});
