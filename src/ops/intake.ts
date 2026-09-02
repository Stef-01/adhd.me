// U4 (O229): what the two browser intakes accept. A route module may export only its handlers,
// so the parsing lives here where `reporter.test.ts` can reach it. Both parsers share one law
// with the server-error report: keep a path with its query stripped, never a header, a body, a
// sample or a referrer — a finder request travels as a query string.
//
// The Web Vitals intake accepts exactly the three metrics the plan's targets name (LCP, INP,
// CLS), a finite value, a rating string and a path that starts with "/". The CSP intake accepts
// both wire shapes — the `report-uri` document (`{"csp-report": {...}}`) every browser sends and
// the Reporting-API array (`[{type:"csp-violation", body:{...}}]`) — because the plan's U13 may
// choose either directive when it decides whether to enforce the policy.
import {
  commitSha,
  stripQuery,
  WEB_VITAL_METRICS,
  type CspViolationReport,
  type WebVitalMetric,
  type WebVitalReport,
} from "@/ops/reporter";

type Raw = Record<string, unknown>;

function isMetric(name: unknown): name is WebVitalMetric {
  return typeof name === "string" && (WEB_VITAL_METRICS as readonly string[]).includes(name);
}

/** The report a well-formed Web Vital beacon becomes, or null when the beacon is not one. */
export function webVitalReport(payload: unknown, now: Date = new Date()): WebVitalReport | null {
  if (!payload || typeof payload !== "object") return null;
  const { name, value, rating, path } = payload as Raw;
  if (!isMetric(name)) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (typeof rating !== "string" || rating.length > 32) return null;
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 512) return null;
  return {
    kind: "web-vital",
    at: now.toISOString(),
    sha: commitSha(),
    metric: name,
    value,
    rating,
    path: stripQuery(path),
  };
}

function field(source: Raw, ...names: string[]): string {
  for (const name of names) {
    const value = source[name];
    if (typeof value === "string") return value.slice(0, 512);
  }
  return "";
}

/** Path only: a document URI carries the origin and may carry a query the visitor typed. */
function documentPath(uri: string): string {
  try {
    return new URL(uri).pathname;
  } catch {
    return stripQuery(uri);
  }
}

/** The violation bodies inside either CSP wire shape. */
export function violationBodies(payload: unknown): Raw[] {
  if (Array.isArray(payload)) {
    return payload.flatMap((entry) => {
      const body = (entry as Raw | null)?.body;
      return body && typeof body === "object" ? [body as Raw] : [];
    });
  }
  const doc = (payload as Raw | null)?.["csp-report"];
  return doc && typeof doc === "object" ? [doc as Raw] : [];
}

export function cspViolationReport(body: Raw, now: Date = new Date()): CspViolationReport {
  return {
    kind: "csp-violation",
    at: now.toISOString(),
    sha: commitSha(),
    documentPath: documentPath(field(body, "document-uri", "documentURL")),
    directive: field(body, "effective-directive", "effectiveDirective", "violated-directive"),
    blocked: field(body, "blocked-uri", "blockedURL"),
    disposition: field(body, "disposition") || "report",
  };
}
