// The server's boot hook. Next calls `register` once when a server instance starts, before it
// serves anything: it selects the reporter sink, so `ADHDME_REPORTER` naming an adapter that does
// not exist refuses at boot. `onRequestError` is the seam Next calls for every uncaught server
// error (a render, a route handler, an action), with the request and the router's context; the
// report is built from an allow-list (`src/ops/reporter.ts`) and never carries a query string, a
// header or a body.

import type { Instrumentation } from "next";
import { report, selectSink, serverErrorReport } from "@/ops/reporter";

export function register(): void {
  selectSink();
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  report(serverErrorReport(error, request, context));
};
