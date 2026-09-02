// U4 (O229): the reporter seam proven at the unit that matters most — the payload law.
//
// The ledger's verify text for U4: an uncaught server error reaches the sink with route and SHA,
// and patient text (a finder request) never appears in a report payload — a planted request
// string must be absent. The plant goes into every channel Next's `onRequestError` offers (the
// query string, a header, a cookie) and into the two intake routes' own channels (a Web Vital
// beacon's path, a violation document's URI); the assertion is on the serialised payload, so a
// field added later that leaks would fail here rather than in a week of reports.
//
// The shared plant sits above the first describe so each suite's loop over it is over a
// constant, never an empty list (O196).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestError, register } from "../../instrumentation";
import { POST as postCspReport } from "../../app/api/csp-report/route";
import { POST as postVital } from "../../app/api/vitals/route";
import { health } from "./health";
import { cspViolationReport, violationBodies, webVitalReport } from "./intake";
import {
  ADAPTERS,
  commitSha,
  consoleSink,
  recentReports,
  report,
  REPORT_RING,
  resetReports,
  selectSink,
  serverErrorReport,
  stripQuery,
  type Report,
} from "./reporter";

/** A finder request as a visitor would type it — the text that must never leave the process. */
const PLANT = "my daughter is nine and cannot sit through a lesson, we live in Marrickville";
const ENCODED = encodeURIComponent(PLANT);

const CONTEXT = { routerKind: "App Router", routePath: "/api/mock/fault/[kind]", routeType: "render" } as const;

/** The whole payload as it would leave the process, so the assertion covers every field at once. */
function serialised(entry: Report): string {
  return JSON.stringify(entry);
}

beforeEach(() => {
  resetReports();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("U4 serverErrorReport carries the route and the SHA", () => {
  it("names the path, the method, the router's context and the error, stamped with the build's commit", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "abc1234def5678");
    const error = Object.assign(new Error("fault fixture: the render error exists to raise"), { digest: "1234567890" });
    const entry = serverErrorReport(error, { path: "/api/mock/fault/render", method: "GET", headers: {} }, CONTEXT, new Date("2026-09-02T05:00:00Z"));
    expect(entry).toEqual({
      kind: "server-error",
      at: "2026-09-02T05:00:00.000Z",
      sha: "abc1234def5678",
      route: { path: "/api/mock/fault/render", method: "GET" },
      routerKind: "App Router",
      routePath: "/api/mock/fault/[kind]",
      routeType: "render",
      error: { name: "Error", message: error.message, digest: "1234567890", stack: expect.stringContaining("fault fixture") },
    });
  });

  it("stamps null where Vercel exposed no commit — a local build, never a guess", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "");
    expect(commitSha()).toBeNull();
    expect(serverErrorReport(new Error("x"), { path: "/", method: "GET" }, CONTEXT).sha).toBeNull();
  });

  it("wraps a thrown non-Error so the shape never varies", () => {
    const entry = serverErrorReport("a string was thrown", { path: "/", method: "GET" }, CONTEXT);
    expect(entry.error.name).toBe("Error");
    expect(entry.error.message).toBe("a string was thrown");
    expect(entry.error.digest).toBeUndefined();
  });
});

describe("U4 the payload law: a planted finder request is absent from every report", () => {
  it("is absent from a server-error report planted in the query, a header and a cookie", () => {
    const request = {
      path: `/finder?q=${ENCODED}&raw=${PLANT}`,
      method: "POST",
      headers: { "x-request": PLANT, cookie: `adhdme-finder=${ENCODED}`, referer: `https://adhd.me/finder?q=${ENCODED}` },
    };
    const entry = serverErrorReport(new Error("boom"), request, CONTEXT);
    const text = serialised(entry);
    expect(text).not.toContain(PLANT);
    expect(text).not.toContain(ENCODED);
    expect(text).not.toContain("Marrickville");
    expect(entry.route.path).toBe("/finder");
    expect(text).not.toMatch(/cookie|referer|x-request/i);
  });

  it("is absent from a Web Vital report whose path carried it as a query", () => {
    const entry = webVitalReport({ name: "LCP", value: 1234.5, rating: "good", id: "v1", path: `/finder?q=${ENCODED}#${PLANT}` });
    expect(entry).not.toBeNull();
    expect(serialised(entry!)).not.toContain("Marrickville");
    expect(entry!.path).toBe("/finder");
  });

  it("is absent from a policy-violation report whose document URI and sample carried it", () => {
    const entry = cspViolationReport({
      "document-uri": `https://adhd.me/finder?q=${ENCODED}`,
      "effective-directive": "script-src",
      "blocked-uri": "inline",
      "script-sample": PLANT,
      referrer: `https://adhd.me/?q=${ENCODED}`,
      disposition: "report",
    });
    const text = serialised(entry);
    expect(text).not.toContain("Marrickville");
    expect(entry.documentPath).toBe("/finder");
    expect(text).not.toMatch(/sample|referrer/);
  });

  it("stripQuery cuts at the first ? or #", () => {
    expect(stripQuery("/finder?q=a#b")).toBe("/finder");
    expect(stripQuery("/finder#q=a")).toBe("/finder");
    expect(stripQuery("/finder")).toBe("/finder");
  });
});

describe("U4 the console adapter and the selection law", () => {
  it("logs a server error through console.error as one JSON line naming the kind", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const entry = serverErrorReport(new Error("boom"), { path: "/x", method: "GET" }, CONTEXT);
    consoleSink.report(entry);
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0]![0] as string;
    expect(line.startsWith("[adhd.me server-error] ")).toBe(true);
    expect(JSON.parse(line.slice("[adhd.me server-error] ".length))).toEqual(entry);
  });

  it("logs a Web Vital and a violation through console.log, not error", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleSink.report(webVitalReport({ name: "CLS", value: 0.01, rating: "good", id: "c", path: "/" })!);
    consoleSink.report(cspViolationReport({ "document-uri": "https://adhd.me/", "effective-directive": "img-src", "blocked-uri": "https://x.example/p.png" }));
    expect(log).toHaveBeenCalledTimes(2);
    expect(error).not.toHaveBeenCalled();
  });

  it("selects the console adapter when ADHDME_REPORTER is unset, empty, or says so", () => {
    vi.stubEnv("ADHDME_REPORTER", "");
    expect(selectSink().name).toBe("console");
    expect(selectSink(undefined).name).toBe("console");
    expect(selectSink("console").name).toBe("console");
    expect(selectSink(" console ").name).toBe("console");
  });

  it("refuses an unknown adapter name, naming the known ones — the boot-time refusal", () => {
    expect(() => selectSink("datadog")).toThrow(/ADHDME_REPORTER="datadog" names no reporter adapter; known: console/);
    vi.stubEnv("ADHDME_REPORTER", "sentry");
    expect(() => register()).toThrow(/sentry/);
    expect(Object.keys(ADAPTERS)).toEqual(["console"]);
  });
});

describe("U4 instrumentation.onRequestError reaches the sink and the ring", () => {
  it("forwards a thrown error to the selected sink and remembers it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("ADHDME_REPORTER", "console");
    register();
    void onRequestError(new Error("boom"), { path: "/api/mock/fault/render?q=x", method: "GET", headers: {} }, {
      ...CONTEXT,
      revalidateReason: undefined,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const remembered = recentReports();
    expect(remembered).toHaveLength(1);
    expect(remembered[0]).toMatchObject({ kind: "server-error", route: { path: "/api/mock/fault/render", method: "GET" } });
  });

  it("selects a sink lazily when a route bundle reports before register ran", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    report(webVitalReport({ name: "INP", value: 80, rating: "good", id: "i", path: "/" })!);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("keeps the last fifty only, oldest first, and a sink that throws never fails the caller", () => {
    vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("the sink is down");
    });
    for (let i = 0; i < REPORT_RING + 5; i += 1) {
      report(webVitalReport({ name: "LCP", value: i, rating: "good", id: String(i), path: "/" })!);
    }
    const ring = recentReports();
    expect(ring).toHaveLength(REPORT_RING);
    expect((ring[0] as { value: number }).value).toBe(5);
    expect((ring[REPORT_RING - 1] as { value: number }).value).toBe(REPORT_RING + 4);
  });
});

describe("U4 the intake routes hold their shapes", () => {
  it("/api/vitals accepts the three metrics and refuses everything else", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const post = (body: unknown) => postVital(new Request("http://localhost/api/vitals", { method: "POST", body: JSON.stringify(body) }));
    expect((await post({ name: "LCP", value: 1500, rating: "needs-improvement", id: "a", path: "/finder?q=x" })).status).toBe(204);
    expect(recentReports()).toEqual([expect.objectContaining({ kind: "web-vital", metric: "LCP", path: "/finder" })]);
    for (const bad of [
      { name: "FCP", value: 1, rating: "good", id: "a", path: "/" },
      { name: "LCP", value: "1", rating: "good", id: "a", path: "/" },
      { name: "LCP", value: Number.NaN, rating: "good", id: "a", path: "/" },
      { name: "LCP", value: -1, rating: "good", id: "a", path: "/" },
      { name: "LCP", value: 1, rating: 7, id: "a", path: "/" },
      { name: "LCP", value: 1, rating: "good", id: "a", path: "finder" },
      { name: "LCP", value: 1, rating: "good", id: "a", path: "https://evil.example/" },
      null,
      [],
    ]) {
      expect((await post(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await postVital(new Request("http://localhost/api/vitals", { method: "POST", body: "{not json" }))).status).toBe(400);
    expect(recentReports()).toHaveLength(1);
  });

  it("/api/csp-report takes both wire shapes and refuses the wrong type, an oversize body and non-reports", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const post = (body: string, type = "application/csp-report") =>
      postCspReport(new Request("http://localhost/api/csp-report", { method: "POST", body, headers: { "Content-Type": type } }));
    const legacy = JSON.stringify({ "csp-report": { "document-uri": "https://adhd.me/finder?q=secret", "effective-directive": "script-src", "blocked-uri": "inline" } });
    expect((await post(legacy)).status).toBe(204);
    const reporting = JSON.stringify([
      { type: "csp-violation", body: { documentURL: "https://adhd.me/", effectiveDirective: "img-src", blockedURL: "https://x.example/a.png", disposition: "report" } },
      { type: "deprecation", body: {} },
    ]);
    expect((await post(reporting, "application/reports+json; charset=utf-8")).status).toBe(204);
    expect(recentReports()).toEqual([
      expect.objectContaining({ kind: "csp-violation", documentPath: "/finder", directive: "script-src", blocked: "inline", disposition: "report" }),
      expect.objectContaining({ kind: "csp-violation", documentPath: "/", directive: "img-src", blocked: "https://x.example/a.png", disposition: "report" }),
      expect.objectContaining({ kind: "csp-violation", documentPath: "", directive: "", blocked: "" }),
    ]);
    expect((await post(legacy, "text/plain")).status).toBe(415);
    expect((await post("x".repeat(20_000))).status).toBe(413);
    expect((await post("{not json")).status).toBe(400);
    expect((await post(JSON.stringify({ hello: "world" }))).status).toBe(400);
    expect((await post(JSON.stringify([{ type: "deprecation" }]))).status).toBe(400);
    expect(violationBodies({ "csp-report": "not an object" })).toEqual([]);
  });

  it("/api/health names the build, the boot instant, the store and the reporter", () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "deadbeef");
    vi.stubEnv("ADHDME_REPORTER", "");
    expect(health(1_800_000_000_000, 90)).toEqual({
      ok: true,
      sha: "deadbeef",
      bootedAt: new Date(1_800_000_000_000 - 90_000).toISOString(),
      store: "jsonl-file",
      reporter: "console",
    });
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "");
    expect(health().sha).toBeNull();
  });
});
