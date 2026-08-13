// W149 verify gate: "fixtures; the record belongs to the clinician and is correctable by them."
//
// "Belongs to the clinician" is tested as an ABSENCE — there is no function returning anybody
// else's trail, and none returning a practice's. That is stronger than a permission check,
// because a permission is a decision somebody can reverse and an absent function is not.

import { describe, expect, it } from "vitest";
import * as cpdModule from "./cpd";
import {
  CPD_REJECTION_COPY,
  recordCpdEntry,
  renderCpdExport,
  trailFor,
  type CpdEntry,
  type CpdInput,
  type CpdRejection,
} from "./cpd";

const input = (over: Partial<CpdInput> = {}): CpdInput => ({
  entryId: "e1",
  practiceId: "prac-1",
  clinicianId: "clin-1",
  kind: "opened",
  itemId: "item-1",
  sourceRef: "signed-off-source-1",
  itemTitle: "Placeholder material title — fixture only.",
  at: "2026-03-01",
  ...over,
});

function entry(over: Partial<CpdInput> = {}, existing: readonly CpdEntry[] = []): CpdEntry {
  const result = recordCpdEntry(input(over), existing);
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.entry;
}

/** The fixture set the gate asks for: two clinicians, a correction, and a second item. */
const OPENED = entry();
const MARKED = entry({ entryId: "e2", kind: "marked_read", at: "2026-03-02" });
const OTHER_CLINICIAN = entry({ entryId: "e3", clinicianId: "clin-2", at: "2026-03-03" });
const CORRECTION = entry(
  {
    entryId: "e4",
    kind: "corrected",
    at: "2026-03-05",
    correctsEntryId: "e1",
    note: "Opened by accident on a shared screen.",
  },
  [OPENED],
);
const ALL: CpdEntry[] = [OPENED, MARKED, OTHER_CLINICIAN, CORRECTION];

describe("W149 the record belongs to the clinician", () => {
  it("exports no function that could return somebody else's trail", () => {
    // Tested as an absence rather than as a permission: a permission is a decision somebody
    // can reverse, and 'who has not read this month's update' is the report every practice
    // would eventually run if the function existed to build it.
    for (const name of Object.keys(cpdModule)) {
      expect(name, `"${name}" reads as a cross-clinician view`).not.toMatch(
        /allTrails|practice|team|everyone|byPractice|compliance|outstanding|whoHas|unread/i,
      );
    }
  });

  it("takes the clinician id as the query, not as a filter afterwards", () => {
    expect(trailFor(ALL, "prac-1", "clin-1").entries.map((e) => e.entryId)).toEqual(["e1", "e2", "e4"]);
    expect(trailFor(ALL, "prac-1", "clin-2").entries.map((e) => e.entryId)).toEqual(["e3"]);
  });

  it("another clinician's entries are absent, not merely unshown", () => {
    expect(JSON.stringify(trailFor(ALL, "prac-1", "clin-1"))).not.toContain("clin-2");
    expect(JSON.stringify(trailFor(ALL, "prac-1", "clin-1"))).not.toContain("e3");
  });

  it("a clinician with no entries gets an empty trail rather than everyone's", () => {
    const empty = trailFor(ALL, "prac-1", "clin-nobody");
    expect(empty.entries).toEqual([]);
    expect(empty.clinicianId).toBe("clin-nobody");
  });

  it("says in the export that nobody else can see it", () => {
    const rendered = renderCpdExport(trailFor(ALL, "prac-1", "clin-1"), "2026-08-11");
    expect(rendered).toContain("Meherr provides no view of it to anybody else");
  });
});

describe("W149 correctable by its subject", () => {
  it("appends a correction rather than overwriting the original", () => {
    // The reading really did get logged. A record that can be silently rewritten is not
    // evidence of anything, which is the point of a CPD trail.
    const trail = trailFor(ALL, "prac-1", "clin-1");
    expect(trail.entries.map((e) => e.entryId)).toContain("e1");
    expect(trail.correctedEntryIds).toEqual(["e1"]);
  });

  it("marks the corrected entry in the export instead of removing it", () => {
    const rendered = renderCpdExport(trailFor(ALL, "prac-1", "clin-1"), "2026-08-11");
    expect(rendered).toContain("the clinician has since said this was wrong");
    expect(rendered).toContain("Opened by accident on a shared screen.");
  });

  it("refuses a correction to somebody else's entry", () => {
    // A correction is a claim about a person's own professional record, and one person cannot
    // make it about another.
    const result = recordCpdEntry(
      input({ entryId: "e9", clinicianId: "clin-2", kind: "corrected", correctsEntryId: "e1", note: "not mine" }),
      ALL,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain("not_your_entry");
    expect(CPD_REJECTION_COPY.not_your_entry).toContain("only they can make it");
  });

  it("refuses a correction that names nothing or explains nothing", () => {
    expect(
      recordCpdEntry(input({ entryId: "e9", kind: "corrected", note: "x" }), ALL).ok,
    ).toBe(false);
    const noNote = recordCpdEntry(
      input({ entryId: "e9", kind: "corrected", correctsEntryId: "e1" }),
      ALL,
    );
    expect(!noNote.ok && noNote.errors).toContain("correction_without_note");
  });

  it("refuses a correction of a correction, so the trail stays readable", () => {
    const result = recordCpdEntry(
      input({ entryId: "e9", kind: "corrected", correctsEntryId: "e4", note: "again" }),
      ALL,
    );
    expect(!result.ok && result.errors).toContain("correction_of_a_correction");
  });
});

describe("W149 it records reading, not comprehension", () => {
  it("has no field for understanding, agreement or action", () => {
    // The moment there is one, a practice has a measure of whether its clinicians are learning
    // properly — a different product, and a worse one.
    // W209 added `practiceId`, and this pin fired — which is what it is for. It is a scope key,
    // not a measure of the clinician: it says which practice minted the id in `clinicianId`,
    // because that id is only unique inside one. Nothing about attainment came with it.
    expect(Object.keys(OPENED).sort()).toEqual([
      "at", "clinicianId", "correctsEntryId", "entryId", "itemId", "itemTitle", "kind", "note",
      "practiceId", "sourceRef",
    ]);
    for (const key of Object.keys(OPENED)) {
      expect(key).not.toMatch(/understood|comprehen|score|quiz|passed|agree|applied|acted/i);
    }
  });

  it("has a kind vocabulary describing activity, never attainment", () => {
    const kinds = new Set(ALL.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(["corrected", "marked_read", "opened"]);
    for (const kind of kinds) {
      expect(kind).not.toMatch(/completed|passed|certified|competent|mastered/i);
    }
  });

  it("says so in the export, where the record travels away from the product", () => {
    // An export leaves the product that explains it, and a reader will otherwise supply their
    // own meaning for what "read" means here.
    const rendered = renderCpdExport(trailFor(ALL, "prac-1", "clin-1"), "2026-08-11");
    expect(rendered).toContain("not a record of comprehension, agreement, or of anything being acted on");
  });
});

describe("W149 fixtures and the export", () => {
  it("orders oldest first, deterministically", () => {
    const forwards = trailFor(ALL, "prac-1", "clin-1").entries.map((e) => e.entryId);
    const backwards = trailFor([...ALL].reverse(), "prac-1", "clin-1").entries.map((e) => e.entryId);
    expect(backwards).toEqual(forwards);
    expect(forwards).toEqual(["e1", "e2", "e4"]);
  });

  it("carries the source on every entry, so an export can be checked", () => {
    for (const e of trailFor(ALL, "prac-1", "clin-1").entries) expect(e.sourceRef).toBeTruthy();
    expect(renderCpdExport(trailFor(ALL, "prac-1", "clin-1"), "2026-08-11")).toContain("signed-off-source-1");
  });

  it.each<[Partial<CpdInput>, CpdRejection]>([
    [{ clinicianId: " " }, "clinician_missing"],
    [{ itemId: "" }, "item_missing"],
    [{ sourceRef: "" }, "source_missing"],
    [{ at: "someday" }, "date_missing_or_unreadable"],
  ])("refuses %o with %s", (over, expected) => {
    const result = recordCpdEntry(input(over), []);
    expect(!result.ok && result.errors).toContain(expected);
  });

  it("explains every refusal it can produce", () => {
    const reasons: CpdRejection[] = [
      "clinician_missing", "item_missing", "source_missing", "date_missing_or_unreadable",
      "correction_without_target", "correction_without_note", "correction_of_a_correction",
      "not_your_entry",
    ];
    for (const reason of reasons) {
      expect(CPD_REJECTION_COPY[reason].length, reason).toBeGreaterThan(15);
    }
  });

  it("renders an empty trail without implying anything about it", () => {
    const rendered = renderCpdExport(trailFor([], "prac-1", "clin-1"), "2026-08-11");
    expect(rendered).toContain("0 entr(y/ies)");
    expect(rendered.toLowerCase()).not.toMatch(/behind|overdue|insufficient|should/);
  });
});
