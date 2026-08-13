// W74: contact-preference introspection for the Playwright e2e (synthetic only, same
// posture as the other /api/mock routes — removed when real persistence lands).

import { NextResponse } from "next/server";
import { getStore } from "@/booking/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";
import { planContact } from "@/messaging/preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  assertMockRoutesEnabled();
  const store = getStore();

  // Return the stored preferences AND what they actually decide, so the e2e can assert
  // the preference is honoured rather than merely recorded.
  const now = new Date();
  const offerExpiresAt = new Date(now.getTime() + 14 * 86_400_000);
  const plans = Object.fromEntries(
    Object.entries(store.contactPreferences).map(([patientId, prefs]) => [
      patientId,
      planContact(prefs, now, offerExpiresAt),
    ]),
  );

  // Keys are practiceId::patientId (W78 tenancy fix); the e2e reads by patient, so also
  // expose a patient-keyed view rather than making the test parse the composite key.
  const byPatient = Object.fromEntries(
    Object.entries(store.contactPreferences).map(([key, prefs]) => [key.split("::")[1] ?? key, prefs]),
  );
  const plansByPatient = Object.fromEntries(
    Object.entries(plans).map(([key, plan]) => [key.split("::")[1] ?? key, plan]),
  );
  return NextResponse.json({ preferences: byPatient, plans: plansByPatient, keyed: store.contactPreferences });
}
