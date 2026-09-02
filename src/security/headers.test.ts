// U1 (O228): the security headers, the CSP (enforced since U13), and the census that keeps its
// `'unsafe-inline'` honest.
//
// The plan's U1 text asked this test to hold per-script hashes to the rendered scripts in both
// directions. `headers.ts` explains why there are no hashes (data blocks are inert, Next's
// hydration payloads cannot be hashed statically, and one hash would switch `'unsafe-inline'` off
// in every CSP3 browser). What CAN be held in both directions is smaller and truer:
//
//   - the policy names a third-party origin only where the tree loads one (GA, when configured;
//     Vercel's debug script, in development) — and nothing the tree loads is outside the policy;
//   - the only script elements in `app/` and `src/` are inert JSON data blocks, so
//     `'unsafe-inline'` covers Next's own payloads and nothing hand-written (U13 moved the GA
//     bootstrap into module code; the loader is the one `createElement("script")`). A new inline
//     script fails here before it can fail under enforcement.
//
// `e2e/headers.spec.ts` reads the same headers off real responses and proves the policy is quiet
// on `/`, `/finder` and a console route (zero `securitypolicyviolation` events in Chromium), and
// that a planted script is blocked outright, not merely reported.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { gaLoaderUrl } from "../privacy/measurement";
import {
  contentSecurityPolicy,
  DEV_SCRIPT_SOURCES,
  GA_HOSTS,
  TILE_HOSTS,
  securityHeaders,
  VERCEL_DEBUG_SCRIPT,
} from "./headers";
import { stripComments } from "./reachability";
import { robotsHeaders } from "./robots";

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

/** U13: runtime files that create a script element from code — the other way to load a script. */
const SCRIPT_CREATORS = runtimeFiles()
  .filter((file) => /createElement\(\s*["'`]script["'`]/.test(stripComments(readFileSync(file, "utf8"))))
  .map((file) => repoPath(relative(ROOT, file)));

describe("U1 the security headers", () => {
  it("ships every header the plan names, with the values it names", () => {
    const byKey = Object.fromEntries(securityHeaders().map((h) => [h.key, h.value]));
    expect(byKey).toEqual({
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "microphone=(self), geolocation=(), camera=()",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": contentSecurityPolicy(),
    });
    // U13: enforced, not report-only — the report-only header would be a second copy that
    // blocked nothing, and a reader of the response could not tell which one was in force.
    expect(Object.keys(byKey)).not.toContain("Content-Security-Policy-Report-Only");
  });

  it("is mounted on every route by next.config, alongside the two config flags", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.reactStrictMode).toBe(true);
    const routes = await nextConfig.headers!();
    // The first entry is the security headers on every route; the rest are U7's per-route
    // X-Robots-Tag entries, which robots.test.ts holds to the crawler register — nothing else
    // may mount a header here without a test that owns it.
    expect(routes[0]!.source).toBe("/:path*");
    expect(routes[0]!.headers).toEqual(
      securityHeaders({ gaId: process.env.NEXT_PUBLIC_GA_ID, dev: process.env.NODE_ENV !== "production" }),
    );
    expect(routes.slice(1)).toEqual(robotsHeaders());
  });
});

describe("U1 the policy (U13: enforced)", () => {
  it("names no third-party origin but the map's tile host in the default (GA dark, production) posture", () => {
    const policy = contentSecurityPolicy();
    // O235: the one origin the default posture admits, for images only, and this is the pin.
    const origins = policy.match(/https?:\/\/[^\s;]+/g) ?? [];
    expect(origins).toEqual([...TILE_HOSTS.img]);
    expect(directive(policy, "img-src")).toEqual(["'self'", ...TILE_HOSTS.img]);
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
    expect(directive(policy, "script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "frame-ancestors")).toEqual(["'none'"]);
    // These three do not fall back to default-src, so their absence would be a hole, not a default.
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("U4: sends violations to the tree's own csp-report route, in every posture", () => {
    for (const policy of [contentSecurityPolicy(), contentSecurityPolicy({ gaId: "G-TEST", dev: true })]) {
      expect(directive(policy, "report-uri")).toEqual(["/api/csp-report"]);
    }
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
    expect(directive(withGa, "img-src")).toEqual(["'self'", ...TILE_HOSTS.img, ...GA_HOSTS.img]);
    expect(directive(withGa, "connect-src")).toEqual(["'self'", ...GA_HOSTS.connect]);
    // Nothing else moved: the two policies differ only by those hosts.
    const strip = (p: string) => p.replace(/ https:\/\/\*\.[a-z.-]+/g, "");
    expect(strip(withGa)).toBe(contentSecurityPolicy());
  });

  it("admits eval and Vercel's debug script in development only, and nowhere but script-src", () => {
    const dev = contentSecurityPolicy({ dev: true });
    expect(directive(dev, "script-src")).toEqual(["'self'", "'unsafe-inline'", ...DEV_SCRIPT_SOURCES]);
    expect(DEV_SCRIPT_SOURCES).toEqual(["'unsafe-eval'", VERCEL_DEBUG_SCRIPT]);
    expect(dev.replace(` ${DEV_SCRIPT_SOURCES.join(" ")}`, "")).toBe(contentSecurityPolicy());
    // The production policy never evaluates: 'unsafe-eval' is `next dev`'s runtime, not the app's.
    expect(contentSecurityPolicy({ gaId: "G-TEST" })).not.toContain("'unsafe-eval'");
  });
});

describe("U1 both directions: the policy against what the tree loads", () => {
  it("finds the script elements it expects to find (non-vacuity)", () => {
    expect(CENSUS.length).toBeGreaterThanOrEqual(4);
    expect(CENSUS.filter((h) => h.kind === "data")).toEqual([
      { file: "app/breadcrumbs.tsx", kind: "data", detail: "application/ld+json" },
      { file: "app/faq/page.tsx", kind: "data", detail: "application/ld+json" },
      { file: "app/layout.tsx", kind: "data", detail: "application/json" },
      { file: "app/layout.tsx", kind: "data", detail: "application/ld+json" },
    ]);
  });

  it("loads scripts from no host the policy does not name — the GA loader is the only external one", () => {
    // U13: no script ELEMENT in the tree has a `src` any more. The one external script is the GA
    // loader, which `app/analytics.tsx` creates from module code once the agreement holds…
    expect(CENSUS.filter((h) => h.kind === "external")).toEqual([]);
    const loader = gaLoaderUrl("G-TEST");
    expect(loader).toMatch(/^https:\/\/www\.googletagmanager\.com\//);
    expect(GA_HOSTS.script.some((pattern) => covers(pattern, loader)), `${loader} is outside script-src`).toBe(true);
    // …and it is the only place in runtime source that creates a script element at all, so a
    // second loader cannot appear without a reviewed change here.
    expect(SCRIPT_CREATORS).toEqual(["app/analytics.tsx"]);
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

  it("has no hand-written inline script at all (U13), so 'unsafe-inline' covers Next's payloads and nothing else", () => {
    // U1 tolerated one — the GA bootstrap snippet. U13 runs that bootstrap as module code, so the
    // count is zero and the next inline script needs a reason this test does not have.
    expect(CENSUS.filter((h) => h.kind === "inline")).toEqual([]);
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
