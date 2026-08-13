// W53: accepted-risk dependency advisories (W51 finding A2).
//
// This is the ONLY way to make `pnpm audit:gate` tolerate an advisory. The
// AllowlistEntry type requires a reason and a reviewBy date on every entry, so an
// acceptance cannot be added without stating why it is safe and when it expires —
// past reviewBy the gate starts failing again and the acceptance must be re-argued.
//
// Before adding an entry, try to fix it first: a `pnpm.overrides` bump (as W51 used
// for postcss and sharp) is always preferable to an accepted risk.

import type { AllowlistEntry } from "./audit-gate.ts";

// W107: every entry carries its review history, and the gate requires `reviewBy` to be the
// date the newest review set. Pushing the deadline forward on its own — the cheapest response
// to a failing gate — now breaks the acceptance instead of renewing it.

export const AUDIT_ALLOWLIST: readonly AllowlistEntry[] = [
  {
    advisory: "GHSA-w3rx-r6r6-pgpr",
    module: "image-size",
    reason:
      "ICNS parser infinite-loop DoS, reached only via pptxgenjs. No patched release exists " +
      "(advisory's patched range is empty), so there is nothing to bump to. Exposure is nil in " +
      "our usage: pptxgenjs runs at build time to generate our own sales deck from our own " +
      "assets, never parses untrusted input, and is absent from the deployed app. Do not ship " +
      "pptxgenjs into any request-serving path.",
    reviewBy: "2026-11-09",
    reviews: [
      {
        on: "2026-08-10",
        by: "W107",
        finding:
          "Re-checked against live advisory data (advisory last updated 2026-08-07): still no " +
          "patched release — patched range is <0.0.0 and the registry recommendation is None — " +
          "so there is still nothing to bump to. Confirmed pptxgenjs remains a devDependency, " +
          "and the 'absent from the deployed app' half of the argument is now ENFORCED rather " +
          "than asserted by src/security/reachability.test.ts, which walks the import graph " +
          "from app/ and fails if any request-serving path can reach it. DELIBERATELY NOT " +
          "EXTENDED: the November date exists to force a look near the deadline, and moving it " +
          "in August because the answer has not changed would spend the forcing function for " +
          "nothing.",
        extendedTo: "2026-11-09",
      },
      {
        on: "2026-08-11",
        by: "W165",
        finding:
          "Second scheduled review. Nothing has changed in the advisory: patched range still " +
          "<0.0.0, recommendation still None, last updated 2026-08-07 — the same data W107 saw. " +
          "What this review added was to ask whether the DEPENDENCY can go rather than the " +
          "acceptance be renewed forever. It cannot, and the reason is worth recording so " +
          "November is not re-litigated from scratch: there is no patched image-size to " +
          "override to (every version <=2.0.2 is affected and none is newer), and removing " +
          "pptxgenjs would delete W46's control rather than just a dependency — it exists " +
          "solely so a test can regenerate the sales deck from traceable figures instead of the " +
          "deck being a hand-made artefact nobody can check. Reachability re-confirmed against " +
          "a tree that has grown from 16 to 20 console surfaces since W107, and the scanner " +
          "that proves it was itself repaired in this unit. NOT EXTENDED: three months out, the " +
          "November date is still the forcing function.",
        extendedTo: "2026-11-09",
      },
    ],
  },
  {
    advisory: "GHSA-5p2g-fcmc-qvqq",
    module: "image-size",
    reason:
      "JXL/HEIF parser infinite-loop DoS in the same dependency, reached the same way and " +
      "accepted on the same grounds as GHSA-w3rx-r6r6-pgpr: no patched release, build-time only, " +
      "own inputs only, not in the deployed app.",
    reviewBy: "2026-11-09",
    reviews: [
      {
        on: "2026-08-10",
        by: "W107",
        finding:
          "Reviewed with GHSA-w3rx-r6r6-pgpr; same package, same path, same conclusion. Still " +
          "no patched release. Reachability now enforced by test rather than argued. Not " +
          "extended.",
        extendedTo: "2026-11-09",
      },
      {
        on: "2026-08-11",
        by: "W165",
        finding:
          "Reviewed with GHSA-w3rx-r6r6-pgpr, as before: same package, same path, same " +
          "conclusion, and the same finding that neither an override nor removal is available. " +
          "Not extended.",
        extendedTo: "2026-11-09",
      },
    ],
  },
];
