// U4 (O229): the reporter seam proven end to end, against the production build Playwright runs.
//
// The server is Playwright's `webServer`, so its stdout is out of reach; `/api/mock/reports`
// (behind the mock-route guard) is the window onto what reached the sink. Four proofs: the
// health endpoint's shape; the fault fixture's thrown error arriving as a server-error report
// carrying the route and no query string (a finder request is planted in the query to make that
// absence mean something); a real browser's Web Vital beacon arriving as its own kind; and the
// report-only policy's violation document arriving through `report-uri`.

import { expect, test, type APIRequestContext } from "@playwright/test";
import type { Report } from "../src/ops/reporter";

const PLANT = "my daughter is nine and cannot sit through a lesson";

async function reports(request: APIRequestContext): Promise<Report[]> {
  const res = await request.get("/api/mock/reports");
  expect(res.status()).toBe(200);
  return ((await res.json()) as { reports: Report[] }).reports;
}

/** Null for a local build, a git commit where Vercel exposed one — never anything else. */
function expectSha(sha: unknown): void {
  if (sha !== null) expect(sha).toMatch(/^[0-9a-f]{7,40}$/);
}

/** The newest report of a kind that satisfies the predicate, or undefined. */
async function newest<K extends Report["kind"]>(
  request: APIRequestContext,
  kind: K,
  where: (r: Extract<Report, { kind: K }>) => boolean,
): Promise<Extract<Report, { kind: K }> | undefined> {
  const all = (await reports(request)).filter((r): r is Extract<Report, { kind: K }> => r.kind === kind);
  return all.reverse().find(where);
}

test("/api/health names the build, the boot instant, the store and the reporter, uncached", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(res.headers()["cache-control"]).toBe("no-store");
  const body = await res.json();
  expectSha(body.sha);
  expect(body).toEqual({
    ok: true,
    sha: body.sha,
    bootedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    store: "jsonl-file",
    reporter: "console",
  });
  const bootedAt = Date.parse(body.bootedAt);
  expect(bootedAt).toBeLessThanOrEqual(Date.now());
  expect(Date.now() - bootedAt, "booted within the last day — the instant is the process's, not a constant").toBeLessThan(86_400_000);
});

test("a thrown render error reaches the sink with its route and SHA, and without the planted request", async ({ page, request }) => {
  const before = (await reports(request)).filter((r) => r.kind === "server-error").length;
  const res = await page.goto(`/api/mock/fault/render?q=${encodeURIComponent(PLANT)}`);
  expect(res?.status()).toBe(500);

  await expect
    .poll(async () => (await reports(request)).filter((r) => r.kind === "server-error").length, {
      message: "the console adapter received the fixture's error through onRequestError",
    })
    .toBeGreaterThan(before);

  const entry = await newest(request, "server-error", (r) => r.route.path === "/api/mock/fault/render");
  expect(entry).toBeDefined();
  expectSha(entry!.sha);
  expect(entry).toMatchObject({
    kind: "server-error",
    route: { path: "/api/mock/fault/render", method: "GET" },
    routerKind: "App Router",
    routePath: "/api/mock/fault/[kind]",
    routeType: "render",
    error: { name: "Error", message: expect.stringContaining("fault fixture") },
  });
  const text = JSON.stringify(entry);
  expect(text).not.toContain("daughter");
  expect(text).not.toContain("q=");
  expect(text).not.toMatch(/cookie|user-agent|referer/i);
});

test("a real browser's Web Vital beacon arrives as its own kind, with the pathname only", async ({ page, request }) => {
  await page.goto("/faq?q=" + encodeURIComponent(PLANT));
  await expect(page.getByRole("main")).toBeVisible();
  // LCP and CLS finalise when the page is hidden or left; a click settles LCP, the navigation
  // away fires pagehide and the keepalive beacon.
  await page.mouse.click(5, 5);
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();

  await expect
    .poll(() => newest(request, "web-vital", (r) => r.path === "/faq"), { message: "a Web Vital for /faq reached the sink" })
    .toBeDefined();
  const entry = await newest(request, "web-vital", (r) => r.path === "/faq");
  expect(entry).toMatchObject({ kind: "web-vital", metric: expect.stringMatching(/^(LCP|INP|CLS)$/), rating: expect.any(String), path: "/faq" });
  expect(typeof entry!.value).toBe("number");
  expect(JSON.stringify(entry)).not.toContain("daughter");
});

test("the report-only policy's violation document reaches the sink through report-uri", async ({ page, request }) => {
  await page.goto("/faq");
  await expect(page.getByRole("main")).toBeVisible();
  await page.evaluate(() => {
    const planted = document.createElement("script");
    planted.src = "https://planted.invalid/reporter.js";
    document.head.appendChild(planted);
  });

  await expect
    .poll(() => newest(request, "csp-violation", (r) => r.blocked.startsWith("https://planted.invalid")), {
      message: "the browser posted the violation to /api/csp-report and it reached the sink",
    })
    .toBeDefined();
  const entry = await newest(request, "csp-violation", (r) => r.blocked.startsWith("https://planted.invalid"));
  expect(entry).toMatchObject({ kind: "csp-violation", documentPath: "/faq", directive: expect.stringMatching(/^script-src/), disposition: "report" });
});

test("the intakes refuse what is not theirs", async ({ request }) => {
  expect((await request.post("/api/vitals", { data: { name: "TTFB", value: 1, rating: "good", id: "x", path: "/" } })).status()).toBe(400);
  expect((await request.post("/api/csp-report", { data: "not a report", headers: { "Content-Type": "text/plain" } })).status()).toBe(415);
  expect((await request.post("/api/csp-report", { data: { hello: "world" } })).status()).toBe(400);
});
