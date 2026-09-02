// U1 (O228): the security headers read off real responses, and the report-only policy proven
// quiet in a real browser on the surfaces the plan names — `/`, `/finder` and a console route.
//
// `securitypolicyviolation` fires for a report-only policy too (disposition "report"), so a page
// can be asked whether the policy WOULD have broken it. A violation here is what U13's enforcement
// would turn into a broken page; a zero here is the plan's week of reports, in miniature, on every
// gate run.

import { expect, test, type Page } from "@playwright/test";
import { securityHeaders } from "../src/security/headers";
import { signInAndOnboard } from "./support/session";

// The web server is the production build this process started, so it saw this process's
// environment: the same GA setting, and never `dev`.
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
  for (const path of ["/", "/finder", "/console/signin", "/faq", "/no-such-route"]) {
    test(`${path} answers with every header and no X-Powered-By`, async ({ request }) => {
      const response = await request.get(path);
      const headers = response.headers();
      for (const { key, value } of EXPECTED) {
        expect(headers[key.toLowerCase()], key).toBe(value);
      }
      expect(headers["content-security-policy"], "enforcement is U13's, not U1's").toBeUndefined();
      expect(headers["x-powered-by"]).toBeUndefined();
    });
  }

  test("the report-only policy is quiet on the landing, the finder and the console", async ({ page, request }) => {
    await request.post("/api/mock/console");
    const violations = await recordViolations(page);

    await page.goto("/");
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await page.goto("/finder");
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Sign-in, onboarding and the console shell: three server-action forms and the console's
    // own chrome, all under the same policy.
    await signInAndOnboard(page);
    await expect(page).toHaveURL(/\/console$/);
    await page.waitForLoadState("networkidle");

    expect(violations).toEqual([]);

    // Non-vacuity: the browser is applying the policy and the recorder hears it — a planted
    // third-party script is reported (and, report-only, still loads).
    await page.evaluate(() => {
      const planted = document.createElement("script");
      planted.src = "https://planted.invalid/widget.js";
      document.head.appendChild(planted);
    });
    await expect.poll(() => violations.length).toBe(1);
    expect(violations[0]).toMatchObject({ directive: "script-src-elem", disposition: "report" });
    expect(violations[0]?.blocked).toMatch(/^https:\/\/planted\.invalid/);
  });
});
