import type { Metadata } from "next";
import { seoMetadata } from "@/seo/pages";
import { CareFinder } from "../care-finder";

// O230, founder-directed ("there should be no landing page, it should function exactly like an
// app for the demo day"): the front door is the product.
//
// This route used to render the story — four sections about why ADHD.ME exists, with the reader's
// first action a link to somewhere else. Every health app with published structure opens the other
// way round: Zocdoc's cold open IS the search surface, the NHS App opens on its Home hub, Apple
// Health on Summary. None of them opens on an argument. So the finder moved here whole and the
// story moved to `/story`, where it is a tab like any other and still says everything it said.
//
// `/finder` still resolves — it redirects here — because the address is in the ledger, in the
// runbook, in every worked example and in fifteen e2e specs, and an app that changes its own front
// door should not also break every link that pointed at it.
//
// U7 FOLLOWS THE PRODUCT. The finder is hidden from crawlers because this deployment is for
// testing and its roster defaults to invented example profiles; moving it to `/` moves that
// reasoning to `/`, and `src/security/robots.ts` now says so for the root. The alternative — a
// root that is indexed while the thing it renders may not be — is the exact inconsistency U7's
// both-directions test exists to catch.
// IN A ROUTE GROUP, AND THE E2E IS WHY. `loading.tsx` beside this file is the finder's streaming
// boundary (U3). At the ROOT it was every route's boundary, and a root Suspense boundary changes
// what a client receives: `/about`, which calls `notFound()` while the team page is gated, began
// streaming a 200 with the loading line instead of a 404, and the fault fixture's thrown render
// error arrived as a 200 that hid it. Three specs caught it — the gate working exactly as it
// should. `(app)` is not in any URL; it scopes the boundary to the route that actually streams.
export const metadata: Metadata = seoMetadata("/");

export default function AppHome() {
  return <CareFinder />;
}
