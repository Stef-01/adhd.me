// U1 (O228): the security headers read off real responses, and the policy proven quiet in a real
// browser on the surfaces the plan names — `/`, `/finder` and a console route.
//
// U13 turned the header from report-only into enforced. `securitypolicyviolation` fires either
// way, so the same recorder now asks a harder question: a violation here is not what enforcement
// WOULD break, it is a broken page. A zero here, across the whole suite (every spec runs under the
// enforced header), is the substitute for the plan's week of reports — there was no public
// traffic to report from, so the proof is the suite.

import { expect, test, type Page } from "@playwright/test";
import { securityHeaders } from "../src/security/headers";
import { signInAndOnboard } from "./support/session";

// The web server is the production build this process started, so it saw this process's
// environment: the same GA setting (the placeholder `playwright.config.ts` sets), and never `dev`.
const EXPECTED = securityHeaders({ gaId: process.env.NEXT_PUBLIC_GA_ID, dev: false });

interface Violation {
  document: string;
  directive: string;
  blocked: string;
  disposition: string;
  sample: string;
}

/** Collects every violation from every document the page visits, across navigations. */
async function recordViolations(page: Page): Promise<Violation[]> {
  const seen: Violation[] = [];
  await page.exposeBinding("__recordCspViolation", (_source, v: Violation) => {
    seen.push(v);
  });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __recordCspViolation: (v: Violation) => void }).__recordCspViolation({
        document: e.documentURI,
        directive: e.effectiveDirective,
        blocked: e.blockedURI,
        disposition: e.disposition,
        sample: e.sample,
      });
    });
  });
  return seen;
}

test.describe("U1 security headers", () => {
  for (const path of ["/", "/story", "/console/signin", "/faq", "/no-such-route"]) {
    test(`${path} answers with every header and no X-Powered-By`, async ({ request }) => {
      const response = await request.get(path);
      const headers = response.headers();
      for (const { key, value } of EXPECTED) {
        expect(headers[key.toLowerCase()], key).toBe(value);
      }
      // U13: the policy is enforced, and there is no second, report-only copy beside it.
      expect(headers["content-security-policy"]).toBeDefined();
      expect(headers["content-security-policy-report-only"]).toBeUndefined();
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }

  test("the enforced policy is quiet on the landing, the finder and the console", async ({ page, request }) => {
    await request.post("/api/mock/console");
    const violations = await recordViolations(page);
    // The browser starts the fetch and the policy kills it, so `request` still fires; the
    // evidence of enforcement is the failure Chromium names — "csp", not a network error.
    const failed: string[] = [];
    const answered: string[] = [];
    page.on("requestfailed", (r) => {
      if (r.url().startsWith("https://planted.invalid/")) failed.push(r.failure()?.errorText ?? "");
    });
    page.on("response", (r) => {
      if (r.url().startsWith("https://planted.invalid/")) answered.push(r.url());
    });

    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Sign-in, onboarding and the console shell: three server-action forms and the console's
    // own chrome, all under the same policy.
    await signInAndOnboard(page);
    await expect(page).toHaveURL(/\/console$/);
    await page.waitForLoadState("networkidle");

    expect(violations).toEqual([]);

    // Non-vacuity: the browser is applying the policy and the recorder hears it — a planted
    // third-party script is blocked outright (U13: disposition "enforce"), and its request fails
    // with the policy as the reason — nothing answers it.
    await page.evaluate(() => {
      const planted = document.createElement("script");
      planted.src = "https://planted.invalid/widget.js";
      document.head.appendChild(planted);
    });
    await expect.poll(() => violations.length).toBe(1);
    expect(violations[0]).toMatchObject({ directive: "script-src-elem", disposition: "enforce" });
    expect(violations[0]?.blocked).toMatch(/^https:\/\/planted\.invalid/);
    await expect.poll(() => failed).toEqual(["csp"]);
    expect(answered).toEqual([]);
  });
});
