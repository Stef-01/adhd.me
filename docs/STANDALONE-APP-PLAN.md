# The finder as a standalone app — critical appraisal and plan (O220 lane)

> Founder-requested 2026-09-01: *"Critically appraise and commence plan to convert this into a
> standalone app. Use relevant impeccable design and other design and engineering skills like
> whole emiii engineering suite."* Appraisal first, because the honest answer to "should this be
> an app" is not an unqualified yes; then the plan, phased so the first phase commenced in the
> same session (§5).

## 1. What "this" already is, measured

The appraisal starts from facts about the tree, not vibes:

- **The finder is already app-shaped.** It is a single client surface (`care-finder.tsx` + seven
  stage components) in a phone-width shell (`--shell-w` 520/640px), designed 390px-first, with
  its own header, staged navigation, and a motion vocabulary (O218). Nine `safe-area-inset`
  usages already exist. The distance from "web page" to "app-feeling screen" is small — which is
  an argument that most of the *felt* value of "an app" is buyable without one.
- **The core is portable today.** `src/matching`, `src/demo` (roster + synthetic roster),
  `src/geo`, `src/compliance` contain **zero** React or Next imports — a pure-TS engine any
  runtime can host. That seam exists by the tree's own discipline (W193's data/engine split) and
  is the single most valuable asset for any conversion.
- **The law machinery is web-bound.** The thing that makes this tree trustworthy — the contrast,
  touch, fold, accent, honesty and compliance **sweeps** — runs in Playwright against rendered
  web pages. 316 e2e tests, the visual-baseline protocol, the copy linters at page level. None
  of it reaches a native view hierarchy.
- **One capability is genuinely fragile on the web**: speech. `docs/MIC-FAILURE-MODES.md` and
  the O12/O18/O48/O69/O70 lineage document iOS WebKit's recognition quirks — including a
  failure family keyed on the **standalone (installed) flag**. Native STT is the one concrete
  capability a native shell buys that the web cannot match.

## 2. The critical appraisal

**A. The strongest argument FOR an app is distribution feel, and it cuts against the founder's
own stated posture.** An app-store listing is the most public act a product can perform — review
teams, a public catalogue page, screenshots, a privacy questionnaire. The finder's current
posture (decision `synthetic-roster-tickbox`) is *"not public… just for testing"*. Those are not
compatible: shipping to the App Store/Play Store is not a testing posture, and both stores apply
**heightened health-app review** (medical-app guidelines, data-safety declarations). Until the
posture changes, "standalone app" should mean *installable without a store* (PWA) or
*store-private testing tracks* (TestFlight / Play internal testing) — both real, both cheap,
neither triggering public-catalogue review.

**B. A second UI codebase is a compliance surface with no sweeps, and this tree should refuse
it until the machinery exists.** Every honesty law here — "no clinical claims a patient reads",
"closed books never hidden", "counts stand alone" — is enforced by tests that read rendered web
DOM. A React Native rewrite re-renders every patient-facing sentence through code none of those
sweeps reach. The purge/O163 history is exactly what happens to unswept surfaces. So the
plan's rule: **no native patient surface ships before its equivalent sweep exists** (Maestro/
Detox driving the same linters over the native tree, or a shared render layer the existing
sweeps cover).

**C. Store metadata is a new patient-readable surface.** Listing copy, screenshots and the
privacy questionnaire render to the same stressed reader the W23 rules protect. Whatever route
is taken, the store-listing strings live in the repo and pass `lintLandingCopy` like everything
else — a check that must exist before a listing does.

**D. The webview-wrap middle road (Capacitor) is priced honestly:** one codebase, native STT
via plugin, store presence — but Apple's guideline 4.2 (minimal functionality) rejects thin
wrappers unpredictably, and a wrapper inherits BOTH stores' health review anyway. It is a
Phase-3 option behind the same founder gate as the rewrite, not a free shortcut.

**E. The design suites' verdict** (impeccable + the Emil/Jakub motion frame, weighted per this
tree's own law — Jakub-primary, Emil-secondary on patient surfaces): the finder is an
**Operate** surface, so an app conversion is judged on scanability, native expectations, and the
real usage scene — a stressed person on a phone — not on expression. The frequency gate says the
finder's core loop (type → results → profile) is *frequent*: instant or near-instant, which the
O218 vocabulary already encodes (`--dur-tap` 150ms, keyboard paths unanimated). An app that adds
splash flourishes or heavier transitions would be a regression, not an upgrade. What app-grade
polish actually demands here, in order: **safe-area completeness** in standalone display (the
booking bar, the consent bar, the sticky footer at the home-indicator edge), **launch state**
(background_color/theme_color so the standalone window opens on paper, not white flash),
**touch physics** (already at the 44px floor by law), and **speech that survives the standalone
flag** (the documented B2 family — the PWA phase is also the cheapest way to *reproduce* it).

**Verdict: phase it.** The felt goal ("it's an app on my phone") is reachable this week with a
PWA at near-zero compliance cost; the engine seam should be formalised regardless of what
follows; and the native decision is a founder gate with real prices on both options, blocked on
sweep parity and on resolving the public-distribution contradiction.

## 3. The phases

### Phase 1 — Installable PWA (1a COMMENCED in this session; 1b–1c are units)
- **1a (done with this document):** `app/manifest.ts` (standalone display, paper theme/
  background — the same one-literal-mirrors-`--paper` law `viewport.themeColor` already
  carries), generated app icons (`app/icon.tsx`, `app/apple-icon.tsx` — build-generated like the
  OG image, never binaries; the band carries the mark, no faces, no new raw-hex outside the
  census's component exceptions). The finder installs to a home screen on Android/desktop today
  and via Add-to-Home-Screen on iOS.
- **1b:** standalone-display audit as a unit: `display-mode: standalone` media handling, the
  safe-area completeness pass (consent bar, booking bar, sticky CTA at the home-indicator),
  and a qa capture set in installed mode. Reproduce and record the MIC B2 standalone-flag
  behaviour while there.
- **1c (optional, priced):** a service worker for an offline app shell + cached roster. Real
  value (a stressed reader on a train), real cost (cache-invalidation discipline vs the hourly
  loop's deploys; the ledger's deploy-quota law). Its own unit with its own e2e.

### Phase 2 — The engine seam, formalised
Extract `src/matching`, `src/demo`, `src/geo`, `src/compliance` (+ `src/onboarding/types`) into
a workspace package (`packages/core` or path-alias discipline with an import-boundary test — the
cheap version first). The census: a test asserting the core imports no React/Next/DOM, so the
purity that exists today by accident becomes law. Worth doing for THIS deployment alone; free if
native ever happens.

### Phase 3 — Native, founder-gated (G-APP-1..3, AR36 register entries when opened)
- **G-APP-1:** Does the finder go to public stores at all, given the testing posture and both
  stores' health-app review? (TestFlight/internal tracks are available without answering this.)
- **G-APP-2:** Wrapper (Capacitor: one codebase, 4.2 rejection risk, native STT plugin) vs
  rewrite (Expo/RN on the Phase-2 core: real native feel, second UI codebase)? Priced above.
- **G-APP-3:** Sweep parity: no native patient surface before the honesty/compliance sweeps
  cover it. This gate is engineering-owned in the sense that the loop builds the machinery, but
  ONLY opens after G-APP-1/2.

## 4. What must not be lost, whatever the route
The adhdme-taste laws, the compliance linters over every patient string (store metadata
included), the 44px floor, reduced-motion parity, the real-only counts, the example-profile
labeling, and the Acknowledgement of Country — which closes the product, not the website.

## 5. Commenced now
Phase 1a ships with this commit: manifest + generated icons, censuses re-derived, verified.
