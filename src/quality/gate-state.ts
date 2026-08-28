// AR14: the gate reaches the loop — O173's fix made structural.
//
// THE INCIDENT, FROM THE LEDGER'S OWN ROW. O167 turned the e2e gate red on `main` (one test,
// named: `e2e/landing.spec.ts:74`, the storybook copy under JavaScript disabled). CI said so on
// the very next push and kept saying so for eight consecutive runs. O168, O169, O170 and O171
// were each built, verified with `pnpm verify` — which does not run e2e — and pushed onto the
// red base. The control existed and fired; it lived on a path no firing walks (a CI tab), so it
// was an UNREAD gate, not a missing one, which O173 recorded as the worse error.
//
// THE FIX'S SHAPE: put the gate's verdict on the one path every firing already walks. The claim
// protocol's step 1 is "pull, read BUILD-STATE.md" — so the verdict is a single machine-parsed
// line at the head of BUILD-STATE.md, written by the session that ran the gate (step 6), read
// at claim time (step 1b). This module is the parser and the guard; the ledger line is the
// state. Nothing here runs the gate — it makes the last run's verdict impossible to not read.
//
// WHAT RED MEANS AT CLAIM TIME: not "wait", and not "claim the next row anyway". `claimGuard`
// returns a refusal that names the failing check, and the protocol makes fixing that failure
// the firing's unit — the machinery for the priority the loop instruction has always stated
// ("red gates first") and O168–O171 show stating is not enforcing.

import { readFileSync } from "node:fs";
import path from "node:path";

export type GateStatus = "green" | "red";

export interface GateState {
  readonly status: GateStatus;
  /** The commit the verdict was EARNED on — the gate run's tree, not whatever HEAD moved to. */
  readonly sha: string;
  /** UTC timestamp of the run, as written. */
  readonly at: string;
  /** Green: the figures. Red: the failing check, NAMED — the parser refuses an empty one. */
  readonly note: string;
}

export class GateStateError extends Error {
  constructor(reason: string) {
    super(`gate state unreadable — treat as RED (AR14): ${reason}`);
    this.name = "GateStateError";
  }
}

const GATE_LINE = /^`gate: (green|red) @ ([0-9a-f]{7,40}) \(([^)]+)\) — (.*)`$/gm;

/**
 * The one gate-state line in a ledger text. Throws — rather than defaulting to green — on a
 * missing line, a malformed line, or more than one: an unreadable state and a red state must
 * fail the same way, or malforming the line becomes a way past the guard.
 */
export function parseGateState(ledgerText: string): GateState {
  const matches = [...ledgerText.matchAll(GATE_LINE)];
  if (matches.length === 0) throw new GateStateError("no `gate: …` line found in the ledger head");
  if (matches.length > 1) {
    throw new GateStateError(`${matches.length} gate lines found — the state must have one home`);
  }
  const [, status, sha, at, note] = matches[0]!;
  if (!note || note.trim().length === 0) {
    throw new GateStateError("the gate line carries no note — a red state must NAME the failing check");
  }
  if (status === "red" && note.trim().length < 12) {
    throw new GateStateError(
      `a red state must name the failing check, not wave at it — got "${note.trim()}"`,
    );
  }
  return { status: status as GateStatus, sha: sha!, at: at!, note: note!.trim() };
}

/** Reads and parses the real ledger. */
export function currentGateState(root: string = path.resolve(__dirname, "../..")): GateState {
  return parseGateState(readFileSync(path.join(root, "BUILD-STATE.md"), "utf8"));
}

/**
 * What claim time does with the state: null means claim normally; a string is the refusal, and
 * the refusal carries the failure so the firing that reads it starts on the fix, not on a hunt.
 */
export function claimGuard(state: GateState): string | null {
  if (state.status === "green") return null;
  return (
    `claims are blocked: the gate is RED @ ${state.sha} (${state.at}) — ${state.note}. ` +
    `Fixing this IS the firing's unit (protocol step 1b; O173's rule made structural).`
  );
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * O214: AR14 MAKES THE VERDICT IMPOSSIBLE NOT TO READ. IT DOES NOT MAKE THE VERDICT TRUE.
 *
 * Everything above validates the gate line's SHAPE — one line, a status, a sha, a timestamp, a
 * non-empty note — and never its CONTENT. That was enough for case one (O167–O173: a gate that
 * fired on a path no firing walked). It is not enough for case two.
 *
 * CASE TWO, O213. Four consecutive gate lines claimed a green e2e over a red tree. The runs
 * happened and they failed; the failures did not reach the summaries they were read from, because
 * `pnpm e2e 2>&1 | tail -N` returns TAIL's exit status — a failing run reports 0 — and a short
 * tail can cut the failure list out of the summary entirely. Each session then wrote a confident
 * green, and every later firing trusted it. AR14 guaranteed the line was read. Nothing checked it.
 *
 * THE ARITHMETIC THAT CATCHES IT, AND WHY IT IS ENOUGH. A green e2e claim names how many tests
 * passed and how many were skipped. Those must account for the whole suite: a test that neither
 * passed nor was skipped is a test that failed or never ran, and either way the run was not green.
 * O211's line reports "340 passed, 2 skipped" — 342 against a suite of 344. Two short, and the two
 * missing are exactly the two that were failing. The suite's real size is authoritative and cheap:
 * `npx playwright test --list` reports it in seconds without launching a browser.
 *
 * This is deliberately NOT a gate runner. It re-runs nothing and reproves nothing. It asks one
 * question of a line that claims to be green — does it account for every test? — which is the
 * question nobody asked for four units.
 *
 * WHERE IT IS ENFORCED, AND WHY NOT IN `claimGuard`. The check lives in `gate-accounting.test.ts`,
 * so a dishonest line fails `pnpm verify`. That is the right moment: a session writes the gate line
 * AFTER its run, so the line can only be audited by the NEXT firing — which is exactly the firing
 * the claim protocol makes read it. Folding the suite size into `claimGuard` would change its
 * signature and force every caller to shell out to Playwright to ask a question about a string;
 * the guard stays a pure function of the state, and the suite size is supplied by the one caller
 * that has a reason to know it.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** The e2e figures a green note claims, as written. */
export interface E2eClaim {
  readonly passed: number;
  readonly skipped: number;
}

/**
 * ANCHORED ON `pnpm e2e green (`, NOT ON A BARE "N passed". The note also carries the vitest
 * figures ("298 files / 4398 tests (13 skipped)") and the audit and perf lines, all of which
 * contain numbers; a loose match would read the wrong pair and the check would be worse than
 * absent, because it would look like coverage.
 */
const E2E_FIGURES = /pnpm e2e green \((\d+) passed(?:,\s*(\d+) skipped)?/;

export function parseE2eClaim(note: string): E2eClaim | null {
  const m = E2E_FIGURES.exec(note);
  if (!m) return null;
  return { passed: Number(m[1]), skipped: Number(m[2] ?? 0) };
}

/**
 * Does a green gate line account for every test in the suite it claims to have run?
 *
 * Returns null when the line is honest (or when the state is red, which claims already block on).
 * Returns the refusal otherwise — NAMING the shortfall, because "the gate line is wrong" sends the
 * reader hunting and "accounts for 342 of 344" sends them to the two that are missing.
 *
 * FAIL-CLOSED ON AN UNPARSEABLE GREEN, for the reason `parseGateState` already gives about
 * malformed lines: if dropping the figures were tolerated, dropping the figures would become the
 * way past this check.
 */
export function e2eAccountingGuard(state: GateState, suiteSize: number): string | null {
  if (state.status === "red") return null;
  const claim = parseE2eClaim(state.note);
  if (!claim) {
    return (
      `the gate line claims GREEN @ ${state.sha} but carries no readable e2e figures. A green ` +
      `state must say how many tests passed and how many were skipped, in the form ` +
      `"full pnpm e2e green (N passed, M skipped, …)", or it is asserting something nobody can check.`
    );
  }
  const accounted = claim.passed + claim.skipped;
  if (accounted === suiteSize) return null;
  if (accounted > suiteSize) {
    return (
      `the gate line claims GREEN @ ${state.sha} over ${accounted} e2e tests, but the suite holds ` +
      `${suiteSize}. A claim larger than the suite means the line was copied from a run of a ` +
      `different tree — re-run the gate on this one.`
    );
  }
  return (
    `the gate line claims GREEN @ ${state.sha} but accounts for only ${accounted} of the suite's ` +
    `${suiteSize} e2e tests (${claim.passed} passed + ${claim.skipped} skipped). The missing ` +
    `${suiteSize - accounted} neither passed nor were skipped, so they failed or never ran and the ` +
    `run was not green. This is O213's failure mode: piping the gate through \`tail\` returns ` +
    `TAIL's exit status, so a failing run reports 0 and its failures never reach the summary. ` +
    `Re-run the gate, capture the exit code from the command itself, and write what it actually says.`
  );
}
