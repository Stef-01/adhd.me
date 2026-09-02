// U2 (O228): the server's boot hook. Next calls `register` once when a server instance starts,
// before it serves anything, which makes it the one place a refusal is loud, early and complete:
// a production process with no signing secret, or the production deployment with a synthetic-
// phase flag left on, fails here with the reasons at the top of the boot log, and Next then
// answers every request with a 500 ("Failed to prepare server") instead of letting the first
// sign-in discover it. U4 adds `onRequestError` beside it.

import { assertProductionPosture } from "@/lib/env";

export function register(): void {
  assertProductionPosture();
}
