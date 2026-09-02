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

// The port is overridable so a stale server on the default cannot make the suite unrunnable —
// which is exactly what happened once, and "the e2e cannot start" reads like a product failure.
const PORT = process.env.E2E_PORT ?? "3100";
// U2: `localhost`, not `127.0.0.1`. The console cookies are `secure` on a production build and the
// suite serves one over http; Chromium sends Secure cookies to any loopback origin, but Playwright's
// own cookie model (`page.request`, `context.cookies(url)`) exempts only `localhost`, so on
// 127.0.0.1 an authenticated `page.request` silently arrived signed out.
const BASE_URL = `http://localhost:${PORT}`;

// U13: the suite runs with measurement SWITCHED ON, so the consent gate, the enforced policy's
// GA hosts and the loader's insertion are all exercised. This is a PLACEHOLDER in Google's
// format, not a measurement ID — no measurement ID lives in this repository (launch item 19,
// founder gate 4). Nothing real is ever reached: `e2e/analytics.spec.ts` intercepts the tag host
// and counts, and elsewhere the loader request simply fails, which no spec listens for. It is set
// on this process too, not only on the server, because `e2e/headers.spec.ts` computes the expected
// header in this process.
const E2E_GA_ID = "G-E2E0000000";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? E2E_GA_ID;
process.env.NEXT_PUBLIC_GA_ID = GA_ID;

export default defineConfig({
  testDir: "e2e",
  /**
   * O98: a stray `test.only` makes a sweep vacuous — it would run one test, report green,
   * and the compliance surface sweep would guard nothing while looking like it guards
   * everything. That is the same failure the rule-name census guards against on the linter
   * side. Locally `.only` stays useful for debugging; in CI it is an error.
   */
  forbidOnly: !!process.env.CI,
  /**
   * O98: CI also writes the HTML report, because a red compliance gate has to be
   * diagnosable from the run that caught it. Locally the list reporter is the whole story
   * and an auto-opening report is a nuisance.
   */
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  // The mock rail/console/audit stores are process-global singletons (synthetic
  // phase). Run e2e single-worker so one spec's reset can't clobber another's
  // state mid-run; fullyParallel:false alone only serializes within a file.
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: BASE_URL,
    launchOptions: executablePath ? { executablePath } : {},
    // O98: a trace for failures only. Costs nothing on a green run, and turns "the sweep
    // is red on CI" into something a person can actually open and read.
    trace: "retain-on-failure",
    // The privacy bar (O16) renders once per browser until agreed, fixed over the bottom of
    // every page — which is exactly where several specs click. Every spec therefore runs in
    // the agreed state; e2e/consent.spec.ts clears this deliberately and is the one place the
    // bar itself is exercised and its copy swept.
    storageState: {
      cookies: [],
      origins: [
        { origin: BASE_URL, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }] },
      ],
    },
  },
  webServer: {
    command: `pnpm exec next build && pnpm exec next start -p ${PORT}`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: false,
    // The e2e drives a production build, so supply the signing secret (fail-closed
    // in prod) and opt the mock introspection routes in explicitly.
    env: {
      ADHDME_TOKEN_SECRET: "e2e-signing-secret",
      ADHDME_ENABLE_MOCK_ROUTES: "1",
      ADHDME_ENABLE_DEMO: "1", // W37: demo fails closed in prod builds unless opted in
      NEXT_PUBLIC_GA_ID: GA_ID, // U13: the placeholder above, or the caller's
    },
  },
});
