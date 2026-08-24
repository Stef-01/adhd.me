import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACCEPTED_DIFFS, acceptedDiffVerdict } from "./accepted-diffs";

const MANIFEST = path.resolve(__dirname, "../../qa/baselines/manifest.json");

describe("AR16 — the accepted-diff register", () => {
  const raw = readFileSync(MANIFEST);
  const fileSha = createHash("sha256").update(raw).digest("hex");
  const fileCaptures = Object.keys(JSON.parse(raw.toString()) as Record<string, string>).length;

  /**
   * THE LAW, both directions in one equality: a manifest edited without a new register entry
   * fails here (file hash ≠ latest entry), and a register entry that points at a manifest
   * nobody produced fails the same way (latest entry ≠ file hash). The failure message names
   * the workflow, because the person who trips this is mid-acceptance and needs the next step,
   * not a bare hash mismatch.
   */
  it("the baseline manifest carries the unit id that intended it", () => {
    const verdict = acceptedDiffVerdict(fileSha, fileCaptures);
    expect(
      verdict,
      "qa/baselines/manifest.json changed without an accepted-diff entry — append your unit id, " +
        "the new sha256 and a reason to ACCEPTED_DIFFS (src/design/accepted-diffs.ts) in the same " +
        "commit, after the three-run protocol has agreed on the new baseline",
    ).toEqual({ kind: "attributed", unitId: ACCEPTED_DIFFS[ACCEPTED_DIFFS.length - 1]!.unitId });
  });

  /** Tamper direction, driven through the REAL comparator (the probe rule at vitest scale). */
  it("an unattributed manifest change is named, not merely unequal", () => {
    const tampered = createHash("sha256").update(raw).update("one flipped pixel").digest("hex");
    expect(acceptedDiffVerdict(tampered, fileCaptures)).toMatchObject({ kind: "unattributed-manifest-change" });
    expect(acceptedDiffVerdict(fileSha, fileCaptures + 1)).toMatchObject({ kind: "capture-count-drift" });
  });

  /** Register hygiene: every entry reviewable — unit id resolvable, reason actionable. */
  it("every entry names a real unit shape, a date, and an actionable reason", () => {
    expect(ACCEPTED_DIFFS.length).toBeGreaterThanOrEqual(1);
    for (const entry of ACCEPTED_DIFFS) {
      expect(entry.unitId).toMatch(/^(O|W|M|AR|SUP)\d+$/);
      expect(entry.acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.captures).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThanOrEqual(10);
    }
    // Append-only cannot be asserted from inside one revision, but duplicate hashes CAN be:
    // two entries claiming the same manifest state would make "latest" ambiguous history.
    const hashes = ACCEPTED_DIFFS.map((entry) => entry.manifestSha256);
    expect(new Set(hashes).size).toBe(hashes.length);
  });
});
