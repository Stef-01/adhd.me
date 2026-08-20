// W235 (O74) verify gate: the handoff store records honestly, refuses noise, and never throws
// into the redirect that feeds it.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listOutbound, recordOutbound, tallyOutbound } from "./outbound-store";
import { clinicians } from "@/demo/clinicians";

const dir = mkdtempSync(path.join(tmpdir(), "outbound-"));
let n = 0;
const freshPath = () => path.join(dir, `store-${n++}.jsonl`);

afterEach(() => {
  // The dir is per-suite; individual files are per-test via freshPath.
});

describe("W235 recording", () => {
  it("stores clinician, surface and DAY only — the row is the whole disclosure", () => {
    const filePath = freshPath();
    const ok = recordOutbound("anubhav-saxena", "finder", { filePath, now: new Date("2026-08-19T13:45:22Z") });
    expect(ok).toBe(true);
    expect(listOutbound(filePath)).toEqual([
      { clinicianId: "anubhav-saxena", surface: "finder", day: "2026-08-19" },
    ]);
  });

  it("refuses a clinician the roster does not hold, and a malformed surface", () => {
    const filePath = freshPath();
    expect(recordOutbound("dr-nobody", "finder", { filePath })).toBe(false);
    expect(recordOutbound("anubhav-saxena", "NOT OK!", { filePath })).toBe(false);
    expect(listOutbound(filePath)).toEqual([]);
  });

  it("never throws when the write cannot happen — the redirect is the product", () => {
    // A directory path as the file: appendFileSync will fail; the contract is false, not throw.
    expect(recordOutbound("anubhav-saxena", "finder", { filePath: dir })).toBe(false);
  });
});

describe("W235 tallying", () => {
  it("counts per clinician and per surface, roster order, zero rows included", () => {
    const filePath = freshPath();
    recordOutbound("anubhav-saxena", "finder", { filePath });
    recordOutbound("anubhav-saxena", "finder", { filePath });
    recordOutbound("anubhav-saxena", "profile", { filePath });
    recordOutbound("tushar-yadav", "examples", { filePath });

    const tally = tallyOutbound(filePath);
    expect(tally.map((t) => t.clinicianId)).toEqual(clinicians.map((c) => c.id));
    const anubhav = tally.find((t) => t.clinicianId === "anubhav-saxena")!;
    expect(anubhav.total).toBe(3);
    expect(anubhav.bySurface).toEqual({ finder: 2, profile: 1 });
    // A clinician nobody has handed off to is a zero ROW, not an absence — the empty count
    // is a fact the console must be able to say.
    expect(tally.find((t) => t.clinicianId === "anusha-saxena")).toEqual({
      clinicianId: "anusha-saxena",
      total: 0,
      bySurface: {},
    });
  });

  it("survives a torn tail line and rows of the wrong shape", () => {
    const filePath = freshPath();
    recordOutbound("tushar-yadav", "finder", { filePath });
    writeFileSync(filePath, `${JSON.stringify({ clinicianId: "tushar-yadav", surface: "finder", day: "2026-08-19" })}\n{"clinicianId": 42}\n{"torn`, "utf8");
    expect(listOutbound(filePath)).toHaveLength(1);
  });
});
