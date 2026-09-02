// U12 (O229): the smoke — four requests that prove a deployment is serving, as data.
//
// A push to `main` is a production deploy with no staging in front of it (plan §2.4 item 3), so
// the first question after every deploy is the same one: is the thing that went up answering?
// This module is the answer's shape — each step is a path, what a healthy origin says to it, and
// a check over the response — and `scripts/smoke.mts` is the thin caller that walks the steps
// against a given origin and sets the exit code. The steps live here rather than in the script so
// `smoke.test.ts` can run them against fake responses AND hold `docs/DEPLOY-RUNBOOK.md` to them:
// the runbook's commands are the ones the script runs because a test greps the runbook for each.
//
// WHAT IS SMOKED AND WHY. The landing page and the finder are the two pages a visitor reaches
// first, and a 200 with an HTML body proves the build renders. `/api/health` (U4) proves the
// process is the build that was expected, up since when, through which reporter. The console
// redirect proves the server side is alive too — a signed-out `/console` is sent to sign-in only
// when the session guard ran — without a credential in the script. Every request is made with
// `redirect: "manual"`, so a page that has started redirecting somewhere reads as the miss it is
// rather than as whatever it redirected to.
//
// The script carries an origin and four paths; no request text, no cookie, no secret.

import type { Health } from "./health";

/** The pieces of a response a step reads — the `Response` surface, named so a test can fake it. */
export interface SmokeResponse {
  readonly status: number;
  readonly headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export interface SmokeStep {
  /** The path requested on the origin. */
  readonly path: string;
  /** What a healthy origin answers — the sentence the runbook and the report line both carry. */
  readonly expects: string;
  /** `null` when the response is what a healthy origin gives; otherwise, what missed. */
  check(response: SmokeResponse, body: string): string | null;
}

export const SIGNIN_PATH = "/console/signin";

function html(response: SmokeResponse, body: string): string | null {
  if (response.status !== 200) return `status ${response.status}, expected 200`;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return `content-type ${JSON.stringify(type)}, expected text/html`;
  if (!/<html[\s>]/i.test(body)) return "body carries no <html> element";
  return null;
}

/** `null` when the redirect lands on sign-in; otherwise, where it went instead. */
function destination(location: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(location, "http://smoke.invalid").pathname;
  } catch {
    return `location ${JSON.stringify(location)} is not a URL`;
  }
  return pathname === SIGNIN_PATH ? null : `sent to ${JSON.stringify(location)}, expected ${SIGNIN_PATH}`;
}

export const SMOKE_STEPS: readonly SmokeStep[] = [
  { path: "/", expects: "200 and an HTML page", check: html },
  { path: "/finder", expects: "200 and an HTML page", check: html },
  {
    path: "/api/health",
    expects: "200, `Cache-Control: no-store`, and JSON with `ok: true`, a `bootedAt` instant and a `reporter` name",
    check(response, body) {
      if (response.status !== 200) return `status ${response.status}, expected 200`;
      if (response.headers.get("cache-control") !== "no-store") return "Cache-Control is not no-store";
      let health: Partial<Health>;
      try {
        health = JSON.parse(body) as Partial<Health>;
      } catch {
        return "body is not JSON";
      }
      if (health.ok !== true) return "ok is not true";
      if (typeof health.bootedAt !== "string" || Number.isNaN(Date.parse(health.bootedAt))) return "bootedAt is not an instant";
      if (typeof health.reporter !== "string" || !health.reporter) return "reporter is not named";
      return null;
    },
  },
  {
    path: "/console",
    expects: `sign-in, from the session guard: a 307 to \`${SIGNIN_PATH}\`, or a 200 whose body refreshes to it`,
    check(response, body) {
      // The guard calls `redirect()` inside the console's loading boundary (U3's `loading.tsx`),
      // so Next has already flushed a 200 shell by the time it runs and delivers the redirect as
      // `<meta http-equiv="refresh" content="1;url=/console/signin">` in the streamed body. A
      // guard that ran before the shell would answer 307 with a Location header instead. Either
      // proves the same thing — the server ran the guard and found no session — so both pass;
      // any other status, destination or a body with no redirect at all is a miss.
      if (response.status === 307) {
        return destination(response.headers.get("location") ?? "");
      }
      if (response.status !== 200) return `status ${response.status}, expected 307 or 200`;
      const refresh = /http-equiv="refresh"\s+content="\d+;url=([^"]+)"/i.exec(body);
      if (!refresh) return "200 with no redirect in the body — the session guard did not run";
      return destination(refresh[1] ?? "");
    },
  },
];

export interface SmokeResult {
  readonly path: string;
  readonly expects: string;
  /** The status read, or `null` when no response came back at all. */
  readonly status: number | null;
  /** `null` on a pass; otherwise, what missed. */
  readonly miss: string | null;
}

export type SmokeFetch = (url: string, init: { redirect: "manual" }) => Promise<SmokeResponse>;

/** Trailing slashes off, so `https://example.test/` and `https://example.test` smoke the same. */
export function normaliseOrigin(origin: string): string {
  const url = new URL(origin);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error(`smoke wants an origin, not a URL with a path: ${JSON.stringify(origin)}`);
  }
  return url.origin;
}

/** Walks every step against the origin, in order, never stopping early — the report is whole. */
export async function runSmoke(origin: string, fetchImpl: SmokeFetch = fetch): Promise<readonly SmokeResult[]> {
  const base = normaliseOrigin(origin);
  const results: SmokeResult[] = [];
  for (const step of SMOKE_STEPS) {
    let response: SmokeResponse;
    let body: string;
    try {
      response = await fetchImpl(`${base}${step.path}`, { redirect: "manual" });
      body = await response.text();
    } catch (error) {
      // Node's fetch says "fetch failed" and keeps the reason (ECONNREFUSED, a bad host) on `cause`.
      const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
      const reason = error instanceof Error ? `${error.message}${cause}` : String(error);
      results.push({ path: step.path, expects: step.expects, status: null, miss: `no response: ${reason}` });
      continue;
    }
    results.push({ path: step.path, expects: step.expects, status: response.status, miss: step.check(response, body) });
  }
  return results;
}

/** One line per step, the way the script prints them. */
export function formatSmokeResult(result: SmokeResult): string {
  const verdict = result.miss === null ? "ok  " : "MISS";
  const status = result.status === null ? "---" : String(result.status);
  return `${verdict} ${status} GET ${result.path}${result.miss === null ? "" : ` — ${result.miss}`}`;
}
