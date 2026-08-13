// W153: the fourth sink, asserted against the source rather than promised.
//
// A prompt-injection posture written while no model is called is a posture about a hypothetical.
// The one statement that is not hypothetical, and the one worth holding, is this:
//
//   THERE IS NO POSITION IN THIS TREE WHERE TEXT BECOMES AN INSTRUCTION.
//
// Nothing calls a model API. G8 is proposed and unratified, W146 (the de-identification gate) and
// W147 (the Claude adapter) are blocked on it, and W144's document says the loop must not decide
// it. So the injection surface for a model prompt is empty — and the way that fact stays true is
// to test it, in the W102/W140/W150 shape: read the tree, and fail on any hit that is not
// declared here with a reason.
//
// The day W147 is built, this test fails. That is the intended behaviour, not an obstacle: the
// failure is the reminder that the adapter needs the gate, and clearing it means adding a line
// here that says which module calls out and under which ruling.
//
// The scan is syntactic and it is a backstop, not a proof. It cannot see a hostname assembled at
// runtime, and it is not trying to — the primary control is the empty allowlist below plus
// review. What it does catch is the realistic case: somebody adds an SDK import or an endpoint
// string, and the suite notices the same day.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Markers that a file talks to a model API.
 *
 * Written as fragments joined at runtime so the list does not match ITSELF when the scanner walks
 * its own directory — the alternative is excluding this file by name, which is a hole somebody
 * could later hide something in.
 */
const MARKER_PARTS: ReadonlyArray<readonly string[]> = [
  ["anthro", "pic-ai/"],
  ["api.anthro", "pic.com"],
  ["/v1/mes", "sages"],
  ["open", "ai.com"],
  ["generative", "language.googleapis"],
  ["completions.cre", "ate"],
];

export const INSTRUCTION_SINK_MARKERS: readonly string[] = MARKER_PARTS.map((p) => p.join(""));

/**
 * Files permitted to name a model endpoint, with the ruling that permits it.
 *
 * Empty, and it stays empty until G8 is ratified. This is the audit-allowlist shape (W53): an
 * exception is a written decision with a reason, or it is not an exception.
 */
export const DECLARED_INSTRUCTION_SINKS: ReadonlyArray<{ file: string; rationale: string }> = [];

export interface InstructionSinkHit {
  /** Path relative to the repository root. */
  file: string;
  marker: string;
}

const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|mjs)$/;

/** Every first-party source file under `roots`, tests included — a test can call out too. */
function sourceFiles(root: string, roots: readonly string[]): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (SOURCE_EXT.test(entry)) found.push(full);
    }
  };
  for (const dir of roots) walk(join(root, dir));
  return found;
}

/** Every marker occurrence in the tree. Undeclared hits are the failure. */
export function findInstructionSinks(root: string, roots: readonly string[] = ["src", "app", "scripts"]): InstructionSinkHit[] {
  const hits: InstructionSinkHit[] = [];
  for (const file of sourceFiles(root, roots)) {
    const source = readFileSync(file, "utf8");
    for (const marker of INSTRUCTION_SINK_MARKERS) {
      if (source.includes(marker)) hits.push({ file: relative(root, file), marker });
    }
  }
  return hits;
}

/** Hits nobody has written a ruling for. The list that must be empty. */
export function undeclaredInstructionSinks(hits: readonly InstructionSinkHit[]): InstructionSinkHit[] {
  const declared = new Set(DECLARED_INSTRUCTION_SINKS.map((d) => d.file));
  return hits.filter((hit) => !declared.has(hit.file));
}

/** Does this text name a model endpoint? Exposed so the scanner can be proven non-vacuous. */
export function namesInstructionSink(source: string): string[] {
  return INSTRUCTION_SINK_MARKERS.filter((marker) => source.includes(marker));
}
