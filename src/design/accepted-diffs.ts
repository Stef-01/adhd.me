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
  {
    unitId: "AR20",
    acceptedAt: "2026-08-24",
    manifestSha256: "ca3e77ea278d88b289b40b1b65ff7d7884d47f87ead91ee0c240970dafc74b2e",
    captures: 180,
    reason:
      "Exactly four cells moved — home and approach under reduce, both widths — because AR20's sweep caught the Reveal/Rise half-gate: initial={false} under reduce left the SERVER-rendered entrance offset uncleaned, so reduce users rested 20px/18px displaced. The fix snaps to rest at duration 0; the no-preference cells are untouched, and a fresh three-run protocol agreed before this acceptance.",
  },  {
    unitId: "AR21",
    acceptedAt: "2026-08-25",
    manifestSha256: "4a27c7178b77d5f5297545e7c1a8243dbcb62a3c162049e8c78600d56036b3bd",
    captures: 180,
    reason:
      "Exactly four cells moved — practices, both widths and motions — from the founder-directed training-copy correction O189's sweep had missed on that page (four references reworded). AR21's tabular-nums on the walkthrough's changing numbers moved NOTHING: Newsreader's figures render at identical widths in both variants at these sizes, so the rule is protection for future digits, not a visible change. Three-run protocol agreed before this acceptance.",
  },  {
    unitId: "AR26",
    acceptedAt: "2026-08-25",
    manifestSha256: "8fd55c07e68daf0f70032708cc2ce53c6b33ae07c435356c70789e073e4b864b",
    captures: 180,
    reason:
      "Exactly eight cells moved — the complaints and privacy console pages, both widths and motions — because AR26 strengthened the register's three weakest zeros to carry their kinds in words ('None open.' -> 'No complaint is open right now.'; 'None yet.' -> 'No complaint has been resolved yet.'; 'None.' -> 'No deletion has been recorded yet — the retention policy has not removed anything.'), the copy successor AR25's entries recorded. Three-run protocol agreed before this acceptance.",
  },  {
    unitId: "O218",
    acceptedAt: "2026-09-01",
    manifestSha256: "7e3ec0ef7344be769857b432b99bbb74cc4af84d370ebaba78ecde4ab8d9644e",
    captures: 180,
    reason:
      "The founder-directed reskin session, accepted under the session's last unit id because its three units (O216/O217/O218) land together: O216 put the network deployment's brand scheme on every page's chrome (band-gradient header, band-fall footers and Acknowledgement, the story landing's rose retired to amber), O217 added the finder's example-profiles tickbox to the results screen (default OFF, so most finder cells move only by the new control), and O218 ported the network's motion vocabulary (pixel-neutral at rest; animations are disabled in the capture harness) and drew the 2px band hairline under the finder's header. Broad by design — a colour scheme is the one change that legitimately moves most of the matrix. Three-run protocol agreed (zero pairwise diff across all 180 captures, runs at 05:0x on 2026-09-01) before this acceptance.",
  },  {
    unitId: "O219",
    acceptedAt: "2026-09-01",
    manifestSha256: "2fe56bec3379f956450efb860b96838c0a3086da35bdc916cfaf829d26fa93e0",
    captures: 180,
    reason:
      "Exactly twelve cells moved — /, /approach and /console/matching, both widths and motions — from the accent-law pass the full e2e run demanded of the reskin: the landing keeps the accent's two earned meanings (the claim's underline, the live stat) and its other eight accent classes moved to muted/ink/dark-band idioms; /approach dropped to zero; the console page moves under the same commit set through the shared chrome the O218 token substitutions reach. The accent-discipline, contrast and honesty sweeps are all green on the same tree (full suite 315 passed / 1 skipped), which bounds what the moved pixels can be. Three-run protocol agreed (zero pairwise diff) before this acceptance.",
  },  {
    unitId: "O222",
    acceptedAt: "2026-09-01",
    manifestSha256: "9f88a42a9afdeca9c29cbb7f80fc1b54d77a4e332e3b49d91584e305e259d9ba",
    captures: 180,
    reason:
      "Exactly four cells moved — console/matching, both widths and motions — and this acceptance CLOSES the question the last two carried, because the mover was the HARNESS, not the page: the matching console renders tallyOutbound() and the background audit, both file-backed stores the full e2e suite appends to on every run, so those cells re-hashed at every cross-commit comparison while agreeing within every same-tree protocol. pnpm e2e:visual now pins all four ADHDME_*_PATH stores to a fresh .data-visual/ per invocation, this baseline is the pinned-empty rendering (the console's own AR25/AR26 zero-state copy), and the cells cannot move again unless the page does. O222's code refactor itself was proven pixel-identical everywhere else by the same comparison that exposed the store drift. Three-run protocol agreed (zero pairwise diff) before this acceptance.",
  },  {
    unitId: "O226",
    acceptedAt: "2026-09-01",
    manifestSha256: "0b0c8ffc169ac3cb531ff9fbe5e919486d6c957805adcbf54422a8316f78031e",
    captures: 180,
    reason:
      "Exactly four cells moved — the finder, both widths and motions — from the harmony pass a production iPhone review demanded: the example-roster switch left the results screen for a closed 'Testing options' disclosure under the welcome screen's voice entry (founder decision synthetic-roster-tickbox, AMENDED: examples ship ON, the switch is the way off), which is the only finder-welcome pixel change the matrix can see. The same unit's results-screen work — borders dropped from the head and refine details, the ink+underline edit action, the count moved to the list head, concentric 6px thumbnails, the paper place input — sits behind a query the capture matrix does not type, so it is recorded in qa/o226-*.png and DESIGN-QA rather than here. Three-run protocol agreed (zero pairwise diff across all 180 captures) before this acceptance.",
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
