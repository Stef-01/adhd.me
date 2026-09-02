// O222's deterministic visual harness, launched without shell-specific syntax. Keeping cleanup,
// environment setup and Playwright invocation in Node makes the same command work on Windows,
// macOS and Linux while ensuring every run sees fresh file-backed stores.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(repoRoot, ".data-visual");
const require = createRequire(import.meta.url);
const playwrightCli = require.resolve("@playwright/test/cli");

rmSync(dataRoot, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [playwrightCli, "test", "e2e/support/visual-stability.spec.ts"],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      ADHDME_FIXED_CLOCK: "2026-03-03T03:03:03.000Z",
      ADHDME_OUTBOUND_PATH: path.join(dataRoot, "outbound-handoffs.jsonl"),
      ADHDME_BACKGROUND_PATH: path.join(dataRoot, "clinician-backgrounds.jsonl"),
      ADHDME_INTEREST_PATH: path.join(dataRoot, "interest-signups.jsonl"),
      ADHDME_CLINICIAN_PATH: path.join(dataRoot, "clinician-applications.jsonl"),
    },
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
