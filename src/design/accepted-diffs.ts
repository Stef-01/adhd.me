// AR16: the accepted-diff register — a visual change lands only with the unit id that intended it.
//
// AR15's baseline is a hash manifest, which makes any pixel change land as a diff to ONE file:
// qa/baselines/manifest.json. That is exactly the right choke point, and this register guards
// it: the manifest's sha256 must equal the latest entry here, so editing the manifest without
// appending an entry that NAMES the responsible unit fails the suite — an unattributed visual
// change is a red build, not a quiet drift. The register is append-only by convention and by
// review: an entry is never edited or removed, because the chain is the history of who moved
// the product's pixels and why.
//
// WHY A REGISTER AND NOT A COMMIT-MESSAGE CONVENTION. W102 (surface census) and W201
// (automated-decisions) already established the pattern: an instruction in prose is a hope; a
// register a test checks in both directions is a law. A commit message cannot fail the suite.
//
// HOW TO ACCEPT A NEW BASELINE (the workflow this file enforces):
//   1. Make the visual change; run AR15's three-run protocol (`pnpm e2e:visual` ×3 with
//      VISUAL_RUN_OUT, zero pairwise diff) and write the new qa/baselines/manifest.json.
//   2. Append ONE entry below: your unit id, the new manifest's sha256, its capture count,
//      and a reason a reviewer can act on. `sha256sum qa/baselines/manifest.json` is the hash.
//   3. The same commit carries the manifest, the entry, and the unit — the test holds them
//      together.

export type AcceptedDiff = {
  /** The unit that intended this visual state — the ledger row a reviewer opens. */
  readonly unitId: string;
  /** When the acceptance landed, ISO date. */
  readonly acceptedAt: string;
  /** sha256 of qa/baselines/manifest.json as accepted. */
  readonly manifestSha256: string;
  /** Capture count at acceptance — a matrix change (route/width/theme/motion) must show here. */
  readonly captures: number;
  /** Why the pixels moved, in words a reviewer can check against the unit's ledger row. */
  readonly reason: string;
};

export const ACCEPTED_DIFFS: readonly AcceptedDiff[] = [
  {
    unitId: "AR15",
    acceptedAt: "2026-08-24",
    manifestSha256: "20b9da4b59602e6cfba8c5c0373b37f50135ed5182c3fb7519548811980a6985",
    captures: 180,
    reason:
      "Initial acceptance: 45 routes × 2 widths × 1 theme × 2 motion settings, three consecutive full-matrix runs with zero pairwise diff on the deterministic harness (pinned server clock, settle proof, capture strip, canonical snap).",
  },
];

export type AcceptedDiffVerdict =
  | { readonly kind: "attributed"; readonly unitId: string }
  | { readonly kind: "unattributed-manifest-change"; readonly expected: string; readonly actual: string }
  | { readonly kind: "capture-count-drift"; readonly expected: number; readonly actual: number };

/**
 * The comparator the test drives — separated from the test so the tamper direction can be
 * exercised on the real logic rather than a reimplementation (the AR9–AR12 probe rule, at
 * vitest scale).
 */
export function acceptedDiffVerdict(fileSha256: string, fileCaptures: number): AcceptedDiffVerdict {
  const latest = ACCEPTED_DIFFS[ACCEPTED_DIFFS.length - 1]!;
  if (fileSha256 !== latest.manifestSha256) {
    return { kind: "unattributed-manifest-change", expected: latest.manifestSha256, actual: fileSha256 };
  }
  if (fileCaptures !== latest.captures) {
    return { kind: "capture-count-drift", expected: latest.captures, actual: fileCaptures };
  }
  return { kind: "attributed", unitId: latest.unitId };
}
