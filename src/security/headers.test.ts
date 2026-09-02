// U1 (O228): the security headers, the report-only CSP, and the census that keeps its
// `'unsafe-inline'` honest.
//
// The plan's U1 text asked this test to hold per-script hashes to the rendered scripts in both
// directions. `headers.ts` explains why there are no hashes (data blocks are inert, Next's
// hydration payloads cannot be hashed statically, and one hash would switch `'unsafe-inline'` off
// in every CSP3 browser). What CAN be held in both directions is smaller and truer:
//
//   - the policy names a third-party origin only where the tree loads one (GA, when configured;
//     Vercel's debug script, in development) — and nothing the tree loads is outside the policy;
//   - the only inline scripts in `app/` and `src/` are inert JSON data blocks and the GA snippet,
//     so `'unsafe-inline'` covers Next's own payloads and nothing hand-written. A new inline script
//     fails here before it can fail under U13's enforcement.
//
// `e2e/headers.spec.ts` reads the same headers off real responses and proves the policy is quiet
// on `/`, `/finder` and a console route (zero `securitypolicyviolation` events in Chromium).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import {
  contentSecurityPolicy,
  GA_HOSTS,
  securityHeaders,
  VERCEL_DEBUG_SCRIPT,
} from "./headers";
import { stripComments } from "./reachability";

const ROOT = join(__dirname, "..", "..");

/** Stable repository path for assertions and diagnostics, independent of the host OS. */
function repoPath(value: string): string {
  return value.replaceAll(sep, "/");
}

function directive(policy: string, name: string): string[] {
  const found = policy.split("; ").find((d) => d.startsWith(`${name} `));
  if (!found) throw new Error(`${name} is not in the policy`);
  return found.slice(name.length + 1).split(" ");
}

// ---------------------------------------------------------------------------------------------
// The census: every script element in the tree's runtime source, classified. The both-directions
// tests at the end read it. (Helpers sit above the tests: O196's vacuity scan reads everything
// between two `it(` starts as one test, so a helper placed between tests reads as a loop in one.)
// ---------------------------------------------------------------------------------------------

const SOURCE_EXT = /\.(ts|tsx)$/;

/** Runtime source under `app/` and `src/` — tests excluded, they may quote anything. */
function runtimeFiles(): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      if (entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (SOURCE_EXT.test(entry) && !/\.test\.tsx?$/.test(entry)) found.push(full);
    }
  };
  walk(join(ROOT, "app"));
  walk(join(ROOT, "src"));
  return found;
}

interface ScriptElement {
  file: string;
  /** `data` — a JSON/JSON-LD block the browser never executes; `external` — a `src` on another host or
   * path; `inline` — executable inline script, the thing `'unsafe-inline'` exists for. */
  kind: "data" | "external" | "inline";
  detail: string;
}

/**
 * Every `<script>` / `<Script>` element in a source file, classified. `dangerouslySetInnerHTML`
 * on anything but a data block, or a bare inline script, is an `inline` hit.
 */
export function scriptElements(file: string, rawSource: string): ScriptElement[] {
  const source = stripComments(rawSource);
  const hits: ScriptElement[] = [];
  // Elements live in JSX; a `.ts` file can only quote `<script>` in a string, and the register
  // of non-vacuity reasons does exactly that.
  const elements = file.endsWith(".tsx") ? source.matchAll(/<(script|Script)\b([^>]*)>/g) : [];
  for (const m of elements) {
    const attrs = m[2]!;
    const dataType = /type=["'](application\/(?:ld\+)?json)["']/.exec(attrs);
    if (dataType) {
      hits.push({ file, kind: "data", detail: dataType[1]! });
      continue;
    }
    const src = /\bsrc=\{?["'`]([^"'`]+)/.exec(attrs);
    if (src) {
      hits.push({ file, kind: "external", detail: src[1]! });
      continue;
    }
    const id = /\bid=["']([^"']+)["']/.exec(attrs);
    hits.push({ file, kind: "inline", detail: id ? `#${id[1]}` : "(no id)" });
  }
  // A `dangerouslySetInnerHTML` that is not on a script element is markup, not script — still
  // the JSON-LD blocks are the only users, and a second use would want its own reason.
  const dangerous = (source.match(/dangerouslySetInnerHTML/g) ?? []).length;
  const data = hits.filter((h) => h.kind === "data").length;
  if (dangerous > data) hits.push({ file, kind: "inline", detail: `dangerouslySetInnerHTML outside a data block (${dangerous - data})` });
  return hits;
}

/** Does a CSP host-source (possibly `https://*.example.com`) cover this URL? */
function covers(pattern: string, url: string): boolean {
  const host = new URL(url).host;
  const p = pattern.replace(/^https:\/\//, "");
  return p.startsWith("*.") ? host === p.slice(2) || host.endsWith(p.slice(1)) : host === p;
}

const CENSUS = runtimeFiles().flatMap((file) =>
  scriptElements(repoPath(relative(ROOT, file)), readFileSync(file, "utf8")),
);

describe("U1 the security headers", () => {
  it("ships every header the plan names, with the values it names", () => {
    const byKey = Object.fromEntries(securityHeaders().map((h) => [h.key, h.value]));
    expect(byKey).toEqual({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "microphone=(self), geolocation=(), camera=()",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy-Report-Only": contentSecurityPolicy(),
    });
    // Report-only, not enforcing: enforcement is U13's, after a week of reports.
    expect(Object.keys(byKey)).not.toContain("Content-Security-Policy");
  });

  it("is mounted on every route by next.config, alongside the two config flags", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.reactStrictMode).toBe(true);
    const routes = await nextConfig.headers!();
    expect(routes.map((r) => r.source)).toEqual(["/:path*"]);
    expect(routes[0]!.headers).toEqual(
      securityHeaders({ gaId: process.env.NEXT_PUBLIC_GA_ID, dev: process.env.NODE_ENV !== "production" }),
    );
  });
});

describe("U1 the report-only policy", () => {
  it("names no third-party origin at all in the default (GA dark, production) posture", () => {
    const policy = contentSecurityPolicy();
    expect(policy).not.toMatch(/https?:/);
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
    expect(directive(policy, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    // These three do not fall back to default-src, so their absence would be a hole, not a default.
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("carries no hash and no nonce — either would switch 'unsafe-inline' off and break every page", () => {
    for (const policy of [contentSecurityPolicy(), contentSecurityPolicy({ gaId: "G-TEST", dev: true })]) {
      expect(policy).not.toMatch(/'(sha256|sha384|sha512|nonce)-/);
      expect(policy).not.toContain("'strict-dynamic'");
    }
  });

  it("admits Google's hosts only when GA is configured, and only in the directives gtag needs", () => {
    const withGa = contentSecurityPolicy({ gaId: "G-TEST" });
    expect(directive(withGa, "script-src")).toEqual(["'self'", "'unsafe-inline'", ...GA_HOSTS.script]);
    expect(directive(withGa, "img-src")).toEqual(["'self'", ...GA_HOSTS.img]);
    expect(directive(withGa, "connect-src")).toEqual(["'self'", ...GA_HOSTS.connect]);
    // Nothing else moved: the two policies differ only by those hosts.
    const strip = (p: string) => p.replace(/ https:\/\/\*\.[a-z.-]+/g, "");
    expect(strip(withGa)).toBe(contentSecurityPolicy());
  });

  it("admits Vercel's debug script in development only, and nowhere but script-src", () => {
    const dev = contentSecurityPolicy({ dev: true });
    expect(directive(dev, "script-src")).toEqual(["'self'", "'unsafe-inline'", VERCEL_DEBUG_SCRIPT]);
    expect(dev.replace(` ${VERCEL_DEBUG_SCRIPT}`, "")).toBe(contentSecurityPolicy());
  });
});

describe("U1 both directions: the policy against what the tree loads", () => {
  it("finds the script elements it expects to find (non-vacuity)", () => {
    expect(CENSUS.length).toBeGreaterThanOrEqual(5);
    expect(CENSUS.filter((h) => h.kind === "data")).toEqual([
      { file: "app/breadcrumbs.tsx", kind: "data", detail: "application/ld+json" },
      { file: "app/faq/page.tsx", kind: "data", detail: "application/ld+json" },
      { file: "app/layout.tsx", kind: "data", detail: "application/json" },
      { file: "app/layout.tsx", kind: "data", detail: "application/ld+json" },
    ]);
  });

  it("loads scripts from no host the policy does not name — the GA loader is the only external one", () => {
    const external = CENSUS.filter((h) => h.kind === "external");
    expect(external).toEqual([{ file: "app/analytics.tsx", kind: "external", detail: expect.stringMatching(/^https:\/\/www\.googletagmanager\.com\//) }]);
    for (const hit of external) {
      expect(GA_HOSTS.script.some((pattern) => covers(pattern, hit.detail)), `${hit.detail} is outside script-src`).toBe(true);
    }
  });

  it("names, for every host the policy can admit, the code that loads from it", () => {
    // GA: the loader in app/analytics.tsx is covered above; the beacon hosts are Google's own
    // CSP guidance for gtag.js and sit in one constant so a change to them is a reviewed change.
    expect(GA_HOSTS.img.every((h) => GA_HOSTS.connect.includes(h))).toBe(true);
    // Vercel: the development-only script host is the one the installed package names.
    const vercel = readFileSync(join(ROOT, "node_modules/@vercel/analytics/dist/index.mjs"), "utf8");
    expect(vercel).toContain(`${VERCEL_DEBUG_SCRIPT}/`);
    // …and in production it loads from the same origin, which `'self'` already covers.
    expect(vercel).toContain('"/_vercel/insights/script.js"');
  });

  it("has exactly one hand-written inline script — the GA snippet — so 'unsafe-inline' covers Next's payloads and nothing else", () => {
    const inline = CENSUS.filter((h) => h.kind === "inline");
    expect(inline).toEqual([{ file: "app/analytics.tsx", kind: "inline", detail: "#ga4" }]);
  });

  it("uses no javascript: URL and no string event handler anywhere in runtime source", () => {
    const offenders: string[] = [];
    for (const file of runtimeFiles()) {
      const source = stripComments(readFileSync(file, "utf8"));
      if (/javascript:/i.test(source)) offenders.push(`${repoPath(relative(ROOT, file))}: javascript: URL`);
      if (/\son[A-Z]\w+=["']/.test(source)) offenders.push(`${repoPath(relative(ROOT, file))}: string event handler`);
    }
    expect(offenders).toEqual([]);
  });

  it("would catch a planted executable inline script (the census is not vacuous)", () => {
    const planted = `
      export function Page() {
        return (
          <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: "{}" }} />
            <script type="application/json" dangerouslySetInnerHTML={{ __html: "{}" }} />
            <script>{"alert(1)"}</script>
            <Script id="third-party" strategy="afterInteractive">{"track()"}</Script>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            <Script src="https://cdn.example/widget.js" />
          </>
        );
      }`;
    expect(scriptElements("planted.tsx", planted)).toEqual([
      { file: "planted.tsx", kind: "data", detail: "application/ld+json" },
      { file: "planted.tsx", kind: "data", detail: "application/json" },
      { file: "planted.tsx", kind: "inline", detail: "(no id)" },
      { file: "planted.tsx", kind: "inline", detail: "#third-party" },
      { file: "planted.tsx", kind: "external", detail: "https://cdn.example/widget.js" },
      { file: "planted.tsx", kind: "inline", detail: "dangerouslySetInnerHTML outside a data block (1)" },
    ]);
    expect(covers("https://*.googletagmanager.com", "https://www.googletagmanager.com/gtag/js?id=G-1")).toBe(true);
    expect(covers("https://*.googletagmanager.com", "https://cdn.example/widget.js")).toBe(false);
    expect(covers("https://va.vercel-scripts.com", "https://va.vercel-scripts.com/v1/script.debug.js")).toBe(true);
  });
});
