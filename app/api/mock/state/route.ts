// W7: mock-rail introspection for the Playwright e2e suite. Synthetic data only —
// this route exposes the in-memory seed (and its signed booking links) so tests can
// drive the flow; it is removed when the mock rail is replaced by real persistence.

import { NextRequest, NextResponse } from "next/server";
import { getStore, resetStore, type RailScenario } from "@/booking/store";
import { signBookingToken } from "@/booking/token";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

function snapshot() {
  const store = getStore();
  return {
    invitations: store.state.invitations.map((i) => ({
      id: i.id,
      status: i.status,
      sessionDate: i.sessionDate,
      patientId: i.patientId, // W74: preferences are keyed by patient, not invitation
      token: signBookingToken(i.id),
    })),
    appointments: store.state.appointments.map((a) => ({
      id: a.id,
      status: a.status,
      startsAt: a.startsAt,
      generatedByInvitation: a.generatedByInvitation,
      appointmentType: a.appointmentType,
    })),
    auditEvents: store.state.auditEvents,
  };
}

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json(snapshot());
}

export async function POST(request: NextRequest) {
  assertMockRoutesEnabled();
  // W25: ?scenario=telehealth reseeds a telehealth session; default is in-person.
  const scenario: RailScenario =
    request.nextUrl.searchParams.get("scenario") === "telehealth" ? "telehealth" : "standard";
  resetStore(scenario);
  return NextResponse.json(snapshot());
}
