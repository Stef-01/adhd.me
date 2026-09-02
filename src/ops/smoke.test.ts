// U12 (O229): the smoke's steps against fake responses, and the runbook held to the script.
//
// Two things are pinned. Each step passes on what a healthy origin gives and misses on every
// wrong thing a deployment can say (the status, the type, the body, the destination), so the
// script is not a script that prints `ok` at a dead server. And `docs/DEPLOY-RUNBOOK.md` names
// every step in the script's own words — the path as `GET <path>` and the `expects` sentence
// verbatim — so the runbook's commands are the ones the script runs, which is the unit's verify
// line. A new step without its runbook row fails here; a runbook row without its step likewise.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { health } from "./health";
import { formatSmokeResult, normaliseOrigin, runSmoke, SIGNIN_PATH, SMOKE_STEPS, type SmokeResponse } from "./smoke";

const RUNBOOK = readFileSync("docs/DEPLOY-RUNBOOK.md", "utf8");
const SUPPORT = readFileSync("docs/SUPPORT-RUNBOOK.md", "utf8");

function fake(status: number, headers: Record<string, string>, body = ""): SmokeResponse {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { status, headers: { get: (name) => lower[name.toLowerCase()] ?? null }, text: async () => body };
}

const PAGE = fake(200, { "content-type": "text/html; charset=utf-8" }, "<!DOCTYPE html><html lang=\"en-AU\"><body>…</body></html>");
const HEALTHY = fake(200, { "content-type": "application/json", "cache-control": "no-store" }, JSON.stringify(health()));
const GUARD_307 = fake(307, { location: SIGNIN_PATH });
const GUARD_200 = fake(
  200,
  { "content-type": "text/html; charset=utf-8" },
  `<html><head><meta http-equiv="refresh" content="1;url=${SIGNIN_PATH}"/></head></html>`,
);

/** What each path answers on a healthy origin — the fixture `runSmoke` is fed. */
const HEALTHY_ORIGIN: Record<string, SmokeResponse> = {
  "/": PAGE,
  "/finder": PAGE,
  "/api/health": HEALTHY,
  "/console": GUARD_200,
};

async function check(path: string, response: SmokeResponse): Promise<string | null> {
  const step = SMOKE_STEPS.find((s) => s.path === path);
  if (!step) throw new Error(`no smoke step for ${path}`);
  return step.check(response, await response.text());
}

describe("U12 the smoke steps", () => {
  it("smokes the four surfaces the plan names, in order, each with a sentence for the runbook", () => {
    expect(SMOKE_STEPS.map((s) => s.path)).toEqual(["/", "/finder", "/api/health", "/console"]);
    for (const step of eachOf(SMOKE_STEPS, "the smoke steps")) expect(step.expects.length).toBeGreaterThan(10);
  });

  it("a page passes on 200 + HTML and misses on a wrong status, a wrong type or an empty body", async () => {
    for (const path of eachOf(["/", "/finder"], "the page steps")) {
      expect(await check(path, PAGE)).toBeNull();
      expect(await check(path, fake(500, { "content-type": "text/html" }, "<html>"))).toMatch(/status 500/);
      expect(await check(path, fake(200, { "content-type": "application/json" }, "{}"))).toMatch(/content-type/);
      expect(await check(path, fake(200, { "content-type": "text/html" }, ""))).toMatch(/no <html>/);
    }
  });

  it("/api/health passes on U4's shape and misses on a cache, a non-JSON body, or a field gone wrong", async () => {
    expect(await check("/api/health", HEALTHY)).toBeNull();
    const json = (body: unknown, cache = "no-store") =>
      fake(200, { "content-type": "application/json", "cache-control": cache }, JSON.stringify(body));
    expect(await check("/api/health", json(health(), "public, max-age=60"))).toMatch(/no-store/);
    expect(await check("/api/health", fake(200, { "cache-control": "no-store" }, "<html>"))).toMatch(/not JSON/);
    expect(await check("/api/health", json({ ...health(), ok: false }))).toMatch(/ok/);
    expect(await check("/api/health", json({ ...health(), bootedAt: "yesterday" }))).toMatch(/bootedAt/);
    expect(await check("/api/health", json({ ...health(), reporter: "" }))).toMatch(/reporter/);
    expect(await check("/api/health", fake(503, { "cache-control": "no-store" }, "{}"))).toMatch(/status 503/);
  });

  it("/console passes on either form of the guard's redirect and misses on anywhere else", async () => {
    expect(await check("/console", GUARD_307)).toBeNull();
    expect(await check("/console", GUARD_200)).toBeNull();
    // The guard sending a signed-out visitor somewhere other than sign-in, in either transport.
    expect(await check("/console", fake(307, { location: "/console/onboarding" }))).toMatch(/onboarding/);
    expect(await check("/console", fake(200, {}, '<meta http-equiv="refresh" content="1;url=/finder"/>'))).toMatch(/finder/);
    // A console page that rendered for nobody — the guard did not run — is the miss that matters.
    expect(await check("/console", PAGE)).toMatch(/guard did not run/);
    expect(await check("/console", fake(302, { location: SIGNIN_PATH }))).toMatch(/status 302/);
    expect(await check("/console", fake(500, {}))).toMatch(/status 500/);
  });

  it("runSmoke walks every step, never stops at a miss, and reads a dead origin as no response", async () => {
    const asked: string[] = [];
    const results = await runSmoke("http://smoke.test/", async (url, init) => {
      expect(init.redirect).toBe("manual");
      const path = new URL(url).pathname;
      asked.push(path);
      if (path === "/finder") throw Object.assign(new Error("fetch failed"), { cause: new Error("connect ECONNREFUSED") });
      return HEALTHY_ORIGIN[path]!;
    });
    expect(asked).toEqual(["/", "/finder", "/api/health", "/console"]);
    expect(results.map((r) => r.miss)).toEqual([null, "no response: fetch failed: connect ECONNREFUSED", null, null]);
    expect(results.map((r) => r.status)).toEqual([200, null, 200, 200]);
    expect(formatSmokeResult(results[1]!)).toBe("MISS --- GET /finder — no response: fetch failed: connect ECONNREFUSED");
    expect(formatSmokeResult(results[0]!)).toBe("ok   200 GET /");
  });

  it("takes an origin and nothing more: a trailing slash is fine, a path is refused", () => {
    expect(normaliseOrigin("http://localhost:3100/")).toBe("http://localhost:3100");
    expect(normaliseOrigin("https://example.test")).toBe("https://example.test");
    expect(() => normaliseOrigin("http://localhost:3100/finder")).toThrow(/origin/);
    expect(() => normaliseOrigin("http://localhost:3100/?x=1")).toThrow(/origin/);
    expect(() => normaliseOrigin("localhost:3100")).toThrow();
  });
});

describe("U12 the deploy runbook is held to the script", () => {
  it("names every step the script runs, in the script's own words", () => {
    for (const step of eachOf(SMOKE_STEPS, "the smoke steps")) {
      expect(RUNBOOK, step.path).toContain(`\`GET ${step.path}\``);
      expect(RUNBOOK, step.path).toContain(`| ${step.expects} |`);
    }
    // And no step the script does not run: the table has exactly as many rows as there are steps.
    const rows = RUNBOOK.match(/^\| \d+ \| `GET /gm) ?? [];
    expect(rows).toHaveLength(SMOKE_STEPS.length);
  });

  it("carries the commands the sections are about — the smoke, the health read, the rollback", () => {
    expect(RUNBOOK).toContain("pnpm smoke https://<the production origin>");
    expect(RUNBOOK).toContain("pnpm smoke http://localhost:3100");
    expect(RUNBOOK).toContain("curl -s https://<the production origin>/api/health");
    for (const key of eachOf(Object.keys(health()), "the health fields")) expect(RUNBOOK, key).toContain(`\`${key}\``);
    expect(RUNBOOK).toContain("Promote to Production");
    expect(RUNBOOK).toContain("vercel promote <deployment-url>");
    expect(RUNBOOK).toContain("Never force-push `main`");
    for (const kind of eachOf(["server-error", "web-vital", "csp-violation"], "the report kinds")) {
      expect(RUNBOOK, kind).toContain(`[adhd.me ${kind}]`);
    }
  });

  it("says who is on call — the founder, as the founder's own item in the support runbook, not a gate", () => {
    expect(RUNBOOK).toMatch(/## 6\. Who is on call\n\n\*\*The founder, until the founder names a person\.\*\*/);
    expect(SUPPORT).toContain("**On call (founder's own item, U12, 2026-09-02):**");
    expect(SUPPORT).toContain("docs/DEPLOY-RUNBOOK.md");
  });
});
