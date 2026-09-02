// U5 (O229-lane): CI runs what `pnpm verify` runs, and the toolchain is pinned once.
//
// The gap this closes: `ci.yml` restated four of verify's six steps by hand and nobody noticed
// that `perf:gate` and `gate:accounting` never ran there. The fix in the workflow is to call
// `pnpm verify` instead of copying its list; the fix here is to make the copy impossible to
// reintroduce. The workflow's run steps are expanded through package.json's scripts (one level:
// `pnpm verify` becomes verify's own steps) and the result must equal verify's step list in both
// directions. Set-up steps (install, the browser download) are the job's plumbing, not its gate,
// and are excluded by name.
//
// The pins are held together the same way: `packageManager`, `engines` and `.nvmrc` must agree,
// and the workflow must read them (`node-version-file`, no `version` on pnpm/action-setup) rather
// than carry a fourth copy of the number.
//
// No YAML parser: the workflow is flat enough that its jobs, `uses:` and `run:` lines are read by
// indentation, and a dependency added for one test is a dependency the audit gate must then watch.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const WORKFLOW = path.join(ROOT, ".github", "workflows", "ci.yml");

const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  packageManager?: string;
  engines?: Record<string, string>;
  scripts: Record<string, string>;
};

/** The scripts `pnpm verify` runs, in order: "pnpm a && pnpm b" → ["a", "b"]. */
function verifySteps(): string[] {
  return pkg.scripts.verify!.split("&&").map((part) => part.trim().replace(/^pnpm /, ""));
}

interface Job {
  uses: { action: string; with: string }[];
  runs: string[];
}

/** Each job's `uses:` (with its inline `with:` block, if any) and `run:` lines. */
function parseWorkflow(source: string): Record<string, Job> {
  const jobs: Record<string, Job> = {};
  let current: Job | undefined;
  let inJobs = false;
  for (const line of source.split("\n")) {
    if (/^jobs:\s*$/.test(line)) { inJobs = true; continue; }
    if (!inJobs || /^\s*#/.test(line)) continue;
    const job = /^  ([a-z0-9_-]+):\s*$/.exec(line);
    if (job) { current = jobs[job[1]!] = { uses: [], runs: [] }; continue; }
    if (!current) continue;
    const uses = /^\s+-\s+uses:\s+(\S+)/.exec(line);
    if (uses) { current.uses.push({ action: uses[1]!, with: "" }); continue; }
    const withLine = /^\s+with:\s+(\{.*\})\s*$/.exec(line);
    if (withLine && current.uses.length) current.uses[current.uses.length - 1]!.with = withLine[1]!;
    const run = /^\s+-\s+run:\s+(.+?)\s*$/.exec(line);
    if (run) current.runs.push(run[1]!);
  }
  return jobs;
}

/** A job's gate — its `pnpm <script>` runs expanded one level through package.json — as script names. */
function effectiveScripts(job: Job): string[] {
  const PLUMBING = new Set(["install", "exec"]);
  return job.runs.flatMap((run) => {
    const m = /^pnpm ([a-z0-9:-]+)/.exec(run);
    if (!m || PLUMBING.has(m[1]!)) return [];
    const script = m[1]!;
    const body = pkg.scripts[script];
    if (body === undefined) return [`<missing script: ${script}>`];
    return /^pnpm [a-z0-9:-]+( && pnpm [a-z0-9:-]+)+$/.test(body)
      ? body.split("&&").map((part) => part.trim().replace(/^pnpm /, ""))
      : [script];
  });
}

describe("U5: CI parity — the workflow runs exactly what verify runs", () => {
  const jobs = parseWorkflow(readFileSync(WORKFLOW, "utf8"));

  it("verify's own step list is the six-step gate the ledger describes", () => {
    expect(verifySteps()).toEqual(["typecheck", "test", "build", "audit:gate", "perf:gate", "gate:accounting"]);
  });

  it("the verify job's effective script set equals verify's step list, both directions", () => {
    const ci = effectiveScripts(jobs.verify!);
    const missingFromCi = verifySteps().filter((s) => !ci.includes(s));
    const extraInCi = ci.filter((s) => !verifySteps().includes(s));
    expect(missingFromCi, `verify runs these and CI does not: ${missingFromCi.join(", ")}`).toEqual([]);
    expect(extraInCi, `CI runs these and verify does not: ${extraInCi.join(", ")}`).toEqual([]);
  });

  it("the verify job calls the script rather than copying its list", () => {
    // Calling `pnpm verify` is what makes the previous test hold by construction. A job that
    // re-listed the steps could pass it today and drift tomorrow.
    expect(jobs.verify!.runs.filter((r) => !r.startsWith("pnpm install"))).toEqual(["pnpm verify"]);
  });

  it("the e2e job still runs the suite, and every script either job names exists", () => {
    expect(effectiveScripts(jobs.e2e!)).toEqual(["e2e"]);
    for (const job of Object.values(jobs)) {
      expect(effectiveScripts(job).filter((s) => s.startsWith("<missing"))).toEqual([]);
    }
  });

  it("the parser sees both jobs and their steps (not a vacuous pass on an empty parse)", () => {
    expect(Object.keys(jobs)).toEqual(["verify", "e2e"]);
    expect(jobs.e2e!.runs.length).toBeGreaterThanOrEqual(3);
  });

  it("a workflow that re-lists a subset of verify fails (the pre-U5 shape)", () => {
    const preU5 = parseWorkflow(
      "jobs:\n  verify:\n    steps:\n      - run: pnpm install --frozen-lockfile\n" +
        "      - run: pnpm typecheck\n      - run: pnpm test\n      - run: pnpm build\n      - run: pnpm audit:gate\n",
    );
    const ci = effectiveScripts(preU5.verify!);
    expect(verifySteps().filter((s) => !ci.includes(s))).toEqual(["perf:gate", "gate:accounting"]);
  });
});

describe("U5: toolchain pins — one number, read everywhere", () => {
  const jobs = parseWorkflow(readFileSync(WORKFLOW, "utf8"));
  const nvmrc = readFileSync(path.join(ROOT, ".nvmrc"), "utf8").trim();

  it("packageManager pins an exact pnpm whose major matches engines.pnpm", () => {
    const m = /^pnpm@(\d+)\.\d+\.\d+$/.exec(pkg.packageManager ?? "");
    expect(m, `packageManager must be an exact pnpm@x.y.z, got ${pkg.packageManager}`).not.toBeNull();
    expect(pkg.engines?.pnpm).toBe(`${m![1]}.x`);
  });

  it(".nvmrc names the same Node major as engines.node", () => {
    expect(nvmrc).toMatch(/^\d+$/);
    expect(pkg.engines?.node).toBe(`${nvmrc}.x`);
  });

  it("every job reads the pins instead of restating them", () => {
    for (const [name, job] of Object.entries(jobs)) {
      const setupNode = job.uses.find((u) => u.action.startsWith("actions/setup-node@"));
      const setupPnpm = job.uses.find((u) => u.action.startsWith("pnpm/action-setup@"));
      expect(setupNode?.with, `${name}: setup-node must read .nvmrc`).toContain("node-version-file: .nvmrc");
      expect(setupNode?.with, `${name}: setup-node must not carry its own node-version`).not.toMatch(/node-version:/);
      expect(setupPnpm, `${name}: pnpm/action-setup missing`).toBeDefined();
      expect(setupPnpm!.with, `${name}: pnpm/action-setup must take its version from packageManager`).not.toMatch(/version/);
    }
  });
});
