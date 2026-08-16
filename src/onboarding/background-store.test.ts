import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { backgroundHistory, latestBackground, reviewQueue, saveBackground } from "./background-store";
import type { ClinicianBackground } from "./background";

const store = () => path.join(mkdtempSync(path.join(tmpdir(), "bg-")), "backgrounds.jsonl");

const background = (over: Partial<ClinicianBackground> = {}): ClinicianBackground => ({
  clinicianId: "dr-a",
  displayName: "Dr A",
  unread: [],
  readBackConfirmed: false,
  facets: [
    { key: "care:titration", kind: "care", label: "Titration", status: "accepted", decidedBy: "Reviewer", quote: "I do titration." },
    { key: "manner:unhurried", kind: "manner", label: "Unhurried", status: "proposed" },
  ],
  ...over,
});

describe("W226 a draft is not a publication", () => {
  it("stores only review states, with no way to express published", () => {
    const filePath = store();
    const saved = saveBackground(background(), "Reviewer", { filePath });
    for (const facet of saved.facets) {
      expect(["proposed", "accepted", "rejected"]).toContain(facet.status);
    }
    expect(saved).not.toHaveProperty("published");
  });

  /**
   * `background.ts` says an accepted facet with nobody named would mean the machine accepted it,
   * "which must never happen". The console makes that visible; the writer makes it impossible,
   * because a validation living only in a UI is one the next caller will not have.
   */
  it("refuses to save an accepted facet that names nobody", () => {
    const filePath = store();
    const bad = background({
      facets: [{ key: "care:titration", kind: "care", label: "Titration", status: "accepted" }],
    });
    expect(() => saveBackground(bad, "Reviewer", { filePath })).toThrow(/names nobody|machine accepted/i);
  });

  it("allows a proposed or rejected facet with nobody named, because nobody decided it", () => {
    const filePath = store();
    const fine = background({
      facets: [{ key: "care:titration", kind: "care", label: "Titration", status: "proposed" }],
    });
    expect(() => saveBackground(fine, "Reviewer", { filePath })).not.toThrow();
  });
});

describe("W226 the audit trail is the point of append-only", () => {
  it("keeps every save and reports the latest as current", () => {
    const filePath = store();
    saveBackground(background(), "First reviewer", { filePath, now: new Date("2026-01-01") });
    saveBackground(background({ readBackConfirmed: true }), "Second reviewer", { filePath, now: new Date("2026-01-02") });

    expect(backgroundHistory("dr-a", { filePath })).toHaveLength(2);
    const current = latestBackground("dr-a", { filePath })!;
    expect(current.savedBy).toBe("Second reviewer");
    expect(current.readBackConfirmed).toBe(true);
    // The earlier row survives: it is the record that somebody decided differently, which is
    // exactly what a reviewer would be asked about.
    expect(backgroundHistory("dr-a", { filePath })[0]!.readBackConfirmed).toBe(false);
  });

  it("returns null for a clinician nobody has reviewed", () => {
    expect(latestBackground("nobody", { filePath: store() })).toBeNull();
  });

  it("does not let one corrupt line make the queue unreadable", () => {
    const filePath = store();
    saveBackground(background(), "Reviewer", { filePath });
    require("node:fs").appendFileSync(filePath, "{ not json\n", "utf8");
    saveBackground(background({ clinicianId: "dr-b", displayName: "Dr B" }), "Reviewer", { filePath });
    expect(reviewQueue({ filePath })).toHaveLength(2);
  });
});

describe("W226 ready means read back, not merely accepted", () => {
  it("is not ready while the clinician has not confirmed it", () => {
    const filePath = store();
    saveBackground(background(), "Reviewer", { filePath });
    const [row] = reviewQueue({ filePath });
    expect(row!.accepted).toBe(1);
    expect(row!.ready).toBe(false);
  });

  it("is ready once confirmed, and never on confirmation alone", () => {
    const filePath = store();
    saveBackground(background({ readBackConfirmed: true }), "Reviewer", { filePath });
    expect(reviewQueue({ filePath })[0]!.ready).toBe(true);

    const empty = store();
    saveBackground(
      background({ readBackConfirmed: true, facets: [{ key: "k", kind: "care", label: "L", status: "rejected" }] }),
      "Reviewer",
      { filePath: empty },
    );
    expect(reviewQueue({ filePath: empty })[0]!.ready).toBe(false);
  });
});

describe("W226 verbatim clinician speech is neutralised at the writer", () => {
  /** W153: a quote beginning `=` is a valid JSON string and an executable formula on export. */
  it("neutralises a formula in a transcript quote", () => {
    const filePath = store();
    const saved = saveBackground(
      background({
        facets: [{ key: "k", kind: "care", label: "L", status: "proposed", quote: "=HYPERLINK(\"http://x\")" }],
      }),
      "Reviewer",
      { filePath },
    );
    expect(saved.facets[0]!.quote!.startsWith("=")).toBe(false);
  });

  it("neutralises the unread lines too, which are also verbatim speech", () => {
    const filePath = store();
    const saved = saveBackground(background({ unread: ["=cmd|' /c calc'!A1"] }), "Reviewer", { filePath });
    expect(saved.unread[0]!.startsWith("=")).toBe(false);
  });
});
