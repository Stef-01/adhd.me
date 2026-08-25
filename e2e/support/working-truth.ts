// AR37: the working-truth register — for every route, the assertion that proves it WORKED.
//
// Every other sweep in this suite proves structure: touch targets, contrast, focus, semantics,
// fold, honesty. Each guards its subject on whatever happens to render, with at most a
// text-length vacuity floor — so a console screen whose fixture quietly failed, or a page stuck
// on an empty state, renders a perfectly styled nothing and passes all of them. O174 found
// exactly that (three sweeps measuring unlinked refusal pages for weeks); `seedFixtures` now
// fails loudly when SEEDING fails, but nothing yet fails when RENDERING does.
//
// So each route declares a PROOF: a pattern that can only match when the route rendered its own
// real content — fixture-derived on data screens (the seeded referral, the seeded credential,
// the seeded pathway BY NAME), meaning-bearing copy on static pages (the sentence the page
// exists to say, not its <h1>, which an error shell could share). An error boundary or an
// unresolved skeleton cannot satisfy any of these by construction.
//
// Both directions, W102's shape, enforced in e2e/working-truth.spec.ts: a route with no proof
// fails; a proof naming a vanished route fails; and every proof must match its rendered page.
// A new route therefore joins this register by existing, never by being remembered.

export interface RouteProof {
  /** What can only appear when the page rendered real content. */
  proof: RegExp;
  /** Where the proven content comes from — a seeded fixture, or the page's own committed copy. */
  source: "fixture" | "copy";
  /** Why THIS string proves work happened, in a sentence somebody can disagree with. */
  why: string;
}

export const ROUTE_PROOFS: Readonly<Record<string, RouteProof>> = {
  // ── Public, signed out. Copy proofs carry the sentence the page exists to say.
  "/": {
    proof: /Everything from assessment to follow-up, all with one GP/,
    source: "copy",
    why: "The landing page's one idea in its own words; an error shell or a skeleton says nothing about one GP carrying the whole pathway.",
  },
  "/about": {
    proof: /That page does not exist/,
    source: "copy",
    why: "Founder-gated behind notFound() while TEAM_PAGE_PUBLIC is false (O155) — the 404 IS the working state, same treatment as the fold sweep's GATED_404. The day the founder ungates it, this proof goes red and must be replaced with the team content, which is exactly the forcing this register wants.",
  },
  "/approach": {
    proof: /What finding ADHD care actually looks like, and what we changed/,
    source: "copy",
    why: "The approach page's own thesis sentence, which no other route and no failure state carries.",
  },
  "/clinicians": {
    proof: /What kind of GP do you want to become\?/,
    source: "copy",
    why: "The first step of the clinician funnel's chooser — it renders only when the interactive direction picker mounted, not from a static shell.",
  },
  "/clinicians/join": {
    proof: /Be findable by the people already looking/,
    source: "copy",
    why: "The join page's promise line, beside the register-interest email path the founder specified.",
  },
  "/demo": {
    proof: /Demo Family Practice, Dr Amara Lee, one open session, three invited patients/,
    source: "copy",
    why: "The demo's exact scripted cast; the sentence exists to declare the synthetic scenario and nothing else renders it.",
  },
  "/examples": {
    proof: /Each result below is computed live/,
    source: "copy",
    why: "The worked-examples page's claim about itself — the sentence introduces the computed results the page exists to show.",
  },
  "/faq": {
    proof: /You describe what you are looking for in your own words/,
    source: "copy",
    why: "The first answer's own definition of the product; a FAQ that rendered no answers cannot carry it.",
  },
  "/finder": {
    proof: /Describe the GP you are looking for, or use the microphone to talk/,
    source: "copy",
    why: "The finder's welcome-stage prompt — it renders only when the interactive stage machine mounted, which is the work this route does.",
  },
  "/practices": {
    proof: /Turn unused appointment capacity into measured continuity of care/,
    source: "copy",
    why: "The B2B page's headline claim, the one sentence the practice audience is there to read.",
  },
  "/privacy": {
    proof: /What you type or say into the finder is/,
    source: "copy",
    why: "The short version's first fact — the notice actually stating what is collected, not just a banner.",
  },
  "/privacy/automated-decisions": {
    proof: /automated-decision-making transparency requirements/,
    source: "copy",
    why: "The ADM statement naming the legal requirement it is published to meet; no other page says it.",
  },
  "/privacy/counsel-review": {
    proof: /Why the drafts are marked draft/,
    source: "copy",
    why: "The legal-check page's own subject line, explaining the draft banners the other two legal pages carry.",
  },
  "/terms": {
    proof: /ADHD\.ME is a finder: it shows/,
    source: "copy",
    why: "The terms' short-version opening — the responsibility statement territory, rendered from the page's own constants.",
  },
  "/thanks": {
    proof: /a person reads every registration/,
    source: "copy",
    why: "The post-registration promise (a person replies, nothing automated) — the operational sentence this page exists to make.",
  },
  "/book/[token]": {
    proof: /Dr Amara Lee at Demo Family Practice has appointment times available/,
    source: "fixture",
    why: "Rendered from the invitation minted against the seeded state in this very run — the clinician, the practice and the offer are all fixture data reaching the page through a real token.",
  },

  // ── Console, signed in and seeded. Fixture proofs name the seeded data itself.
  "/console": {
    proof: /holdout 10%/,
    source: "fixture",
    why: "The 10% holdout is what signInAndOnboard typed into the onboarding form this run; the home screen re-rendering it proves the created practice is the one being shown.",
  },
  "/console/allocation": {
    proof: /One allocation, worked through/,
    source: "copy",
    why: "The worked-example page's own title sentence, above the synthetic allocation it computes; the demo roster it draws on is committed data.",
  },
  "/console/applications": {
    proof: /Join requests[\s\S]*Nobody has been granted access to it yet/,
    source: "copy",
    why: "The community program's register is deliberately NOT the practice's: for a practice login the truthful render is this ownership refusal, stated in the page's own words — not an empty table pretending the register is theirs.",
  },
  "/console/capability": {
    proof: /Placeholder credential, verified by External Body/,
    source: "fixture",
    why: "The seeded capability fixture's external-verification row, rendered on the signed-in clinician's own profile — the deepest of the three record kinds the page reports.",
  },
  "/console/capacity": {
    proof: /the range contained what happened 1431 times/,
    source: "fixture",
    why: "A computed calibration count over the seeded session diary — it can only render when the capacity model actually scored the seeded weeks.",
  },
  "/console/case-mix": {
    proof: /Example register A[\s\S]*How much of this work would you take\?/,
    source: "fixture",
    why: "The seeded register's name followed by the per-register preference control — the control renders once per seeded row, so its presence under the row name proves the fixture reached the form.",
  },
  "/console/complaints": {
    proof: /Record a complaint[\s\S]*What happened/,
    source: "copy",
    why: "The intake form with its fields is the page's work; its two lists empty is the truthful state, since nothing seeds a complaint (AR31's test files one through this exact form).",
  },
  "/console/credentials": {
    proof: /cred-live[\s\S]*cred-waiting/,
    source: "fixture",
    why: "Both seeded credential ids, in their two different states (confirmed with an expiry, waiting to be checked) — the linked fixture O174 found silently failing, now named.",
  },
  "/console/dashboard": {
    proof: /INCREMENTAL ATTENDED \/ 1,000[\s\S]{0,40}120\.6/,
    source: "fixture",
    why: "The north-star figure computed from the deterministic W14 simulation — the number exists only if the sim ran and the metric pipeline shaped it.",
  },
  "/console/education": {
    proof: /Placeholder material A1 — fixture only\./,
    source: "fixture",
    why: "The seeded education item's own title, rendered through curation for the practice's registers — the second linked fixture from O174's finding.",
  },
  "/console/interest": {
    proof: /Community interest[\s\S]*Nobody has been granted access to it yet/,
    source: "copy",
    why: "Same shape as /console/applications: the community register belongs to the program, so the practice login's truthful render is the ownership refusal in the page's own words.",
  },
  "/console/interop": {
    proof: /Nothing has been exchanged with any outside system/,
    source: "copy",
    why: "The G1 founder gate means no real PMS connection may exist, so the truthful working state IS the honest zero — this page reporting an exchange would be the failure.",
  },
  "/console/interview": {
    proof: /Twenty minutes of a doctor talking about how they work/,
    source: "copy",
    why: "The onboarding-interview walkthrough's own description of itself, above the scripted transcript it plays.",
  },
  "/console/matching": {
    proof: /What the finder did and why/,
    source: "copy",
    why: "The matching-transparency page's title claim — every number below it is read back out of the finder's own functions.",
  },
  "/console/onboarding": {
    proof: /Three settings to start/,
    source: "copy",
    why: "The onboarding form's framing line above its three fields — the form rendering is this route's entire job.",
  },
  "/console/ops": {
    proof: /Sending is active/,
    source: "fixture",
    why: "The sending status read from the seeded ops store, beside the kill switch that changes it — state, not caption.",
  },
  "/console/outcomes": {
    proof: /2 referral\(s\) on this rail/,
    source: "fixture",
    why: "The count of seeded referral records on the rail; the three-way recorded/stopped/silent breakdown below it is computed from those rows.",
  },
  "/console/outreach": {
    proof: /syn-ref-001/,
    source: "fixture",
    why: "The first seeded referral id in the would-be-invited table — synthetic rows rendered in referral-record order.",
  },
  "/console/pathways": {
    proof: /path-a — version 1/,
    source: "fixture",
    why: "The seeded pathway's id and version, with its two-step sign-off state rendered from the seeded approvals.",
  },
  "/console/privacy": {
    proof: /Synthetic data only in this phase/,
    source: "copy",
    why: "The privacy screen's standing declaration of the founder gate this whole build runs under.",
  },
  "/console/referrals": {
    proof: /ref-received[\s\S]*ref-sent-open/,
    source: "fixture",
    why: "Two seeded referral ids from the two directions the page separates (sent to this practice, sent by it), each with its state rendered.",
  },
  "/console/registers": {
    proof: /ON THIS REGISTER\s*42/,
    source: "fixture",
    why: "The seeded register's patient count — a number that reaches the screen only through the register store the fixture populated.",
  },
  "/console/reporting": {
    proof: /This figure describes fewer than 5 people/,
    source: "fixture",
    why: "The small-cell suppression verdict computed from the seeded referral counts — the page did the privacy arithmetic on real seeded rows and withheld accordingly.",
  },
  "/console/responses": {
    proof: /invitation_offered\s*2952/,
    source: "fixture",
    why: "The response-rate row for the simulated period: the message kind with its sent count, computed from the deterministic sim's record.",
  },
  "/console/results": {
    proof: /Is anything going wrong\?[\s\S]*(Nothing needs your attention|Some checks need your attention)/,
    source: "fixture",
    why: "The guardrails section with one of its two computed verdicts — either sentence proves evaluateGuardrails ran over the practice's scoped data (AR31 asserts WHICH one under a filed complaint).",
  },
  "/console/roi": {
    proof: /Return on cost\s*4\.8×/,
    source: "fixture",
    why: "The computed ROI multiple from the practice's simulated numbers — it exists only downstream of the whole estimate pipeline.",
  },
  "/console/rules": {
    proof: /Minimum days since/,
    source: "copy",
    why: "The eligibility form's first field label — the versioned rules form rendering with its controls is this route's work.",
  },
  "/console/signin": {
    proof: /Synthetic build: any staff email signs in/,
    source: "copy",
    why: "The sign-in screen's honest statement of the synthetic-phase auth model, beside the form it describes.",
  },
  "/console/usefulness": {
    proof: /Patient 4821/,
    source: "fixture",
    why: "The first attended appointment's synthetic patient number in the audit list — the tap-per-visit form renders once per seeded appointment.",
  },
  "/console/verticals": {
    proof: /Example care model/,
    source: "fixture",
    why: "The seeded vertical by name, with its parts-ready gate state computed from the seeded pathway/interval/material members.",
  },
  "/console/setup/[step]": {
    proof: /Who works here, and who wants availability invitations sent for them/,
    source: "copy",
    why: "The clinicians step's own question, rendered inside the wizard frame — the sampled step proving the dynamic route serves its content.",
  },
};
