// U4 (O229): the reporter seam — one sink, three report shapes, and a payload law.
//
// Before this unit a server error under `next start` went to stdout and nowhere else; the error
// boundaries U3 wrote showed the reader a sentence and `console.error`'d the rest. This module is
// the place every report now passes through on its way out of the process: `instrumentation.ts`
// hands uncaught server errors here through Next's `onRequestError`, `/api/vitals` hands the
// browser's Core Web Vitals here, and `/api/csp-report` hands the report-only policy's violations
// here. A sink is an adapter behind `ReporterSink`; the console adapter is the only one written,
// and `ADHDME_REPORTER` selects by name so a hosted sink (U16's decision) slots in without a
// caller changing. An unknown name throws from `selectSink`, which `register()` calls at boot,
// so a misspelt adapter refuses to serve exactly as U2's posture faults do.
//
// THE PAYLOAD LAW. A finder request is the most personal text this product handles — a visitor
// describing what they need — and it travels as a query string and a request body. A report
// therefore never carries a query string, a header or a body: `serverErrorReport` builds its
// payload from an allow-list of fields (the path with its query cut off, the method, the router's
// own context, and the error's name, message, digest and stack), and `reporter.test.ts` plants a
// request string in every channel Next offers and proves it absent. Nothing in the process reads
// the body at all.
//
// THE RING. Every report is also remembered in a process-global ring of the last fifty, so the
// e2e (which cannot read the server's stdout) can ask `/api/mock/reports` what reached the sink.
// It lives on `globalThis` because Next bundles `instrumentation.ts` and each route separately,
// and a module-level array would be a different array in each.

export interface ServerErrorReport {
  readonly kind: "server-error";
  readonly at: string;
  readonly sha: string | null;
  readonly route: { readonly path: string; readonly method: string };
  readonly routerKind: string;
  readonly routePath: string;
  readonly routeType: string;
  readonly error: {
    readonly name: string;
    readonly message: string;
    readonly digest?: string;
    readonly stack?: string;
  };
}

export const WEB_VITAL_METRICS = ["LCP", "INP", "CLS"] as const;
export type WebVitalMetric = (typeof WEB_VITAL_METRICS)[number];

export interface WebVitalReport {
  readonly kind: "web-vital";
  readonly at: string;
  readonly sha: string | null;
  readonly metric: WebVitalMetric;
  readonly value: number;
  readonly rating: string;
  readonly path: string;
}

export interface CspViolationReport {
  readonly kind: "csp-violation";
  readonly at: string;
  readonly sha: string | null;
  readonly documentPath: string;
  readonly directive: string;
  readonly blocked: string;
  readonly disposition: string;
}

export type Report = ServerErrorReport | WebVitalReport | CspViolationReport;

export interface ReporterSink {
  readonly name: string;
  report(report: Report): void;
}

/** The console adapter: errors to stderr, everything else to stdout, one JSON line each. */
export const consoleSink: ReporterSink = {
  name: "console",
  report(report) {
    const line = `[adhd.me ${report.kind}] ${JSON.stringify(report)}`;
    if (report.kind === "server-error") console.error(line);
    else console.log(line);
  },
};

export const ADAPTERS: Readonly<Record<string, () => ReporterSink>> = {
  console: () => consoleSink,
};

export const DEFAULT_ADAPTER = "console";

/** Selects the sink `ADHDME_REPORTER` names; unset means the console; an unknown name throws. */
export function selectSink(name: string | undefined = process.env.ADHDME_REPORTER): ReporterSink {
  const key = name?.trim() || DEFAULT_ADAPTER;
  const make = ADAPTERS[key];
  if (!make) {
    throw new Error(
      `ADHDME_REPORTER=${JSON.stringify(key)} names no reporter adapter; known: ${Object.keys(ADAPTERS).join(", ")}`,
    );
  }
  const sink = make();
  state().sink = sink;
  return sink;
}

export const REPORT_RING = 50;

interface ReporterState {
  sink?: ReporterSink;
  reports: Report[];
}

const globalStore = globalThis as { __adhdMeReporter?: ReporterState };

function state(): ReporterState {
  return (globalStore.__adhdMeReporter ??= { reports: [] });
}

/** Remembers the report in the ring, then forwards it; a sink that throws never fails a request. */
export function report(entry: Report): void {
  const s = state();
  s.reports.push(entry);
  if (s.reports.length > REPORT_RING) s.reports.splice(0, s.reports.length - REPORT_RING);
  try {
    (s.sink ?? selectSink()).report(entry);
  } catch {
    // A reporting failure must not become a second failure on the request that raised the first.
  }
}

/** The last `REPORT_RING` reports, oldest first. */
export function recentReports(): readonly Report[] {
  return [...state().reports];
}

/** Forgets the ring and the selected sink — tests, and nothing served. */
export function resetReports(): void {
  globalStore.__adhdMeReporter = { reports: [] };
}

/** The commit the build came from, when Vercel exposed it; `null` for a local build. */
export function commitSha(): string | null {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null;
}

/** The path alone: a query string or fragment may carry what a visitor typed, so neither is kept. */
export function stripQuery(path: string): string {
  return path.split(/[?#]/, 1)[0] ?? "";
}

const STACK_LIMIT = 4000;

/** The shape Next hands `onRequestError`, named here so the builder is testable without Next. */
export interface ErrorRequest {
  readonly path: string;
  readonly method: string;
  readonly headers?: unknown;
}

export interface ErrorContext {
  readonly routerKind: string;
  readonly routePath: string;
  readonly routeType: string;
}

/** Builds the server-error report from an allow-list of fields; see the payload law above. */
export function serverErrorReport(
  error: unknown,
  request: ErrorRequest,
  context: ErrorContext,
  now: Date = new Date(),
): ServerErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest = (err as { digest?: unknown }).digest;
  return {
    kind: "server-error",
    at: now.toISOString(),
    sha: commitSha(),
    route: { path: stripQuery(request.path), method: request.method },
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    error: {
      name: err.name,
      message: err.message,
      ...(typeof digest === "string" ? { digest } : {}),
      ...(typeof err.stack === "string" ? { stack: err.stack.slice(0, STACK_LIMIT) } : {}),
    },
  };
}
