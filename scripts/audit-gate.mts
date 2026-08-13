// W53: `pnpm audit:gate` — the dependency-advisory step of the verify gate.
//
// Run with Node's native type stripping (node 22.18+), so the gate is written in the
// same strict TypeScript as the rest of the tree and is covered by `pnpm typecheck`.
// All decision logic lives in src/security/audit-gate.ts, which is unit-tested; this
// file only shells out, parses, and sets the exit code.
//
// The `audit:gate` script passes --disable-warning=MODULE_TYPELESS_PACKAGE_JSON: the
// imported src/*.ts files are ESM but the package has no "type" field, and adding one
// would change module resolution for the whole project to silence log noise.

import { execFileSync } from "node:child_process";
import { AUDIT_ALLOWLIST } from "../src/security/audit-allowlist.ts";
import {
  type AuditReport,
  DEFAULT_THRESHOLD,
  evaluateAudit,
  formatVerdict,
} from "../src/security/audit-gate.ts";

const ALLOWLIST_PATH = "src/security/audit-allowlist.ts";

function runAudit(): string {
  try {
    return execFileSync("pnpm", ["audit", "--audit-level", DEFAULT_THRESHOLD, "--json"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      // Windows installs pnpm as pnpm.cmd, which CreateProcess cannot exec directly;
      // without a shell the gate dies with ENOENT before it ever reads a report.
      // The command and its arguments are fixed strings, so the shell adds no injection surface.
      shell: process.platform === "win32",
    });
  } catch (error) {
    // `pnpm audit` exits non-zero whenever it finds anything, so a non-zero exit is
    // the normal case, not a failure — the report is still on stdout. Only a run
    // that produced no stdout at all (offline, registry down, pnpm missing) is a
    // real error, and that fails the gate rather than skipping it.
    const stdout = (error as { stdout?: string | Buffer }).stdout;
    const text = typeof stdout === "string" ? stdout : stdout?.toString("utf8");
    if (text && text.trim() !== "") return text;
    throw error;
  }
}

function parseReport(raw: string): AuditReport {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== "object" || parsed === null || !("advisories" in parsed)) {
    throw new Error("pnpm audit --json did not return an object with an `advisories` key");
  }
  const { advisories } = parsed as { advisories: unknown };
  if (typeof advisories !== "object" || advisories === null) {
    throw new Error("pnpm audit --json returned a malformed `advisories` value");
  }
  return parsed as AuditReport;
}

function main(): void {
  let report: AuditReport;
  try {
    report = parseReport(runAudit());
  } catch (error) {
    // Fail closed. A security gate that passes when it cannot see is not a gate.
    console.error("audit gate: FAIL — could not obtain a dependency audit report.");
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    console.error("  The gate does not pass on an unreadable report; re-run with network access.");
    process.exit(1);
  }

  const verdict = evaluateAudit(report, AUDIT_ALLOWLIST, new Date());
  const output = formatVerdict(verdict, ALLOWLIST_PATH);
  if (verdict.ok) {
    console.log(output);
    return;
  }
  console.error(output);
  process.exit(1);
}

main();
