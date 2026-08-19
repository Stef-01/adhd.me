// W230 (O38) verify gate: the reach-gap feed as a record — aggregation, latest-wins,
// and the two empty states kept apart.

import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ClinicianBackground } from "./background";
import { saveBackground } from "./background-store";
import { reachReport } from "./reach-report";

const store = () => path.join(mkdtempSync(path.join(tmpdir(), "reach-")), "backgrounds.jsonl");

const background = (over: Partial<ClinicianBackground> = {}): ClinicianBackground => ({
  clinicianId: "dr-a",
  displayName: "Dr A",
  unread: [],
  readBackConfirmed: false,
  facets: [],
  ...over,
});

describe("the feed and its two empty states", () => {
  it("distinguishes no onboardings from onboardings with nothing unheard", () => {
    const filePath = store();
    // Nothing saved at all.
    expect(reachReport({ filePath })).toEqual({ hasOnboardings: false, entries: [] });
    // One save, fully heard: the feed is empty but the store is not.
    saveBackground(background(), "Stefan", { filePath });
    expect(reachReport({ filePath })).toEqual({ hasOnboardings: true, entries: [] });
  });

  it("keeps the two kinds of silence apart, because they grow different cue lists", () => {
    const filePath = store();
    saveBackground(
      background({
        unread: ["I trained at three hospitals."],
        patientSilent: ["I run a walking group on Thursdays."],
      }),
      "Stefan",
      { filePath },
    );
    const [entry] = reachReport({ filePath }).entries;
    expect(entry!.unread).toEqual(["I trained at three hospitals."]);
    expect(entry!.patientSilent).toEqual(["I run a walking group on Thursdays."]);
  });

  it("reports a pre-O38 row's missing patient side as empty, never invented", () => {
    const filePath = store();
    saveBackground(background({ unread: ["Old row sentence."] }), "Stefan", { filePath });
    const [entry] = reachReport({ filePath }).entries;
    expect(entry!.patientSilent).toEqual([]);
    expect(entry!.unread).toEqual(["Old row sentence."]);
  });
});

describe("latest save per clinician", () => {
  it("a later conversation that resolved the gaps removes the entry from the feed", () => {
    // The earlier row stays in history for audit; the feed is outstanding review work, and
    // re-raising a resolved gap trains people to ignore the feed.
    const filePath = store();
    saveBackground(background({ patientSilent: ["First pass gap."] }), "Stefan", { filePath });
    saveBackground(background(), "Stefan", { filePath });
    expect(reachReport({ filePath })).toEqual({ hasOnboardings: true, entries: [] });
  });

  it("orders entries newest first across clinicians", () => {
    const filePath = store();
    saveBackground(
      background({ clinicianId: "dr-a", displayName: "Dr A", patientSilent: ["A's gap."] }),
      "Stefan",
      { filePath, now: new Date("2026-08-18T10:00:00Z") },
    );
    saveBackground(
      background({ clinicianId: "dr-b", displayName: "Dr B", patientSilent: ["B's gap."] }),
      "Stefan",
      { filePath, now: new Date("2026-08-18T11:00:00Z") },
    );
    expect(reachReport({ filePath }).entries.map((entry) => entry.clinicianId)).toEqual(["dr-b", "dr-a"]);
  });
});

describe("the patient-side sentences are stored safely", () => {
  it("neutralises a spreadsheet formula at the writer, like every other verbatim quote", () => {
    const filePath = store();
    const saved = saveBackground(
      background({ patientSilent: ['=HYPERLINK("http://evil.example","x")'] }),
      "Stefan",
      { filePath },
    );
    expect(saved.patientSilent![0]!.startsWith("=")).toBe(false);
  });

  it("omits the key entirely when a save carries no patient-side gaps", () => {
    const filePath = store();
    const saved = saveBackground(background({ patientSilent: [] }), "Stefan", { filePath });
    expect("patientSilent" in saved).toBe(false);
  });
});
