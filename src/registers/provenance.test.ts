// W62 verify gate (unit half): no interval becomes renderable without provenance.
// The rendered-page half is asserted in e2e/registers.spec.ts.

import { describe, expect, it } from "vitest";
import type { GuidelineInterval, GuidelineIntervalId, ConditionCode } from "@/domain/types";
import { cadenceLabel, describeAge, toViewInterval, toViewIntervals } from "./provenance";

const NOW = new Date("2026-08-10T00:00:00Z");

function interval(over: Partial<GuidelineInterval> = {}): GuidelineInterval {
  return {
    id: "i1" as GuidelineIntervalId,
    conditionCode: "c1" as ConditionCode,
    name: "Example scheduled review",
    intervalMonths: 12,
    provenance: {
      citation: "Example Guideline Body, Example guidance",
      url: "https://example.invalid/guidance",
      publishedOn: "2026-01-01",
      retrievedOn: "2026-06-01",
    },
    ...over,
  };
}

describe("W62 provenance view", () => {
  it("carries citation, url and last-reviewed date", () => {
    const view = toViewInterval(interval(), NOW);

    expect(view).not.toBeNull();
    expect(view?.provenance.citation).toBe("Example Guideline Body, Example guidance");
    expect(view?.provenance.url).toBe("https://example.invalid/guidance");
    expect(view?.provenance.reviewedOn).toBe("2026-06-01");
    expect(view?.provenance.reviewedAgo).toBe("2 months ago");
  });

  it("shows the schedule as a cadence, never as a recommendation", () => {
    expect(cadenceLabel(1)).toBe("every month");
    expect(cadenceLabel(6)).toBe("every 6 months");
    expect(cadenceLabel(12)).toBe("every 12 months");
    // Nothing here says a patient needs anything.
    for (const months of [1, 3, 6, 12, 24]) {
      expect(cadenceLabel(months)).not.toMatch(/due|overdue|needs|should|required/i);
    }
  });

  it.each([
    ["provenance absent", { provenance: undefined as never }],
    ["citation too short to identify a source", { provenance: { ...interval().provenance, citation: "n/a" } }],
    ["citation blank", { provenance: { ...interval().provenance, citation: "        " } }],
    ["url not https", { provenance: { ...interval().provenance, url: "http://example.invalid/x" } }],
    ["url empty", { provenance: { ...interval().provenance, url: "" } }],
    ["review date malformed", { provenance: { ...interval().provenance, retrievedOn: "June 2026" } }],
  ])("refuses to make an interval renderable when %s", (_label, over) => {
    expect(toViewInterval(interval(over as Partial<GuidelineInterval>), NOW)).toBeNull();
  });

  it("withholds unusable rows and counts them rather than dropping them silently", () => {
    const result = toViewIntervals(
      [
        interval({ id: "ok" as GuidelineIntervalId }),
        interval({ id: "bad" as GuidelineIntervalId, provenance: { ...interval().provenance, url: "" } }),
      ],
      NOW,
    );

    expect(result.shown.map((v) => v.id)).toEqual(["ok"]);
    expect(result.withheld).toBe(1);
  });

  it("every shown interval has a complete provenance line, whatever the input", () => {
    // The property the unit's gate names, asserted over a mixed batch.
    const batch = [
      interval({ id: "a" as GuidelineIntervalId }),
      interval({ id: "b" as GuidelineIntervalId, provenance: { ...interval().provenance, citation: "x" } }),
      interval({ id: "c" as GuidelineIntervalId, intervalMonths: 3 }),
      interval({ id: "d" as GuidelineIntervalId, provenance: undefined as never }),
    ];

    for (const view of toViewIntervals(batch, NOW).shown) {
      expect(view.provenance.citation.length).toBeGreaterThanOrEqual(8);
      expect(view.provenance.url.startsWith("https://")).toBe(true);
      expect(view.provenance.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(view.provenance.reviewedAgo).not.toBe("");
    }
  });
});

describe("W62 review age", () => {
  it.each([
    ["2026-08-10", "today"],
    ["2026-08-09", "yesterday"],
    ["2026-08-01", "9 days ago"],
    ["2026-07-01", "1 month ago"],
    ["2026-06-01", "2 months ago"],
    ["2024-08-10", "2 years ago"],
  ])("renders %s as %s", (reviewedOn, expected) => {
    expect(describeAge(reviewedOn, NOW)).toBe(expected);
  });

  it("does not pretend a future or unreadable date is fresh", () => {
    expect(describeAge("2027-01-01", NOW)).toBe("reviewed in the future");
    expect(describeAge("whenever", NOW)).toBe("review date unreadable");
  });
});
