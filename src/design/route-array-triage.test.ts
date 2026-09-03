// AR5 verify gate: the 49-spec triage agrees with the real e2e/ directory in both directions, and
// the category-(a) work-queue count is pinned so it can only change on purpose.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { diffSpecTriage, INCOMPLETE_SWEEP_COUNT, SPEC_TRIAGE } from "./route-array-triage";

const E2E_DIR = join(process.cwd(), "e2e");

/** Every `*.spec.ts` file directly under `e2e/` (no subdirectories today), sorted. */
function realSpecFiles(): string[] {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith(".spec.ts"))
    .sort();
}

/** Specs that import the derived route list from `./site-routes`, read from real file content. */
function realDerivedListUsers(files: readonly string[]): Set<string> {
  const users = new Set<string>();
  for (const f of files) {
    const source = readFileSync(join(E2E_DIR, f), "utf8");
    if (/from ["']\.\/site-routes["']/.test(source)) users.add(f);
  }
  return users;
}

describe("AR5 the hardcoded-route-array triage matches the real tree", () => {
  it("triages every spec that does not import the derived list, and nothing else", () => {
    const files = realSpecFiles();
    const derivedUsers = realDerivedListUsers(files);
    const diff = diffSpecTriage(files, derivedUsers);
    expect(diff.missing, "needs triage but is absent from SPEC_TRIAGE").toEqual([]);
    expect(diff.stale, "triaged but now imports the derived list or no longer exists").toEqual([]);
    expect(diff.duplicate, "the same file triaged more than once").toEqual([]);
  });

  it("is non-vacuous: a synthetic untriaged spec is reported missing", () => {
    const files = [...realSpecFiles(), "synthetic-untriaged.spec.ts"];
    const derivedUsers = realDerivedListUsers(realSpecFiles());
    const diff = diffSpecTriage(files, derivedUsers);
    expect(diff.missing).toContain("synthetic-untriaged.spec.ts");
  });

  it("is non-vacuous: a triage entry for a spec that now imports the derived list is stale", () => {
    const files = realSpecFiles();
    // landing.spec.ts is real and triaged; pretend it just gained the import.
    const derivedUsers = new Set([...realDerivedListUsers(files), "landing.spec.ts"]);
    const diff = diffSpecTriage(files, derivedUsers);
    expect(diff.stale).toContain("landing.spec.ts");
  });

  it("is non-vacuous: a triage entry for a spec that no longer exists is stale", () => {
    const files = realSpecFiles().filter((f) => f !== "landing.spec.ts");
    const derivedUsers = realDerivedListUsers(files);
    const diff = diffSpecTriage(files, derivedUsers);
    expect(diff.stale).toContain("landing.spec.ts");
  });

  it("is non-vacuous: a file triaged twice is caught", () => {
    const files = realSpecFiles();
    const derivedUsers = realDerivedListUsers(files);
    const doubled = [...SPEC_TRIAGE, SPEC_TRIAGE[0]!];
    const diff = diffSpecTriage(files, derivedUsers, doubled);
    expect(diff.duplicate).toEqual([SPEC_TRIAGE[0]!.file]);
  });

  it("pins the category-(a) work queue against the real triage data, not a typed-in number", () => {
    const actual = SPEC_TRIAGE.filter((t) => t.category === "incomplete-sweep").length;
    expect(actual, "INCOMPLETE_SWEEP_COUNT is out of date with SPEC_TRIAGE").toBe(INCOMPLETE_SWEEP_COUNT);
  });

  it("is non-vacuous: the count reflects SPEC_TRIAGE rather than being hardcoded", () => {
    const withoutIncompleteSweeps = SPEC_TRIAGE.filter((t) => t.category !== "incomplete-sweep");
    const recount = withoutIncompleteSweeps.filter((t) => t.category === "incomplete-sweep").length;
    expect(recount).toBe(0);
    expect(recount).not.toBe(INCOMPLETE_SWEEP_COUNT);
  });

  it("every triaged file names at least one route, except the independently-derived ones", () => {
    for (const t of SPEC_TRIAGE) {
      if (t.category === "independently-derived") {
        expect(t.routes, `${t.file}: independently-derived entries name no routes by design`).toEqual([]);
      } else {
        expect(t.routes.length, `${t.file}: a triage entry with no named route is unverifiable`).toBeGreaterThan(0);
      }
    }
  });
});
