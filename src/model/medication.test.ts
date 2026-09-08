import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { MEDICATION_FIELDS, medicationText } from "./medication";
import { readModel, saveMedicationNote } from "./store";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}

describe("Medication experience (PRD §47)", () => {
  it("has three fields whose every string passes the patient rules and advises on nothing", () => {
    expect(MEDICATION_FIELDS.map((f) => f.id)).toEqual(["changes", "untouched", "unwanted"]);
    for (const f of MEDICATION_FIELDS) for (const text of [f.title, f.prompt, f.placeholder]) {
      expect(lintLandingCopy(text), text).toEqual([]);
      expect(text).not.toMatch(/\b(dose|dosage|mg|take more|take less|stop taking|start taking)\b/i);
    }
  });
  it("starts empty and keeps what the person writes on this device", () => {
    const storage = memory();
    expect(readModel(storage).medication).toEqual({ changes: "", untouched: "", unwanted: "", updatedAt: null });
    saveMedicationNote(storage, "changes", "Starting is easier before lunch");
    const r = readModel(storage);
    expect(r.medication.changes).toBe("Starting is easier before lunch");
    expect(r.medication.updatedAt).toBeTruthy();
    expect(medicationText(r)).toBe("What it seems to change\nStarting is easier before lunch");
  });
});
