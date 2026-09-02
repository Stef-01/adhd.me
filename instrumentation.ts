// U2 (O228): the server's boot hook. Next calls `register` once when a server instance starts,
// before it serves anything, which makes it the one place a refusal is loud, early and complete:
// a production process with no signing secret, or the production deployment with a synthetic-
// phase flag left on, fails here with the reasons at the top of the boot log, and Next then
// answers every request with a 500 ("Failed to prepare server") instead of letting the first
// sign-in discover it.
//
// U4 (O229): `register` also selects the reporter sink, so `ADHDME_REPORTER` naming an adapter
// that does not exist refuses at boot the same way; and `onRequestError` is the seam Next calls
// for every uncaught server error — a render, a route handler, an action — with the request and
// the router's context. The report is built from an allow-list (`src/ops/reporter.ts`) and never
// carries a query string, a header or a body.

import type { Instrumentation } from "next";
import { assertProductionPosture } from "@/lib/env";
import { report, selectSink, serverErrorReport } from "@/ops/reporter";

export function register(): void {
  assertProductionPosture();
  selectSink();
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  report(serverErrorReport(error, request, context));
};
