// W19: ops introspection for the Playwright e2e suite (synthetic only; gated out
// of production by the W13 mock guard). Resetting also resets the booking rail so
// the queue view is deterministic.
//
// W179 added two knobs, both needed to reach the states this unit is about. A zero queue is
// the precondition for every silence state, and the CAUSE of that zero is a separate fact the
// count cannot carry — which is the whole point of the unit, so the fixture has to set them
// independently rather than infer one from the other.

import { NextResponse } from "next/server";
import { SEED_PRACTICE_ID, getStore, resetStore } from "@/booking/store";
import { getOps, queueView, recordFeedEvidence, resetOps } from "@/ops/store";
import type { FeedEvidence } from "@/ops/silence";
import type { PracticeId } from "@/domain/types";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

// The id the e2e onboarding flow produces for its first practice (W166 generates `prac-${n}`).
//
// W181: the rail seeds for SEED_PRACTICE_ID and the console mints its own ids, so the two never
// matched. `queueView` folded the whole rail with no practice filter, which hid the mismatch —
// the ops page rendered the seed practice's queue to whoever was signed in. With the filter in
// place the seed has to be re-keyed deliberately, which is this fixture's job and is stated
// rather than left as a coincidence that used to work.
const PRACTICE = "prac-1" as PracticeId;

/** Named feed states, so a spec asks for "a dead feed" rather than assembling four fields. */
const FEEDS: Record<string, FeedEvidence> = {
  well: {
    lastSuccessfulReadAt: "2026-09-01T09:00:00Z",
    health: "ok",
    usableForSending: true,
    recordsArrived: 40,
  },
  empty: {
    lastSuccessfulReadAt: "2026-09-01T09:00:00Z",
    health: "ok",
    usableForSending: true,
    recordsArrived: 0,
  },
  down: {
    lastSuccessfulReadAt: "2026-08-29T09:00:00Z",
    health: "unavailable",
    usableForSending: false,
    recordsArrived: 0,
  },
  stale: {
    lastSuccessfulReadAt: "2026-09-01T02:00:00Z",
    health: "ok",
    usableForSending: false,
    recordsArrived: 12,
  },
  never: {
    lastSuccessfulReadAt: null,
    health: "unavailable",
    usableForSending: false,
    recordsArrived: 0,
  },
};

function snapshot() {
  const ops = getOps();
  return {
    switches: ops.switches,
    auditEvents: ops.auditEvents,
    feed: ops.feed,
    queue: queueView(PRACTICE),
  };
}

export async function GET() {
  assertMockRoutesEnabled();
  return NextResponse.json(snapshot());
}

export async function POST(request: Request) {
  assertMockRoutesEnabled();
  resetOps();
  resetStore();

  const params = new URL(request.url).searchParams;
  // Absent `feed` leaves the practice unrecorded — the honest default, and its own state.
  // `practice` targets a specific one so a spec can give two practices different feeds, which
  // is what W181 needed to prove the evidence is no longer global.
  const target = (params.get("practice") ?? PRACTICE) as PracticeId;

  const feed = params.get("feed");
  if (feed) {
    const evidence = FEEDS[feed];
    if (!evidence) {
      return NextResponse.json(
        { error: `unknown feed state "${feed}"`, known: Object.keys(FEEDS) },
        { status: 400 },
      );
    }
    recordFeedEvidence(target, evidence);
  }

  // Re-key the seeded rail onto the practice under test, so the console's practice and the
  // rail's are the same one. Synthetic fixture only — the product never rewrites a practice id.
  for (const invitation of getStore().state.invitations) {
    if (invitation.practiceId === SEED_PRACTICE_ID) invitation.practiceId = target;
  }

  // An empty queue is the precondition for every silence state; the seed ships three offers.
  if (params.get("emptyQueue") === "1") getStore().state.invitations.length = 0;

  return NextResponse.json(snapshot());
}
