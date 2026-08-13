// W51 audit fix: one place that knows how to reset every in-memory store.
//
// The demo launcher held a hand-maintained list of reset calls, and every store added since
// had to remember to join it. They did not: by Y2 the list was missing the rate limiter (so a
// relaunched demo could silently refuse bookings), the register store, the capability graph
// and the interest store. Nobody was careless — a list that must be updated from a distance
// is simply a list that drifts.
//
// So the fix is not "add the four missing calls". It is to make the omission impossible to
// ship: this module is the single registry, and stores.test.ts reads the source tree and
// fails if any exported `reset*` function is not in it. Adding a store without registering it
// now breaks the suite rather than quietly breaking the demo.

import { resetAudit } from "@/audit/store";
import { resetStore } from "@/booking/store";
import { resetCapability } from "@/capability/graph";
import { resetInterestState } from "@/capability/store";
import { resetComplaints } from "@/complaints/store";
import { resetConsole } from "@/console/store";
import { resetEducation } from "@/education/store";
import { resetVerticals } from "@/verticals/store";
import { resetLedger } from "@/credentials/ledger";
import { resetVault } from "@/credentials/vault";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetOps } from "@/ops/store";
import { resetPathwayRegistry } from "@/pathways/registry";
import { resetPrivacy } from "@/privacy/state";
import { resetReferralRail } from "@/referrals/store";
import { resetRegisters } from "@/registers/store";

/** Every store reset, by the name the source tree exports it under. */
export const STORE_RESETTERS: Record<string, () => unknown> = {
  resetAudit,
  resetStore,
  resetCapability,
  resetInterestState,
  resetComplaints,
  resetConsole,
  resetEducation,
  resetVerticals,
  resetLedger,
  resetVault,
  resetRateLimits,
  resetOps,
  resetPathwayRegistry,
  resetPrivacy,
  resetReferralRail,
  resetRegisters,
};

/**
 * Reset every in-memory store to empty.
 *
 * Used by the demo launcher and available to any mock route that wants a clean world. The
 * rate limiter is included deliberately: leaving it populated across a reset is what made a
 * relaunched demo refuse bookings for no visible reason.
 */
export function resetAllStores(): void {
  for (const reset of Object.values(STORE_RESETTERS)) reset();
}
