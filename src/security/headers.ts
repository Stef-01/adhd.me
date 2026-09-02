// U1 (O228): the HTTP security headers and the report-only Content Security Policy.
//
// One module builds the header list, so `next.config.ts`, `headers.test.ts` and
// `e2e/headers.spec.ts` read the same values — a header that lived only in the config would be a
// claim the tests could quote but not check.
//
// WHY THE POLICY CARRIES NO SCRIPT HASHES. The plan's U1 text asked for per-script hashes of the
// three JSON-LD blocks and the GA loader; the tree, read rather than remembered, says otherwise:
//
//   - The JSON-LD blocks are `type="application/ld+json"` DATA blocks. The browser never executes
//     them, `script-src` does not govern them, and a hash for them would be dead weight that looked
//     like protection.
//   - The executable inline scripts on every page are Next's own hydration payloads
//     (`self.__next_f.push(...)`, seven per page in the built output). Their bytes depend on the
//     render, so no static config can hash them.
//   - The moment ANY hash appears in `script-src`, a CSP3 browser ignores `'unsafe-inline'`. A
//     partial hash list would therefore break every page rather than tighten anything.
//
// So the honest report-only posture is the one Next documents for a statically rendered app:
// `'self' 'unsafe-inline'` for scripts, every other directive tight. Whether to move to nonces
// (which need middleware and force every route dynamic) or stay static is U13's decision, taken
// on a week of reports through the U4 sink. What keeps that decision possible is the census in
// `headers.test.ts`: the only inline scripts in this tree are Next's payloads, the inert JSON-LD
// blocks and the GA snippet — a new hand-written one fails the test.

export interface PolicyInputs {
  /** `NEXT_PUBLIC_GA_ID` — when set, the GA4 loader and its beacons join the policy. Dark by default. */
  gaId?: string | undefined;
  /** `next dev`: Vercel Analytics loads its debug script from its own host in development only. */
  dev?: boolean | undefined;
}

/** Google's published CSP for gtag.js (script, image beacons, collection endpoints). */
export const GA_HOSTS = {
  script: ["https://*.googletagmanager.com"],
  img: ["https://*.google-analytics.com", "https://*.googletagmanager.com"],
  connect: ["https://*.google-analytics.com", "https://*.analytics.google.com", "https://*.googletagmanager.com"],
} as const;

/** `@vercel/analytics` in development only; in production it is same-origin `/_vercel/insights/`. */
export const VERCEL_DEBUG_SCRIPT = "https://va.vercel-scripts.com";

export function contentSecurityPolicy({ gaId, dev }: PolicyInputs = {}): string {
  const ga = gaId ? GA_HOSTS : { script: [], img: [], connect: [] };
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...ga.script, ...(dev ? [VERCEL_DEBUG_SCRIPT] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", ...ga.img],
    "connect-src": ["'self'", ...ga.connect],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

export interface Header {
  key: string;
  value: string;
}

/** Every response, every route — `next.config.ts` mounts these on `/:path*`. */
export function securityHeaders(inputs: PolicyInputs = {}): Header[] {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "microphone=(self), geolocation=(), camera=()" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy(inputs) },
  ];
}
