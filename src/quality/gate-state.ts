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
