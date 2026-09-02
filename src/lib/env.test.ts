// U2 (O228): the environment held to the tree, and the production posture proven to refuse.
//
// Two laws. First, `.env.example` is the inventory of every variable the tree reads, in both
// directions: a read anywhere in app/, src/, scripts/, e2e/ or the three root configs that the
// file does not name fails, and a name in the file that nothing reads fails. A one-direction
// check would let the file rot into folklore; the both-directions check is what makes it a
// document a deployer can trust. Second, the posture assertion `instrumentation.ts` runs at boot
// throws on each forbidden combination and stands aside for the two cases that must pass — the
// e2e's local production build with the mock routes on, and `next build` itself.
//
// The scanner helpers sit above the first describe: O196 counts an unguarded loop over an
// imported name in a test body as vacuity, and these loops are over the tree, which is never
// empty (a test below says so).

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertProductionPosture, postureFaults, readEnv } from "./env";

const ROOT = path.resolve(__dirname, "../..");
const SCANNED_DIRS = ["app", "src", "scripts", "e2e"];
const SCANNED_ROOT_FILES = ["next.config.ts", "playwright.config.ts", "vitest.config.ts", "instrumentation.ts"];
const SOURCE = /\.(ts|tsx|mts|mjs)$/;
const ENV_FILE = path.join(ROOT, ".env.example");

/** Stable repository path for assertions and diagnostics, independent of the host OS. */
function repoPath(file: string): string {
  return path.relative(ROOT, file).replaceAll(path.sep, "/");
}

/** `src/lib/env.ts` reads its keys off an injected `source`, so those reads are counted here too. */
const ENV_MODULE = path.join(ROOT, "src/lib/env.ts");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return SOURCE.test(entry) ? [full] : [];
  });
}

/** Every variable a file reads: `process.env.X`, `process.env["X"]`, and `process.env[IDENT]` with `const IDENT = "X"` in the same file. */
function readsIn(file: string): Set<string> {
  const text = readFileSync(file, "utf8");
  const names = new Set<string>();
  for (const m of text.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) names.add(m[1]!);
  for (const m of text.matchAll(/process\.env\["([A-Z][A-Z0-9_]*)"\]/g)) names.add(m[1]!);
  for (const m of text.matchAll(/process\.env\[([A-Za-z_][A-Za-z0-9_]*)\]/g)) {
    const constant = new RegExp(`const ${m[1]!} = "([A-Z][A-Z0-9_]*)"`).exec(text);
    if (!constant) throw new Error(`${repoPath(file)} reads process.env[${m[1]}] without a string constant of that name in the file`);
    names.add(constant[1]!);
  }
  if (file === ENV_MODULE) {
    for (const m of text.matchAll(/\bsource\.([A-Z][A-Z0-9_]*)/g)) names.add(m[1]!);
  }
  return names;
}

const FILES = [
  ...SCANNED_DIRS.flatMap((dir) => sourceFiles(path.join(ROOT, dir))),
  ...SCANNED_ROOT_FILES.map((file) => path.join(ROOT, file)),
].filter((file) => file !== __filename); // this file's own comments spell the patterns it scans for

const READS = new Map<string, string[]>();
for (const file of FILES) {
  for (const name of readsIn(file)) READS.set(name, [...(READS.get(name) ?? []), repoPath(file)]);
}

/** The names `.env.example` declares, each on a `NAME=` line under a `#` purpose comment. */
function declaredNames(): string[] {
  const lines = readFileSync(ENV_FILE, "utf8").split("\n");
  const names: string[] = [];
  lines.forEach((line, i) => {
    const m = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (!m) return;
    expect(lines[i - 1], `.env.example line ${i + 1}: ${m[1]} needs a # purpose line directly above it`).toMatch(/^#/);
    names.push(m[1]!);
  });
  return names;
}

describe("U2 .env.example names every variable the tree reads, and nothing else", () => {
  it("scans a tree — the walk itself must not be the thing that passes", () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(READS.size).toBeGreaterThan(10);
  });

  it("names every variable read anywhere in the scanned tree", () => {
    const declared = new Set(declaredNames());
    const unlisted = [...READS.entries()].filter(([name]) => !declared.has(name));
    expect(
      unlisted.map(([name, files]) => `${name} (read in ${files.join(", ")})`),
      "read in the tree but absent from .env.example",
    ).toEqual([]);
  });

  it("names nothing the tree does not read", () => {
    const orphans = declaredNames().filter((name) => !READS.has(name));
    expect(orphans, "listed in .env.example but read nowhere").toEqual([]);
  });

  it("declares each name once, and every value empty — the file is an inventory, never a credential", () => {
    const names = declaredNames();
    expect(new Set(names).size).toBe(names.length);
    const valued = readFileSync(ENV_FILE, "utf8")
      .split("\n")
      .filter((line) => /^[A-Z][A-Z0-9_]*=.+/.test(line));
    expect(valued).toEqual([]);
  });

  it("is the twenty-name inventory U2 wrote, so a new read is a deliberate addition here too", () => {
    expect([...READS.keys()].sort()).toEqual([
      "ADHDME_BACKGROUND_PATH",
      "ADHDME_CLINICIAN_PATH",
      "ADHDME_ENABLE_DEMO",
      "ADHDME_ENABLE_MOCK_ROUTES",
      "ADHDME_FIXED_CLOCK",
      "ADHDME_INTEREST_PATH",
      "ADHDME_OUTBOUND_PATH",
      "ADHDME_TOKEN_SECRET",
      "CI",
      "E2E_PORT",
      "NEXT_PHASE",
      "NEXT_PUBLIC_GA_ID",
      "NEXT_PUBLIC_SITE_URL",
      "NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA",
      "NODE_ENV",
      "PW_CHROMIUM_PATH",
      "UPDATE_GOLDEN",
      "VERCEL_ENV",
      "VERCEL_PROJECT_PRODUCTION_URL",
      "VISUAL_RUN_OUT",
    ]);
  });

  it("only env.ts reads the posture keys outside their own tests", () => {
    // The guards read through readEnv; a second direct read of VERCEL_ENV or NEXT_PHASE would be
    // a second opinion on what production is.
    for (const key of ["VERCEL_ENV", "NEXT_PHASE", "ADHDME_ENABLE_DEMO"]) {
      expect(READS.get(key), key).toEqual(["src/lib/env.ts"]);
    }
    const secretReaders = (READS.get("ADHDME_TOKEN_SECRET") ?? []).filter((f) => !f.endsWith(".test.ts"));
    expect(secretReaders).toEqual(["src/lib/env.ts"]);
  });
});

// Fixtures name the whole environment they mean, so a fault below is never "whatever vitest had set".
const SOUND_DEPLOYMENT = { NODE_ENV: "production", VERCEL_ENV: "production", ADHDME_TOKEN_SECRET: "a-real-secret" };
const E2E_LOCAL_BUILD = { NODE_ENV: "production", ADHDME_TOKEN_SECRET: "e2e-signing-secret", ADHDME_ENABLE_MOCK_ROUTES: "1" };

describe("U2 readEnv", () => {
  it("reads the six posture keys and nothing is memoised between calls", () => {
    expect(readEnv(SOUND_DEPLOYMENT)).toEqual({
      production: true,
      deployedProduction: true,
      building: false,
      tokenSecret: "a-real-secret",
      mockRoutesOptedIn: false,
      demoOptedIn: false,
    });
    expect(readEnv({}).production).toBe(false);
  });

  it("treats an empty secret as unset, and only the literal \"1\" as opting a flag in", () => {
    expect(readEnv({ ADHDME_TOKEN_SECRET: "" }).tokenSecret).toBeUndefined();
    expect(readEnv({ ADHDME_ENABLE_MOCK_ROUTES: "true", ADHDME_ENABLE_DEMO: "yes" })).toMatchObject({
      mockRoutesOptedIn: false,
      demoOptedIn: false,
    });
  });

  it("reads process.env by default", () => {
    expect(readEnv().production).toBe(process.env.NODE_ENV === "production");
  });
});

describe("U2 the production posture assertion", () => {
  it("passes a sound production deployment", () => {
    expect(postureFaults(readEnv(SOUND_DEPLOYMENT))).toEqual([]);
    expect(() => assertProductionPosture(readEnv(SOUND_DEPLOYMENT))).not.toThrow();
  });

  it("refuses a production build with no signing secret, deployed or not", () => {
    for (const source of [{ NODE_ENV: "production" }, { NODE_ENV: "production", VERCEL_ENV: "production" }, { NODE_ENV: "production", ADHDME_TOKEN_SECRET: "" }]) {
      expect(() => assertProductionPosture(readEnv(source))).toThrow(/ADHDME_TOKEN_SECRET is not set/);
    }
  });

  it("refuses the mock routes on the production deployment", () => {
    expect(() => assertProductionPosture(readEnv({ ...SOUND_DEPLOYMENT, ADHDME_ENABLE_MOCK_ROUTES: "1" }))).toThrow(
      /ADHDME_ENABLE_MOCK_ROUTES=1 on the production deployment/,
    );
  });

  it("refuses /demo on the production deployment", () => {
    expect(() => assertProductionPosture(readEnv({ ...SOUND_DEPLOYMENT, ADHDME_ENABLE_DEMO: "1" }))).toThrow(
      /ADHDME_ENABLE_DEMO=1 on the production deployment/,
    );
  });

  it("lists every fault at once, so one boot log names the whole repair", () => {
    const faults = postureFaults(
      readEnv({ NODE_ENV: "production", VERCEL_ENV: "production", ADHDME_ENABLE_MOCK_ROUTES: "1", ADHDME_ENABLE_DEMO: "1" }),
    );
    expect(faults).toHaveLength(3);
    expect(() => assertProductionPosture(readEnv({ NODE_ENV: "production", VERCEL_ENV: "production", ADHDME_ENABLE_MOCK_ROUTES: "1", ADHDME_ENABLE_DEMO: "1" }))).toThrow(
      /production posture refused:\n {2}- ADHDME_TOKEN_SECRET[^\n]+\n {2}- ADHDME_ENABLE_MOCK_ROUTES[^\n]+\n {2}- ADHDME_ENABLE_DEMO/,
    );
  });

  it("passes the e2e suite's local production build with the mock routes on — a build is not the deployment", () => {
    expect(postureFaults(readEnv(E2E_LOCAL_BUILD))).toEqual([]);
    expect(postureFaults(readEnv({ ...E2E_LOCAL_BUILD, ADHDME_ENABLE_DEMO: "1" }))).toEqual([]);
    expect(postureFaults(readEnv({ ...E2E_LOCAL_BUILD, VERCEL_ENV: "preview" }))).toEqual([]);
  });

  it("stands aside for `next build`, which prerenders with NODE_ENV=production and no secret", () => {
    expect(postureFaults(readEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }))).toEqual([]);
    expect(
      postureFaults(readEnv({ NODE_ENV: "production", VERCEL_ENV: "production", NEXT_PHASE: "phase-production-build", ADHDME_ENABLE_MOCK_ROUTES: "1" })),
    ).toEqual([]);
  });

  it("has no opinion outside production", () => {
    for (const NODE_ENV of ["development", "test", undefined]) {
      expect(postureFaults(readEnv({ NODE_ENV, VERCEL_ENV: "production", ADHDME_ENABLE_MOCK_ROUTES: "1", ADHDME_ENABLE_DEMO: "1" }))).toEqual([]);
    }
  });

  it("is what instrumentation.ts runs at boot", () => {
    const text = readFileSync(path.join(ROOT, "instrumentation.ts"), "utf8");
    expect(text).toMatch(/import \{ assertProductionPosture \} from "@\/lib\/env"/);
    expect(text).toMatch(/export function register\(\): void \{\s*assertProductionPosture\(\);\s*\}/);
  });
});
