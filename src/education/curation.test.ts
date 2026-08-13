// W145 verify gate: "export-list test — no generation entry point exists."
//
// That is the named gate and it is the easy half. The half this unit turns on is the one
// docs/EDUCATION-BOUNDARY-W144.md argued a unit earlier: the engine may order and must not
// withhold. That is tested as a PERMUTATION property — the output is the same multiset as the
// in-scope input — because a by-example test would pass on the day it was written and say
// nothing about a `limit` parameter somebody adds next quarter.

import { describe, expect, it } from "vitest";
import * as curationModule from "./curation";
import {
  CURATION_REJECTION_COPY,
  curate,
  describeCuration,
  rejectionsFor,
  type CurationContext,
  type EducationItem,
} from "./curation";

const item = (over: Partial<EducationItem> = {}): EducationItem => ({
  itemId: "item-1",
  conditionCode: "placeholder_register_a",
  title: "Placeholder material title — fixture only.",
  sourceRef: "signed-off-source-1",
  relevantFactCodes: [],
  ...over,
});

const ITEMS: EducationItem[] = [
  item({ itemId: "item-a", relevantFactCodes: ["fact_x"] }),
  item({ itemId: "item-b", relevantFactCodes: ["fact_x", "fact_y"] }),
  item({ itemId: "item-c", relevantFactCodes: [] }),
  item({ itemId: "item-d", conditionCode: "placeholder_register_b", relevantFactCodes: ["fact_x"] }),
];

const context = (over: Partial<CurationContext> = {}): CurationContext => ({
  practiceConditionCodes: ["placeholder_register_a"],
  recordedFactCodes: ["fact_x", "fact_y"],
  ...over,
});

describe("W145 no generation entry point exists", () => {
  it("exports nothing whose name suggests writing text", () => {
    // The named gate. The only way to smuggle generation in is to add an entry point, and an
    // entry point has a name — the same reason W120's export-list test was sufficient there.
    for (const name of Object.keys(curationModule)) {
      expect(name, `"${name}" reads as producing text`).not.toMatch(
        /generate|write|compose|draft|summar|rewrite|paraphrase|expand|author|complete/i,
      );
    }
    expect(Object.keys(curationModule).length).toBeGreaterThan(0);
  });

  it("never produces a string that was not already on an item", () => {
    // Stronger than the naming rule: every string in the result traces to the input or to this
    // module's own fixed copy. Nothing is composed about a patient.
    const result = curate(ITEMS, context());
    for (const ranked of result.ordered) {
      expect(ITEMS.map((i) => i.title)).toContain(ranked.item.title);
      expect(ITEMS.map((i) => i.sourceRef)).toContain(ranked.item.sourceRef);
    }
  });

  it("refuses an item with no traceable source", () => {
    // W152 makes this a type-level guarantee later. Refusing at the door means the weaker form
    // exists from the first unit rather than only from the last.
    expect(rejectionsFor(item({ sourceRef: "" }))).toEqual(["item_missing_source"]);
    expect(curate([item({ itemId: "orphan", sourceRef: "" })], context()).ordered).toEqual([]);
    expect(CURATION_REJECTION_COPY.item_missing_source).toContain("whatever it says");
  });
});

describe("W145 may order, must not withhold", () => {
  it("returns a PERMUTATION of the in-scope items", () => {
    // The structural form of the rule. A `limit` added next quarter fails here rather than
    // shipping, which a by-example test would not catch.
    const result = curate(ITEMS, context());
    const inScopeIds = ITEMS.filter((i) => i.conditionCode === "placeholder_register_a")
      .map((i) => i.itemId)
      .sort();
    expect(result.ordered.map((r) => r.item.itemId).sort()).toEqual(inScopeIds);
    expect(result.consideredCount).toBe(result.ordered.length);
  });

  it("shows every item even when none matches a recorded fact", () => {
    // The case a relevance threshold would silently swallow.
    const result = curate(ITEMS, context({ recordedFactCodes: [] }));
    expect(result.ordered).toHaveLength(3);
    for (const ranked of result.ordered) expect(ranked.matchingFactCount).toBe(0);
  });

  it("has no result field that could hold what was dropped", () => {
    const result = curate(ITEMS, context());
    expect(Object.keys(result)).toEqual([
      "ordered",
      "consideredCount",
      "outOfScope",
      "orderingBasis",
    ]);
    for (const key of Object.keys(result)) {
      expect(key).not.toMatch(/withheld|hidden|suppressed|truncated|top|limit|cutoff/i);
    }
  });

  it("takes no count, threshold or cutoff — and no overload adds one", () => {
    // @ts-expect-error — curate takes items and a context, and nothing else.
    void (() => curate(ITEMS, context(), 1));
    // @ts-expect-error — the context has no limit either.
    void (() => curate(ITEMS, { ...context(), limit: 1 }));
    expect(true).toBe(true);
  });

  it("says in words that nothing was held back", () => {
    const result = curate(ITEMS, context());
    expect(result.orderingBasis).toContain("nothing has been held back");
    expect(result.orderingBasis).toContain("suggestion about where to start");
    expect(describeCuration(result)[0]).toContain("all shown");
  });

  it("describes the order it actually used, including when there was nothing to order against", () => {
    // W151's library view supplies no recorded facts, so the sort key falls back to item id.
    // Claiming the list reflects a patient's record in that case would be a false account of a
    // real ordering — and a reader cannot check an account of the order that is not the order.
    const withFacts = curate(ITEMS, context());
    const withoutFacts = curate(ITEMS, { ...context(), recordedFactCodes: [] });
    expect(withFacts.orderingBasis).toContain("this patient's recorded facts");
    expect(withoutFacts.orderingBasis).toContain("Ordered by item id");
    expect(withoutFacts.orderingBasis).not.toContain("this patient's recorded facts");
    // The promise itself is unconditional; only the account of the sort key changes.
    expect(withoutFacts.orderingBasis).toContain("nothing has been held back");
  });
});

describe("W145 scoping on a practice fact is not withholding", () => {
  it("excludes material for a register the practice does not run", () => {
    // A statement about the PRACTICE, not about the patient.
    const result = curate(ITEMS, context());
    expect(result.outOfScope).toEqual([
      { itemId: "item-d", conditionCode: "placeholder_register_b" },
    ]);
  });

  it("NAMES what was out of scope rather than omitting it", () => {
    // "We have material you are not seeing because you do not run that register" is a different
    // statement from silence, and only one of them lets a practice notice it should run it.
    const lines = describeCuration(curate(ITEMS, context()));
    expect(lines.join(" ")).toContain("registers this practice does not run");
    expect(lines.join(" ")).toContain("placeholder_register_b");
  });

  it("includes it once the practice runs that register", () => {
    const result = curate(
      ITEMS,
      context({ practiceConditionCodes: ["placeholder_register_a", "placeholder_register_b"] }),
    );
    expect(result.ordered.map((r) => r.item.itemId).sort()).toEqual([
      "item-a", "item-b", "item-c", "item-d",
    ]);
    expect(result.outOfScope).toEqual([]);
  });

  it("recorded facts change the ORDER and never the membership", () => {
    // The distinction the boundary document turns on. Same items, different order.
    const withFacts = curate(ITEMS, context({ recordedFactCodes: ["fact_x", "fact_y"] }));
    const withoutFacts = curate(ITEMS, context({ recordedFactCodes: [] }));
    expect(withFacts.ordered.map((r) => r.item.itemId).sort()).toEqual(
      withoutFacts.ordered.map((r) => r.item.itemId).sort(),
    );
    expect(withFacts.ordered[0]?.item.itemId).toBe("item-b"); // two matching facts
    expect(withoutFacts.ordered[0]?.item.itemId).toBe("item-a"); // tie, broken by id
  });
});

describe("W145 the ranking is shown as a ranking", () => {
  it("carries a position and the count behind it", () => {
    const result = curate(ITEMS, context());
    expect(result.ordered.map((r) => [r.position, r.item.itemId, r.matchingFactCount])).toEqual([
      [1, "item-b", 2],
      [2, "item-a", 1],
      [3, "item-c", 0],
    ]);
  });

  it("is deterministic — ties break on item id, not on input order", () => {
    const forwards = curate(ITEMS, context({ recordedFactCodes: [] }));
    const backwards = curate([...ITEMS].reverse(), context({ recordedFactCodes: [] }));
    expect(backwards.ordered.map((r) => r.item.itemId)).toEqual(
      forwards.ordered.map((r) => r.item.itemId),
    );
  });

  it("handles an empty library without inventing anything", () => {
    const result = curate([], context());
    expect(result.ordered).toEqual([]);
    expect(describeCuration(result)[0]).toContain("0 item(s)");
  });
});
