// W195: the Q15 gate dossier's factual claims, pinned against the tree.
//
// A gate dossier is read by a founder making an irreversible decision, and its whole value is
// that its facts are current. Q14's dossier came with tests for the same reason: a document
// asserting "seven modules, zero consumers" is true on the day it is written and becomes a lie
// silently, without anybody editing it.
//
// So these are not tests of the prose. They are tests of the things the prose ASSERTS, each
// failing the day the assertion stops being true — at which point the dossier needs a revision
// rather than a reader who trusts it.

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHIPPED_DIRECTORY_PROFILES, type SpecialistProfile } from "./profile";
import { SHIPPED_MEMBERSHIPS } from "./membership";
import { SPECIALIST_NOT_PUBLISHED, renderProfile } from "./render";

const ROOT = process.cwd();
const DOSSIER = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Q15.md"), "utf8");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

describe("W195 the dossier's claim that nothing is published", () => {
  it("holds: both shipped registries are empty", () => {
    expect(SHIPPED_DIRECTORY_PROFILES).toEqual([]);
    expect(SHIPPED_MEMBERSHIPS).toEqual([]);
  });

  it("holds: no page consumes a directory module", () => {
    // The dossier prices G6 partly on "seven modules, zero consumers". The day a route imports
    // one, that sentence is wrong and the price has changed — W185 would be partly built.
    const importers = walk(path.join(ROOT, "app"))
      .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"))
      .filter((file) => readFileSync(file, "utf8").includes("@/directory"));
    expect(importers, "a page now imports @/directory; the Q15 dossier is stale").toEqual([]);
  });

  it("holds: the dossier says so", () => {
    // Guards the pairing rather than the fact — a dossier that dropped the claim while the tree
    // kept the property would leave these tests passing and the document silently different.
    expect(DOSSIER).toContain("zero consumers");
  });
});

describe("W195 the dossier's claim that G6 does not open specialist titles", () => {
  it("holds: a specialist profile is still refused at render", () => {
    const specialist: SpecialistProfile = {
      clinicianId: "clin-1",
      displayName: "Dr Example Name",
      ahpraRegistrationNumber: "MED0001234567",
      location: { practiceId: "prac-1", suburb: "Parramatta", state: "NSW" },
      languages: ["English"],
      acceptingNewPatients: true,
      descriptor: { kind: "recognised_specialist", specialty: "endocrinology" },
      specialty: "endocrinology",
    };
    const result = renderProfile(specialist);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations[0]!.rule).toBe(SPECIALIST_NOT_PUBLISHED.rule);
  });

  it("holds: the refusal is a founder decision to change, not a build one", () => {
    expect(SPECIALIST_NOT_PUBLISHED.why).toContain("founder decision");
  });
});

describe("W195 the dossier answers its own verify gate", () => {
  it("names what launches", () => {
    expect(DOSSIER).toContain("What launches, and what stays internal");
    for (const published of ["registration number", "languages", "declared focus areas"]) {
      expect(DOSSIER.toLowerCase()).toContain(published.toLowerCase());
    }
  });

  it("names what stays internal", () => {
    for (const internal of ["credential", "capability graph", "CPD", "complaints", "referrals"]) {
      expect(DOSSIER).toContain(internal);
    }
  });

  it("resolves both units the gate names, rather than repeating the gate's premise", () => {
    // The gate asks which of W117 and W133 unblock with G6. The answer is neither, and a
    // dossier that restated the question would have satisfied the words and nothing else.
    expect(DOSSIER).toContain("W117 is not blocked. It is done");
    expect(DOSSIER).toContain("W133 is blocked, but not on G6");
    expect(DOSSIER).toContain("G6 unblocks exactly one unit, W185");
  });

  it("carries the Q9 split it rests on, quoted rather than paraphrased", () => {
    // The claim that W133 is misattributed rests entirely on Q9 separating action 1 from
    // action 5. If that document changes, this dossier's central finding needs re-checking.
    const q9 = readFileSync(path.join(ROOT, "docs", "GATE-DOSSIER-Q9.md"), "utf8");
    expect(q9).toContain("*Blocks: W131, W133, W137.*");
    expect(q9).toContain("*Blocks: G6 itself.*");
  });
});

describe("W195 the ledger agrees with the dossier about W133", () => {
  const ledger = readFileSync(path.join(ROOT, "BUILD-STATE.md"), "utf8");
  const row = ledger.split("\n").find((line) => line.startsWith("| W133 |")) ?? "";

  it("finds the row", () => {
    expect(row).not.toBe("");
  });

  it("keeps W133 blocked, because correcting the attribution does not open anything", () => {
    expect(row).toContain("| blocked |");
  });

  it("names the ruling that actually blocks it", () => {
    // W195 corrected this attribution. The unit stays blocked either way; what changes is that
    // the tree's most time-critical open decision is no longer hidden behind a gate nobody is
    // scheduling.
    expect(row).toContain("Q9 action 1");
  });
});
