import { existsSync } from "node:fs";
import { chromium, defineConfig } from "@playwright/test";

// Local/CI e2e against a production build on a dedicated port. In the remote build
// environment the browser is pre-provisioned; PW_CHROMIUM_PATH overrides discovery.
//
// Without the fallback below, a @playwright/test bump to a revision the environment
// has not pre-provisioned fails all 41 specs at browser launch — which reads exactly
// like a product regression and costs a session to diagnose. So: explicit override
// first, otherwise the pre-provisioned binary, but *only* when the pinned revision is
// genuinely absent. On a machine with a correctly installed browser this returns
// undefined and Playwright's own discovery is untouched.
const PREINSTALLED_CHROMIUM = "/opt/pw-browsers/chromium";

function chromiumExecutable(): string | undefined {
  if (process.env.PW_CHROMIUM_PATH) return process.env.PW_CHROMIUM_PATH;
  let pinned: string | undefined;
  try {
    pinned = chromium.executablePath();
  } catch {
    pinned = undefined;
  }
  if (pinned && existsSync(pinned)) return undefined;
  return existsSync(PREINSTALLED_CHROMIUM) ? PREINSTALLED_CHROMIUM : undefined;
}

const executablePath = chromiumExecutable();

export default defineConfig({
  testDir: "e2e",
  // The mock rail/console/audit stores are process-global singletons (synthetic
  // phase). Run e2e single-worker so one spec's reset can't clobber another's
  // state mid-run; fullyParallel:false alone only serializes within a file.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: "pnpm exec next build && pnpm exec next start -p 3100",
    url: "http://127.0.0.1:3100",
    timeout: 240_000,
    reuseExistingServer: false,
    // The e2e drives a production build, so supply the signing secret (fail-closed
    // in prod) and opt the mock introspection routes in explicitly.
    env: {
      CAREYIELD_TOKEN_SECRET: "e2e-signing-secret",
      CAREYIELD_ENABLE_MOCK_ROUTES: "1",
      CAREYIELD_ENABLE_DEMO: "1", // W37: demo fails closed in prod builds unless opted in
    },
  },
});
