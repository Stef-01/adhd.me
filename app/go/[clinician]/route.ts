// O28: the booking handoff, made measurable without collecting anything.
//
// THE ATTRIBUTION PROBLEM. The moment a reader leaves for Healthengine, this product goes
// blind: Healthengine's PMS API is inbound-only (a practice pushes availability IN; there is
// no read or conversion endpoint for a third party), so completed bookings cannot be observed
// from here. What CAN be owned is the handoff itself. Every booking link now routes through
// /go/<clinician-id>, which 302s to the clinician's Healthengine profile — so outbound intent
// is countable per clinician from this domain's own request logs and Vercel analytics, with
// NOTHING stored by this code: no cookie, no id, no body, no query echo. The redirect is the
// measurement.
//
// THE UTM TAIL rides along for the other side of the handoff: if Healthengine's page analytics
// honour standard UTM parameters, the practice's own reporting can see adhd.me as the source.
// If they strip them, nothing is lost — the /go count on our side stands alone. The third
// channel needs no code at all and is documented in docs/BOOKING-ATTRIBUTION.md: Healthengine
// asks new patients where they heard about the practice, and the practice sees that answer.

import { NextResponse } from "next/server";
import { clinicians } from "@/demo/clinicians";

export async function GET(request: Request, context: { params: Promise<{ clinician: string }> }) {
  const { clinician: id } = await context.params;
  const clinician = clinicians.find((c) => c.id === id);
  // An unknown or retired id lands on the finder rather than a 404: the person holding a
  // stale link is a person looking for a GP, not a person owed an error page.
  if (!clinician) return NextResponse.redirect(new URL("/finder", request.url), 302);

  // O29: which surface sent them — finder, profile, examples — so the counts segment by
  // where booking intent actually forms. Allow-listed, never echoed: an arbitrary query
  // reflected into a redirect is an open-redirect-adjacent smell this route refuses to have.
  const src = new URL(request.url).searchParams.get("src") ?? "";
  const surface = /^[a-z-]{1,24}$/.test(src) ? src : "finder";

  const destination = new URL(clinician.booking.url);
  destination.searchParams.set("utm_source", "adhd-me");
  destination.searchParams.set("utm_medium", "referral");
  destination.searchParams.set("utm_campaign", surface);

  // O31: one structured line into the runtime log — Vercel's log search then answers
  // "outbound bookings per clinician per surface" on any plan tier, with no store of our
  // own and nothing about the person (no IP, no UA, no id: those stay in the platform's
  // transport layer under its own retention, not in anything this product writes).
  console.log(JSON.stringify({ event: "booking-outbound", clinician: id, surface }));

  // no-store (vercel-optimize scanner finding, O32): a cached 302 would skip the server —
  // and the count above IS the route's purpose. Every click must reach this function.
  const response = NextResponse.redirect(destination, 302);
  response.headers.set("cache-control", "no-store");
  return response;
}
