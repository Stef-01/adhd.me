// W210: a recorded finding carries the condition that would make it live — as code, not prose.
//
// PRIV-3 is the fixture, and the first thing to get right about it is what actually went wrong,
// because the obvious reading is false. **The trigger was written down.** W103 recorded it in
// Year 2, in bold, in the ledger row itself:
//
//   "Trigger: the first store change that lets `ConsoleState` hold more than one practice must
//    thread practice identity from the session in the same unit."
//
// W166 made two practices real. The trigger fired. Nothing happened — for forty-three units and
// four live cross-tenant defects: W181's ops queue, Y4-1's complaints leak, and W209's
// usefulness-audit write and CPD trail. The row was re-read at least three times in that window
// (W154 corrected its status, W206 updated it, W209 closed it) and each reader understood the
// sentence perfectly well.
//
// SO THE MISSING THING WAS NEVER THE RECORD. It was that a sentence in a markdown cell cannot be
// evaluated. The tree already knows this about code — it is why W102's census, W106's classes,
// W150's copy modules, W167's fold sites, W168's ledger check and W200's copy surface all derive a
// property from the artefact instead of asserting it in prose. A latent finding is the last place
// where the tree still keeps a claim in words and hopes somebody re-reads it at the right moment.
//
// A finding here therefore carries TWO forms of its trigger: the sentence a person reads, and a
// predicate the suite runs. They can drift, and the sentence is not checkable against the
// predicate — that is a real bound, stated rather than hidden. What the suite guarantees is
// narrower and still worth everything: **an OPEN finding whose predicate is true fails the
// build**, naming the finding on the firing that makes it live rather than on the audit that
// finds the damage.
//
// The PRIV-3 entry stays in the register after being closed, with its predicate still returning
// true, because it is the proof the mechanism works: had this file existed at W103, W166 could
// not have been committed green.
//
// KNOWN BOUND, stated: this register is hand-kept. Every other register in this tree is checked
// against the tree in both directions, and this one cannot be, because there is no mechanical
// detector for "a comment that files something for later" — the tree writes them in a dozen
// phrasings and the false-positive rate on any pattern broad enough to catch them all would make
// the check worthless. So the both-directions half is a habit, not a control, and saying so is
// better than a scan that would pass over a note nobody read.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { getStore, resetStore } from "@/booking/store";

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

export type FindingStatus = "open" | "closed";

export interface LatentFinding {
  id: string;
  /** The latent defect: what is wrong now but not yet harmful. */
  what: string;
  /** The unit that recorded it. */
  recordedBy: string;
  /** What would turn it from a modelling gap into a live defect, for a person. */
  triggerStatement: string;
  /**
   * The same condition, for the suite.
   *
   * True means the finding has gone live. An open finding whose predicate is true is a build
   * failure — that is the entire mechanism.
   */
  trigger: () => boolean;
  status: FindingStatus;
  /** The unit that closed it. Findings are kept after closing; the history is the point. */
  closedBy?: string;
}

/**
 * Declare a finding, refusing one that states no trigger.
 *
 * A runtime refusal rather than a type: `triggerStatement: ""` typechecks, and a finding whose
 * trigger is an empty sentence is exactly the thing this unit exists to stop being possible.
 */
export function declareFinding(finding: LatentFinding): LatentFinding {
  if (finding.triggerStatement.trim().length < 40) {
    throw new Error(`${finding.id}: a latent finding must state what would make it live`);
  }
  if (typeof finding.trigger !== "function") {
    throw new Error(`${finding.id}: a trigger a suite cannot run is a sentence, not a trigger`);
  }
  return finding;
}

/** Every non-test module in `src/`, with its text. */
function sourceFiles(): Array<{ module: string; text: string }> {
  const out: Array<{ module: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push({
          module: `src/${path.relative(SRC, full).split(path.sep).join("/")}`,
          text: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(SRC);
  return out;
}

/** Modules with no `// W<n>` header. W200's Y4 census cannot see them. */
export function modulesWithNoUnitHeader(): string[] {
  return sourceFiles()
    .filter(({ text }) => !/^\/\/ W\d+/.test(text.split("\n")[0] ?? ""))
    .map((f) => f.module)
    .sort();
}

/**
 * The eleven header-less modules that exist today, all Year-1 infrastructure.
 *
 * Pinned as a COUNT rather than a list because the finding is about growth: these eleven are
 * known and harmless, and a twelfth is a module that has slipped out of W200's census.
 */
export const HEADERLESS_AT_W210 = 11;

export const LATENT_FINDINGS: readonly LatentFinding[] = [
  declareFinding({
    id: "PRIV-3",
    what:
      "The console could not represent two practices: `ConsoleState.practice` was a single nullable practice and the id was the literal `\"prac-console\"` in three modules, so every console-side scoping bug was structurally unobservable.",
    recordedBy: "W103",
    triggerStatement:
      "The first store change that lets more than one practice exist. On that day all three sites become defects at once, because each was correct only while the store held one practice.",
    // Fires. It has fired since W166, which is the point of keeping it here.
    trigger: () => true,
    status: "closed",
    closedBy: "W209",
  }),
  declareFinding({
    id: "TENANCY-1",
    what:
      "`sessionAppointmentType` matches an appointment by clinician id and session date with no practice in the query. Clinician ids are minted per practice (W166), so the match is sound only while the seeded rail holds one practice's sessions — a property of the fixture, not of the code. W209 named it as a residual in `src/tenancy/store-reads.ts`; this makes the residual executable.",
    recordedBy: "W209",
    triggerStatement:
      "The seeded rail holds sessions for more than one practice. Until then two practices cannot collide on a clinician id here; after it, this read crosses the boundary exactly as the CPD trail did.",
    trigger: () => {
      resetStore();
      return new Set(getStore().state.appointments.map((a) => a.practiceId)).size > 1;
    },
    status: "open",
  }),
  declareFinding({
    id: "DOSSIER-1",
    what:
      "A gate dossier prices the founder decisions outstanding at a point in time, and its arithmetic is pinned by a test that reads the LIVE ledger. W207's did, and went red the moment W208 planned Year 5 and added five blocked rows — the document had not become wrong, the check had. Every future year-close dossier inherits the shape unless it bounds itself to its own year.",
    recordedBy: "W208",
    triggerStatement:
      "A gate-dossier test reads BUILD-STATE without bounding itself to the units that existed when its dossier was written — a `_LAST_UNIT` bound, or equivalent.",
    trigger: () =>
      readdirSync(path.join(SRC, "quality"))
        .filter((name) => /^gate-dossier-.*\.test\.ts$/.test(name))
        .some((name) => {
          const text = readFileSync(path.join(SRC, "quality", name), "utf8");
          return text.includes("BUILD-STATE.md") && !/_LAST_UNIT/.test(text);
        }),
    status: "open",
  }),
  declareFinding({
    id: "MATCH-1",
    what:
      "`rankCandidates` in `src/engine/pool.ts` orders the live invitation pool by `chronicCare` first and then by time since last visit, whose own comment reads \"older date = longer overdue = first\". W201's published ADM notice says, in its *never automated* list, \"No ordering of patients by need or by how unwell they are\" — so a published legal notice and the live ranker disagree. W213 made the same observation about the code; reading it against the notice is what makes it a contradiction rather than a smell. W214's matcher cannot express this (its candidate type has nowhere to put a clinical attribute) and deliberately did not change the live ranker, because resolving it means either changing who gets invited or changing the notice, and both are the founder's.",
    recordedBy: "W214",
    triggerStatement:
      "W214's matcher becomes a live path while `rankCandidates` still orders on a clinical attribute. Two orderings of the same patients would then be in production, one of which the published notice denies exists.",
    trigger: () => {
      const pool = readFileSync(path.join(SRC, "engine", "pool.ts"), "utf8");
      const stillOrdersOnCondition = /a\.chronicCare !== b\.chronicCare/.test(pool);
      const live = sourceFiles().some(
        ({ module, text }) => module !== "src/matching/match.ts" && /from "@\/matching\/match"/.test(text),
      );
      return stillOrdersOnCondition && live;
    },
    status: "open",
  }),
  declareFinding({
    id: "CENSUS-1",
    what:
      "W200's copy surface decides which modules it must cover by reading each module's `// W<n>` header, so a module with NO header is invisible to it — not declared, not linted, and not reported as missing. Eleven such modules exist and all are Year-1 infrastructure that holds no operator copy, which is why this is latent rather than live.",
    recordedBy: "W210",
    triggerStatement:
      "A twelfth module ships with no unit header. It escapes the Y4 copy census silently, which is the one failure mode a both-directions register is supposed to be incapable of.",
    trigger: () => modulesWithNoUnitHeader().length > HEADERLESS_AT_W210,
    status: "open",
  }),
];

/** Findings that have gone live and are still open. The list this unit exists to keep empty. */
export function fired(findings: readonly LatentFinding[] = LATENT_FINDINGS): LatentFinding[] {
  return findings.filter((f) => f.status === "open" && f.trigger());
}
