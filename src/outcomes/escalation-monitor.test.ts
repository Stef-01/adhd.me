// W171 verify gate: an unrouted escalation stays visible and ages, and the absence of one is
// never reported as "none needed".

import { describe, expect, it } from "vitest";
import { foldIsOrderIndependent } from "../quality/order-independence";
import * as mod from "./escalation-monitor";
import {
  EMPTY_REASON_COPY,
  type EscalationKey,
  type EscalationSighting,
  monitorEscalations,
  observe,
  renderEscalationMonitor,
} from "./escalation-monitor";

const K: EscalationKey = { pathwayId: "cardio-v1", versionHash: "h1", factCode: "egfr_declining" };
const K2: EscalationKey = { pathwayId: "cardio-v1", versionHash: "h1", factCode: "bp_unstable" };

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString();

describe("W171 an escalation ages from when it was first asked", () => {
  it("records the first sighting", () => {
    const [s] = observe([], { unrouted: [K], routed: [] }, day(0));
    expect(s).toMatchObject({ firstSeenAt: day(0), lastSeenAt: day(0), routedAt: null, reopenings: 0 });
  });

  it("does not reset firstSeenAt when it is seen again", () => {
    // The whole mechanic. If a later sighting moved firstSeenAt forward, every escalation would
    // read as new on the day you looked at it and nothing would ever age — the failure would be
    // invisible, because the list would still be correct about WHICH escalations are open.
    const after = observe(observe([], { unrouted: [K], routed: [] }, day(0)), { unrouted: [K], routed: [] }, day(30));
    expect(after).toHaveLength(1);
    expect(after[0]!.firstSeenAt).toBe(day(0));
    expect(after[0]!.lastSeenAt).toBe(day(30));

    const report = monitorEscalations(after, day(30), 5);
    expect(report.open[0]!.ageDays).toBe(30);
  });

  it("keeps the original firstSeenAt when a routed escalation reopens", () => {
    // "Outstanding since January, briefly answered in February" is the true shape. Restarting the
    // clock on the day the rule was withdrawn would flatter the record.
    const seen = observe([], { unrouted: [K], routed: [] }, day(0));
    const ruled = observe(seen, { unrouted: [], routed: [K] }, day(10));
    const reopened = observe(ruled, { unrouted: [K], routed: [] }, day(20));

    expect(ruled[0]!.routedAt).toBe(day(10));
    expect(reopened[0]).toMatchObject({ firstSeenAt: day(0), routedAt: null, reopenings: 1 });
    expect(monitorEscalations(reopened, day(20), 5).open[0]!.ageDays).toBe(20);
  });

  it("records an escalation routed the first time it was ever seen, and closes it", () => {
    const [s] = observe([], { unrouted: [], routed: [K] }, day(3));
    expect(s).toMatchObject({ firstSeenAt: day(3), routedAt: day(3), reopenings: 0 });
    expect(monitorEscalations([s!], day(9), 1).open).toEqual([]);
  });

  it("does not re-stamp routedAt on an escalation that already has a rule", () => {
    const ruled = observe(observe([], { unrouted: [], routed: [K] }, day(1)), { unrouted: [], routed: [K] }, day(40));
    expect(ruled[0]!.routedAt).toBe(day(1));
  });
});

describe("W171 nothing leaves the list by getting old", () => {
  it("an escalation nobody has answered in a year is still open, and says so", () => {
    let sightings = observe([], { unrouted: [K], routed: [] }, day(0));
    for (const d of [30, 90, 200, 365]) {
      sightings = observe(sightings, { unrouted: [K], routed: [] }, day(d));
    }
    const report = monitorEscalations(sightings, day(365), 40);
    expect(report.open).toHaveLength(1);
    expect(report.open[0]!.ageDays).toBe(365);
    expect(report.oldestAgeDays).toBe(365);
  });

  it("routing is the only thing that removes it", () => {
    const old = observe([], { unrouted: [K], routed: [] }, day(0));
    expect(monitorEscalations(old, day(400), 9).open).toHaveLength(1);

    const routed = observe(old, { unrouted: [], routed: [K] }, day(400));
    const after = monitorEscalations(routed, day(400), 9);
    expect(after.open).toEqual([]);
    expect(after.emptyReason).toBe("all_routed");
  });

  it("oldest first, and a tie does not resolve by input order", () => {
    // Recency arithmetic, not prioritisation — but a fold to "the oldest" still has to be stable
    // (W167/W168). Two escalations first seen at the same instant tie on age.
    const tied: EscalationSighting[] = [K, K2].map((k) => ({
      ...k,
      firstSeenAt: day(0),
      lastSeenAt: day(5),
      routedAt: null,
      reopenings: 0,
    }));
    const { stable } = foldIsOrderIndependent((xs) => monitorEscalations(xs, day(5), 2), tied);
    expect(stable).toBe(true);

    const mixed = monitorEscalations(
      [{ ...K2, firstSeenAt: day(4), lastSeenAt: day(5), routedAt: null, reopenings: 0 }, ...tied.slice(0, 1)],
      day(5),
      2,
    );
    expect(mixed.open.map((o) => o.ageDays)).toEqual([5, 1]);
  });
});

describe("W171 zero is not an answer", () => {
  const emptyReasonOf = (sightings: EscalationSighting[], evaluated: number) =>
    monitorEscalations(sightings, day(1), evaluated).emptyReason;

  it("distinguishes nothing evaluated from nothing flagged from everything routed", () => {
    const routed: EscalationSighting = { ...K, firstSeenAt: day(0), lastSeenAt: day(0), routedAt: day(0), reopenings: 0 };
    expect(emptyReasonOf([], 0)).toBe("nothing_evaluated");
    expect(emptyReasonOf([], 12)).toBe("evaluated_none_flagged");
    expect(emptyReasonOf([routed], 12)).toBe("all_routed");
  });

  it("reports no empty reason when something is open", () => {
    const report = monitorEscalations(observe([], { unrouted: [K], routed: [] }, day(0)), day(1), 3);
    expect(report.emptyReason).toBeNull();
  });

  it("reports a null oldest age rather than zero when nothing is open", () => {
    // Zero days would read as "something arrived today". Null is the absence of a measurement.
    expect(monitorEscalations([], day(1), 4).oldestAgeDays).toBeNull();
  });

  it("carries coverage so an empty list can be checked rather than believed", () => {
    const sightings = observe(observe([], { unrouted: [K], routed: [] }, day(0)), { unrouted: [], routed: [K] }, day(2));
    expect(monitorEscalations(sightings, day(2), 17).coverage).toEqual({
      verdictsEvaluated: 17,
      everSeen: 1,
      routed: 1,
    });
  });

  it("never phrases an empty list as nothing being needed", () => {
    const renderings = [
      ...Object.values(EMPTY_REASON_COPY),
      renderEscalationMonitor(monitorEscalations([], day(1), 0), day(1)),
      renderEscalationMonitor(monitorEscalations([], day(1), 12), day(1)),
    ];
    expect(renderings.length).toBeGreaterThan(3);
    for (const text of renderings) {
      expect(text.length).toBeGreaterThan(0);
      expect(text.toLowerCase()).not.toMatch(/\b(none|nothing|no escalations?) (needed|required|outstanding)\b/);
      expect(text.toLowerCase()).not.toMatch(/\b(all clear|nothing to do|no action needed)\b/);
    }
  });

  it("says which of the three it is, on the page, not only in the object", () => {
    const nothing = renderEscalationMonitor(monitorEscalations([], day(1), 0), day(1));
    const flagged = renderEscalationMonitor(monitorEscalations([], day(1), 9), day(1));
    expect(nothing).toContain(EMPTY_REASON_COPY.nothing_evaluated);
    expect(flagged).toContain(EMPTY_REASON_COPY.evaluated_none_flagged);
    expect(nothing).not.toBe(flagged);
  });
});

describe("W171 the report gives an age and refuses to classify it", () => {
  const openReport = () =>
    monitorEscalations(
      observe(observe([], { unrouted: [K, K2], routed: [] }, day(0)), { unrouted: [K, K2], routed: [] }, day(34)),
      day(34),
      21,
    );

  it("shows the days waiting for each", () => {
    const text = renderEscalationMonitor(openReport(), day(34));
    expect(text).toContain("34 day(s)");
    expect(text).toContain("egfr_declining");
    expect(text).toContain("bp_unstable");
    expect(text).toContain("Nothing leaves this list by getting old.");
  });

  it("uses no urgency vocabulary anywhere it renders", () => {
    // W121: "a timeframe attached to a clinical escalation is a judgement about urgency, and that
    // judgement belongs in content the founder signs off". So the obvious monitoring feature —
    // a threshold, a RAG status, an "overdue" flag — is exactly what this module must not build.
    const texts = [
      renderEscalationMonitor(openReport(), day(34)),
      renderEscalationMonitor(monitorEscalations([], day(1), 0), day(1)),
      ...Object.values(EMPTY_REASON_COPY),
    ];
    // "too long" is deliberately NOT banned: the module's refusal sentence contains it, and the
    // next test pins that sentence. What is banned is the vocabulary of a verdict.
    const banned =
      /\b(overdue|urgent|urgently|urgency|breach|breached|escalate now|red|amber|green|critical|priority|deadline|sla|late)\b/i;
    for (const text of texts) {
      const hit = text.match(banned);
      expect(hit?.[0] ?? null, `rendered report classifies urgency: "${hit?.[0]}"`).toBeNull();
    }
  });

  it("says out loud that it is not judging the age", () => {
    expect(renderEscalationMonitor(openReport(), day(34))).toContain("It does not say whether that is");
  });

  it("exports no threshold, status or severity helper", () => {
    // Guarantee-as-absence (W68's shape): the reassurance is that no function exists that could
    // classify an age, so no caller can obtain one. Read off the real module namespace, not a
    // list retyped here — a hand-written list would agree with itself forever.
    expect(Object.keys(mod).sort()).toEqual([
      "EMPTY_REASON_COPY",
      "monitorEscalations",
      "observe",
      "renderEscalationMonitor",
    ]);
  });
});
