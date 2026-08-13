# Meherr Compliance Dossier (W50, v1 — living document)

Every user-facing surface mapped to the four regimes that govern it, with the code that enforces
the posture. Update this document in the same commit as any change to a mapped surface — a
surface without a row here does not ship. Regulatory basis: the venture research
(Stefan-Brain `wiki/entrepreneurship/startups/extended-scope-gp-network-research.md` §5).

## The four regimes

1. **Spam Act 2003** — commercial electronic messages: identification, consent, functional
   unsubscribe.
2. **Privacy Act 1988 / APPs** — health information is sensitive (no small-business exemption);
   APP 3 collection, APP 5 notice, APP 6 use limits, APP 7 direct-marketing limits, APP 11
   security/retention; automated-decision-making transparency in the privacy policy (in force
   10 Dec 2026).
3. **Ahpra advertising guidelines / s 133 National Law** — no clinical claims, no urgency, no
   testimonials/ratings, no title inflation ("specialist"/"surgeon" never near a niche scope),
   accuracy of every credential statement. Platform is itself liable ("a person who advertises").
4. **MBS integrity (PSR posture)** — Meherr generates attendance *opportunities*, never
   billings; only clinically relevant services are billed, by the GP; incrementality + usefulness
   audit is the standing anti-low-value-care evidence.

## Surface map

| Surface | Code | Regimes | Enforced by |
|---|---|---|---|
| Availability SMS | `src/messaging/templates.ts` | 1, 2, 3 | compliance linter (hard send gate: banned clinical/urgency/benefit phrases; required practice ID, STOP, booking link); terminal STOP in `src/messaging/adapter.ts`; contact-frequency caps in eligibility engine |
| Booking page (`app/book`) | `src/booking/*` | 2, 3 | tokenised links (no identity in URL); no clinical content rendered; offer-expiry honesty (no scarcity theatre) |
| Practice console (`app/console`) | `src/console/*`, `src/tenancy/*` | 2 | role-based access, practice isolation (W18 RLS + tests); config changes audit-logged to the event spine |
| Weekly/pilot reports | `src/report/*`, `src/pilot/report.ts` | 4 | naive counts labelled contrast-only (`docs/ATTRIBUTION.md` "never counts"); revenue figures labelled estimation-only (`src/mbs/items.ts` header) |
| Privacy page (`app/privacy`) | W33, W138 (`src/compliance/party-to-care.ts`) | 2, 3 | retention config + delete/export flows; ADM transparency statement (Dec 2026 requirement) shipped ahead of force date; **W138: carries the canonical responsibility statement**, rendered from the single constant rather than paraphrased, so the claim cannot drift across surfaces (W23 `LANDING_COPY` pattern) |
| Community landing (`app/page.tsx`) | founder commits 3317340, cfa2f1d | 2, 3 | Plain-language PMOS awareness copy and the interest form share this route. The form collects name, email and audience only; the privacy link and synthetic-demo separation remain visible. It does not diagnose, rank clinicians or make a treatment claim. The community interest register row below governs storage and retention limits |
| B2B landing (`app/practices`) | W23 (`src/compliance/landing.ts`) | 3 | Copy lives in the lint-gated `LANDING_COPY` bundle and moved here intact when the finder took `/`; the W23 linter and the a11y sweep both follow it to this URL. This row replaces the stale `app/page.tsx` row — W23's B2B-only guarantee describes `/practices`, and no longer describes `/` |
| Clinician walkthrough (`app/clinicians`) | founder commits 603219f, e083d7a | 2, 3, **G5** | **MAPPED AS PROTOTYPE — G5 question open and escalated.** Clinician-facing, not patient-facing, and carries disclaimers ("demo pathway only — does not determine scope or credentialing"; synthetic case summaries). Every clinical claim links to a primary source and nothing computes a recommendation, which is the lower-risk side of the CDSS line. But the CONTENT is real clinical guidance, which is what G5 governs, and W56's guideline intervals are blocked for exactly that reason — the two cannot both be right, and the founder has been asked to rule on them together. Joined the W49 a11y sweep at W65. Renders condition-specific clinical content ("New PCOS assessment", "Metformin review", "COCP suitability") — the first surface in the tree carrying named conditions and drug classes, which is the territory G5 gates |
| Complaint/opt-out workflow | W43 (`src/ops`) | 1, 2, 3 | intake → triage → practice notification; Sev-1 pause-first rule (`docs/SUPPORT-RUNBOOK.md`); event-spine replay resolves "STOP not honoured" claims with evidence |
| Sales assets (deck/one-pager) | W46 | 3 | factual credential/figure claims traceable to the research page; no "specialist-equivalent" language anywhere |
| Patient contact preferences (`app/book/[token]`) | W74 (`src/messaging/preferences.ts`) | 1, 2, 3 | patient sets their own contact hours and whether to be texted at all; unauthenticated action writes only against the invitation its signed token names, rate-limited like confirmBooking; a channel is never substituted and a send is never delivered outside the stated hours (deferred, or dropped if the offer expires first); conservative default (weekday business hours), never "any time"; copy asserted clinical-claim-free in e2e |
| Clinician finder demo (`app/finder`) | founder commit 3317340 | 2, 3, **G6, G7** | Same component as the root care-finder, served under an explicitly demo-labelled route and title. Everything in the care-finder row applies unchanged, including the open G6/G7 questions and the seven P1 defects in `qa/audit-matching-trust/audit.md`. The route's own title and description say "demo" and "synthetic", which is the control that currently distinguishes it |
| Community interest register (`app/console/interest`) | founder commit 3317340 (`src/interest/*`), W105 (`src/tenancy/staff.ts`) | 1, 2 | Collects expressions of interest from a named community. **W105: reads are Meherr-staff-only and the grant list ships empty.** The signup list is not fetched at all for a non-staff visitor — conditional rendering would satisfy the eye and not the wire, since in a server component the data would still reach the RSC payload, so the gate sits above the read. The header link is hidden too, but that is navigation, not access control; the route gates itself. Deliberately NOT a fourth practice role: routing it through `authorize()` would let an owner with `manage_members` grant it to themselves — W97's lesson run backwards. **Needs before any real use:** this is the first surface that would hold contact details of people who are NOT existing patients of a subscribing practice, so the W33 retention/erasure flows and the APP 5 collection-notice question apply to it and have not yet been assessed — synthetic-only today (G2), which is why it is mapped rather than blocked |
| Demo presenter page (`app/demo`) | W29 | 3 | Presenter-facing walkthrough of the synthetic world; resets every store on launch. Copy is not covered by any linter (see the W51 audit's coverage finding), so it is mapped here as an accepted gap rather than an enforced control |
| Condition-targeted invitations | W66 (`src/messaging/condition-lint.ts`) | 1, 2, 3 | The register selects WHO is messaged and never WHAT they are told: a patient invited off a register and one invited off spare capacity receive byte-identical text (asserted). Leak check is relational — the condition that targeted the message cannot appear by code, display name or any significant word of either — so practice-authored registers are covered without editing the linter. Targeting *tells* ("we noticed", "based on your", recall framing) are banned too, because naming the condition is not the only way to disclose it. W6's rules are applied rather than re-implemented, so this path can never be held to a weaker standard |
| Template approval | W67 (`src/messaging/approval.ts`) | 1, 3 | The practice is the legal sender, so no text reaches a patient without that practice approving that exact wording. Approval is keyed by content hash, so any edit — including whitespace — silently revokes it; `assertSendable` throws rather than returning a boolean, so a caller who forgets to check still cannot send; approval is per practice and withdrawal is immediate |
| Clinical-safety rails | W68 (`src/registers/safety-rails.ts`) | 2, **G5**, G7 | Mechanism only — the rule set ships EMPTY and a test pins it, because deciding what counts as a red flag is clinical authorship (same gate as W56's intervals). Exclusion routes rather than drops: withheld patients are surfaced with the flag and rationale, since a patient silently never contacted is the failure a rail exists to prevent. Rails run ahead of ranking, so protection cannot depend on batch position. Flags are read, never derived (G7) |
| G5 authoring workspace | W69 (`src/registers/authoring.ts`) | **G5** | The gate itself, in code. Unapproved content is unusable — enforced by the type system, not a runtime check: `ApprovedContent` is branded so only `usableContent()` can produce one. Three stages, because a specialist ("is this correct?") and the founder ("do we accept shipping it?") answer different questions. Reviewed-but-unsigned content is still unusable; the author cannot review their own work; any amendment clears both attestations. Ships with zero content signed off |
| Register console (`app/console/registers`) | W60 (`src/registers/*`) | 2, 3 | enable/disable is keyed by practice id, so one practice cannot change what another sees (isolation unit-tested); scheduling-only copy asserted in e2e ("needs", "at risk", "requires", "should be seen" all banned); register membership is non-inferential by construction — the W55 CHECK constraint and union type admit no symptom-derived source (G7) |

| Capability console (`app/console/capability`) | W83 (`src/capability/graph.ts`) | 2, 3 | Two deliberately different views of one graph: a clinician sees their own record in full (a capability record you cannot inspect is one you cannot correct — APP 13 in spirit), the practice sees presence-and-freshness only, never raw visit counts, so a capability graph cannot become a productivity board. Copy states what the practice KNOWS, never what a clinician is good at; "verified by an external body" is provenance, "expert in" would be a s 133 claim. Holds personal information about CLINICIANS, including the derived case mix of W80 — the first records in the tree generated *about* a person rather than collected from them |
| Referral console (`app/console/referrals`) | W137 (`src/referrals/store.ts`) | 2, 3 | Both sides of a GP-to-GP referral, fed by two SEPARATE reads because the sender and receiver have different jobs — the sender chases an outcome, the receiver holds the one decision that moves a referral, so the controls live only on the receiving side. Cross-practice isolation is by construction (the practice id is the query, not a later filter) and a third practice's referral appears on neither list, asserted in the browser and unit-tested for the two-practice case. **Shows NO credential or capability detail about anyone**: the founder's A-or-B ruling on credential visibility across a practice boundary is outstanding (docs/GATE-DOSSIER-Q9.md action 1), so this is built to the safe intersection like W131's document — adding it before the ruling would make the ruling by default. Copy states that an unanswered referral means the sending practice is still watching (W134). Holds patient-linked records on both sides and is declared `stored` in W106's registry, with erasure composed into `deletePatientEverywhere` |
| Content sign-off dashboard (`app/console/pathways`) | W127 (`src/pathways/registry.ts`) | 2, 3 | Shows WHO reviewed and signed off each care pathway and when — governance, never the content. Criteria are summarised as COUNTS and never listed: a pathway's inclusion and exclusion rules are clinical content, and rendering unsigned clinical material in a console with the product's name on it is what the G5 gate exists to prevent. **The zero state is written, not empty**: nothing is signed off because signing clinical content off is a founder act that has not happened, and a blank table would read as a loading failure or an unused feature — readings that lead a practice to opposite next actions. Each refusal renders W119's specific sentence, so "reviewed and waiting on founder sign-off" is visibly a different state from "nobody has looked". Holds no patient data and is not practice-scoped: a pathway is a document, not practice data. Session-gated and membership-checked |
| Reporting summary (`app/console/reporting`) | W199 (`src/reporting/report.ts`) | 2, 3 | What this product would say about a practice, shown to that practice and to nobody else. **Proposed gate G9 is unratified, so there is no recipient, no delivery and no send control**, and the page says so rather than leaving the absence to read as a feature nobody built — an adapter that exists is one configuration change from disclosing (G1/G3's shape). Every figure carries the denominator W196 built in, because a count without one is an impression, and the period is repeated on each figure since a figure quoted out of the document loses the heading first. Figures below W196's declared floor are **withheld and named** rather than rounded, blanked or banded (W197): a blank cell and a suppressed cell mean opposite things and a reader assumes the one needing no explanation. The coverage section carries TWO lists, because "nothing recorded", "withheld" and "zero" are three different silences leading to three different next questions, and W196 refuses to emit a figure over zero records at all. Holds no patient identity — a `Figure` is a kind, a count and a basis, with no field an identifier could occupy |
| Vertical console (`app/console/verticals`) | W164 (`src/verticals/store.ts`) | 2, 3 | Which verticals exist and what each still needs. **The page has TWO zero states and they mean opposite things**: nothing assembled yet (work, and work the loop can do) versus assembled with nothing signed off (no amount of building helps — it is waiting on a specialist, a founder signature and the G5 values ruling). A blank grid reads as neither, and the two lead a practice to opposite next actions, so the page names which it is and an e2e asserts they are never shown together. Renders nothing it decides: W157 answers usable, W158 answers what is outstanding and who has to act, W159 answers which members disagree. **No pathway criteria appear anywhere** — W127's rule, asserted by seeding fact codes and checking the rendered body for their absence. W159's review-severity findings are shown and never resolved; a blocking one refused before the page saw it. Holds no patient identity (W106) and is not practice-scoped: a vertical is a document, while WHICH version a practice accepted is W160's binding |
| Education console (`app/console/education`) | W151 (`src/education/store.ts`) | 2, 3 | The library and the clinician's own reading record. Two of W144's boundary positions are decided HERE rather than in a pure module, because they are about what a reader sees next to what. **Order, never withhold** (step 4): every in-scope item is listed with its rank shown AS a rank, there is no collapsed view, no "top pick" and no "show more" — a default view of one item is a product that shows one item — and material for a register the practice does not run is NAMED as out of scope rather than silently absent, because silence leaves a practice unable to notice it should run the register. **The evaluation and the material are not rendered together** (step 6): W120's verdict is honest where it lives, but beside material about the same pathway it becomes advice by adjacency, so no verdict is rendered here at all and the copy says why. The reading record is scoped at the STORE (`cpdEntriesFor` takes the clinician id as its query) and there is no practice view of who has read what — the refusal is stated on the page a practice would go to looking for that report. Every fixed sentence lives in `src/education/console-copy.ts` so W150's linter reaches it; copy written into the page's JSX would be copy no linter sees. Holds no patient identity (W106) |
| Credential console (`app/console/credentials`) | W113 (`src/credentials/ledger.ts`) | 2, 3 | A clinician sees their own credentialing record and can correct it, where "correct" means WITHDRAW: every action on this page can only reduce what the system claims about the person — there is no control that adds a claim, and W110 refuses self-verification outright, so the page cannot be used to manufacture a qualification. The read is scoped by SUBJECT (`ownCredentials` takes the clinician id as its query, not as a filter over a practice-wide fetch), which is the answer W109 required instead of granting evidence access to the `clinician` role. Shows lapsed entries even though W112 treats them as absent everywhere else — the person a record is about must be able to see that it lapsed. Evidence DOCUMENTS are not served here at all: W109's grant is unobtainable by a clinician and subject access to the scans themselves waits on the founder's G6 position (W117). Copy states what the practice HOLDS, never what the clinician is good at; an e2e asserts the rendered page contains no "specialist", "expert" or rating language. Holds personal information about CLINICIANS |
| Case-mix console (`app/console/case-mix`) | W80 (`src/capability/case-mix.ts`) | 2, 3 | Derived from attended visits only, and derived is labelled as derived. The no-inference guarantee is an absence: no function exists that turns a clinician attribute into a competence claim, and a test asserts the export list. Practice-scoped and session-gated |
| Outreach console (`app/console/outreach`) | W95 (`src/referrals/outreach.ts`) | 1, 2, 3 | The nudge IS the ordinary availability invitation, byte for byte — `planOutreach` calls W6's `renderCompliant`, and a test asserts byte-identity with `renderAvailabilityInvitation`, so a leakage nudge can never be held to a weaker standard than any other message. The referral is why the practice is looking and never what the patient is told: the specialty cannot reach the message because the planner is handed `LeakageSummary`, which does not carry one. Recipients are named (sending needs a recipient) in referral-record order, with the page stating the order carries no priority — naming is unavoidable, ranking by need is the G7 line. Synthetic referral data only; no send path is wired |
| Community interest export (`app/api/interest/export`) | W105 (`src/tenancy/staff.ts`) | 2 | **GAP CLOSED at W105.** Previously behind `verifySession` alone, so any console user at any practice could download every signup's name and email. Now gated on `isMeherrStaff`, which **ships empty** (W68/W69 posture) — so today nobody can read it, which is strictly safer than everybody. Gated at the ROUTE as well as the page, because a route handler is independently invocable (W13): a page-level check protects the link and nothing else, and this is the endpoint that streams the whole register in one request. 403 rather than 404, since the register's existence is already public — what is withheld is the contents |
| Mock introspection routes (`app/api/mock/*`) | W44 (`src/lib/mock-guard.ts`) | 2 | Eight routes that reset and read shared state, and disclose signed booking tokens. `assertMockRoutesEnabled()` 404s them outside a non-production build unless `CAREYIELD_ENABLE_MOCK_ROUTES=1` is set explicitly; a real deployment sets neither. Synthetic-phase only, removed when real persistence lands |

## Surface census (machine-checked)

Every route the application serves, and the row above that governs it. **This block is a test,
not a list** — `src/compliance/surfaces.test.ts` walks `app/` and fails on any difference in
either direction: a route with no line here is unmapped, and a line here with no route is a
stale row describing something that has moved or gone. The document has twice claimed "zero
unmapped surfaces" and been wrong within a day; that claim is now checked rather than made.

```surface-census
/ — Community landing
/api/interest/export — Community interest export
/api/mock/capability — Mock introspection routes
/api/mock/case-mix — Mock introspection routes
/api/mock/credentials — Mock introspection routes
/api/mock/education — Mock introspection routes
/api/mock/verticals — Mock introspection routes
/api/mock/pathways — Mock introspection routes
/api/mock/referrals — Mock introspection routes
/api/mock/console — Mock introspection routes
/api/mock/ops — Mock introspection routes
/api/mock/preferences — Mock introspection routes
/api/mock/registers — Mock introspection routes
/api/mock/state — Mock introspection routes
/api/mock/usefulness — Mock introspection routes
/book/[token] — Booking page; Patient contact preferences
/clinicians — Clinician walkthrough
/console — Practice console
/console/capability — Capability console
/console/case-mix — Case-mix console
/console/credentials — Credential console
/console/education — Education console
/console/verticals — Vertical console
/console/pathways — Content sign-off dashboard
/console/referrals — Referral console
/console/complaints — Complaint/opt-out workflow
/console/dashboard — Practice console
/console/interest — Community interest register
/console/onboarding — Practice console
/console/ops — Complaint/opt-out workflow
/console/outreach — Outreach console
/console/outcomes — Weekly/pilot reports
/console/reporting — Reporting summary
/console/privacy — Privacy page
/console/registers — Register console
/console/results — Weekly/pilot reports
/console/roi — Weekly/pilot reports
/console/rules — Practice console
/console/setup/[step] — Practice console
/console/signin — Practice console
/console/usefulness — Weekly/pilot reports
/demo — Demo presenter page
/finder — Clinician finder demo
/practices — B2B landing
/privacy — Privacy page
/privacy/automated-decisions — Privacy page
```

## Standing prohibitions (structural, not policy)

- No patient-facing clinical language: linter blocks "overdue", urgency, deterioration,
  diagnosis, test-result bait, benefit claims, check-up prompting. Tests seed each violation.
- No testimonials or star-ratings on any surface Meherr controls.
- No identifiable clinical data in model training (W33 posture; also contractual in the pilot
  agreement skeleton §6).
- No symptom-based patient triage — matching keys on clinician attributes only (TGA boundary,
  founder gate G7).
- No per-referral money in any direction (`docs/PRICING.md`).
- **Meherr is never a party to clinical care, on any surface (W138).** Enforced by
  `lintPartyToCare`, swept over the rendered text of every page route in `e2e/party-to-care.spec.ts`
  — the route list derived from the census above, so a new page is covered the day it lands. The
  rule looks for *Meherr as the subject of a care verb*, not for clinical words: "your GP will
  review the results" passes and "we will review your results" does not, because a linter that
  taxes correct sentences gets switched off and then protects nothing.

## Review cadence

Quarterly, or immediately on: any new user-facing surface; any change to message templates or
linter rules; TGA CDSS guidance updates (carve-outs expected to narrow); commencement of the
remaining Privacy Act tranche-2 reforms. Each review appends a dated line here.

- 2026-08-10 — **W102: Y2 review. Zero unmapped surfaces, and this time it is a test.** 34 routes
  served, 34 census lines, checked by `src/compliance/surfaces.test.ts` in both directions. The
  document had claimed completeness twice and been wrong within a day both times, corrected each
  time by whoever happened to look; that is the control failing, not working. Five surfaces were
  in fact unmapped when this review started — `/console/capability`, `/console/case-mix`,
  `/console/outreach`, `/api/interest/export` and the eight `/api/mock/*` routes — and they now
  carry rows. Stale lines fail the same test, which is the failure nobody catches: a row
  describing controls over something that has moved reads as coverage.
- 2026-08-10 — **W102 finding 1 (fixed here): the published ADM statement had become untrue.**
  `/privacy/automated-decisions` said *"No inference from clinical notes, test results, or
  diagnoses — we do not process them."* W57 reads recorded condition flags and W92–W95 read
  referral records, so Meherr processes recorded diagnoses and referrals. The no-inference
  boundary held — nothing is derived from symptoms — but "we do not process them" is a claim
  about processing, and a privacy statement that is wrong about what data you handle is the
  document a regulator reads first. Rewritten, with a "what information is used" section that
  names the health information actually read.
- 2026-08-10 — **W102 finding 2 (fixed here): five Year-2 automated decisions were undisclosed.**
  The statement described eligibility, ordering and send mechanics — the Year-1 system. It said
  nothing about register membership (W55/W57), scheduled-review timing (W58), the continuity cap
  (W85), the decisions *not* to contact (W71/W74/W94/W95), or **in-panel routing (W84), which can
  put a different GP's name on the offer than the patient's usual one** — the automated decision
  in this product most likely to count as significantly affecting someone, and the one most
  conspicuously missing. All now stated, along with the guarantee that no message reveals why a
  patient was selected (W66/W95).
- 2026-08-10 — **W102 finding 3 (NOT fixed — needs a product decision, filed as PRIV-1):
  `/api/interest/export` is authorised by "is anyone signed in".** It streams the whole community
  interest register as CSV — name, email, audience — behind `verifySession` alone. There is no
  practice scoping and no role check, and `src/interest/store.ts` carries no practice id at all,
  so any console user at any practice can download every signup. The register is a Meherr-run
  community program rather than practice data, so the *correct* control is "Meherr staff only" —
  and the product has no such role, meaning the right answer cannot currently be expressed. That
  makes it a product decision (add a staff role, or move the register out of the practice
  console), not something to patch inside a compliance review. Synthetic-only today under G2, so
  the exposure is theoretical; it stops being theoretical the day a real signup is stored, which
  is why it is filed rather than merely noted.
- 2026-08-10 — **W102 finding 4 (NOT fixed — filed as PRIV-2): APP 12 access and APP 11 retention
  do not know about Year-2 record classes.** `exportPatientData` returns invitations,
  appointments, audit events and outcomes; `RetentionConfig` prunes the last three. Neither names
  register membership (W55, `0004_registers.sql`), referral or barrier records (W92–W95), or
  clinician capability records (W79, `0005_capability.sql`) — and the capability records include
  the *derived* case mix of W80, information generated about a person rather than collected from
  them, which is precisely the kind an access request exists to surface. Today an access request
  would return an incomplete answer and a retention run would leave those rows untouched.
  Currently harmless only because those stores are in-memory and synthetic: the migrations exist,
  so the gap opens the moment ingest writes to them. **The trigger condition is the first store
  that persists any of these classes; export, delete and retention must grow in the same unit.**
- 2026-08-10 — **W102 note: the plan says ADM transparency is "now in force". It is not.** APP 1.7
  commences 10 December 2026 — four months out. Nothing here depends on the difference (the
  statement has been published since W33 and is now accurate), but a compliance document that
  overstates a commencement date teaches its readers to discount it, and the same four months are
  the window in which findings 3 and 4 should be closed rather than carried.

- 2026-08-10 — **W102 finding 5 (fixed here): the accessibility sweep had already drifted.**
  `e2e/a11y.spec.ts` enumerates its console surfaces by hand, and `/console/outreach` was missing
  — one day after W101 declared zero violations "across every surface". Added, and it passes.
  Worth recording as a pattern rather than a one-off: this is the third enumerated-coverage list
  in the tree to fall behind the routes it covers, after the surface map itself (twice). The
  census block above is now derived-and-checked; the axe list still is not, and will drift again.
  A future unit should have it read `discoverSurfaces()` — not done here, because changing how
  another unit's gate decides what to test is that unit's call, not a compliance review's.

- 2026-08-10 — **W105 closes PRIV-1 (W102 finding 3).** The community interest register and its
  CSV export are now gated on a Meherr-staff grant list that ships empty, four months ahead of
  the APP 1.7 deadline that made it urgent. The design point worth keeping: this is **not** a
  fourth `Role`. Adding one would route the check through `authorize()`, and a practice owner
  holding `manage_members` could then grant themselves access to the contact details of people
  who are not their patients — W97's group-role lesson run backwards. A separate list no
  practice can write is a structural guarantee where a role would have been a convention.
  **Coverage note:** `/console/interest` is no longer reachable as a practice-console surface,
  so its axe pass now exercises the refusal panel rather than the register. The register's own
  accessibility needs a pass at the moment the founder grants the first staff account.
  **Still open:** PRIV-2 (APP 12/APP 11 coverage of Y2 record classes, scheduled W106) and
  PRIV-3 (console single-practice identity, W103 finding B2).

- 2026-08-10 — **W138: the responsibility posture is now checkable.** W89 drew this line for
  specialists and W134 drew it between practices; neither covered whether the PRODUCT reads as a
  participant in care, which fails by wording rather than by architecture. Three reasons it is
  worth a linter rather than a style note: a patient who believes Meherr is involved will wait on
  us for something we will never do (and not chase their practice, which is the harm); holding
  ourselves out as providing or directing care makes us a different regulated thing, one sentence
  at a time; and it misdescribes who is accountable, since the practice is the treating entity and
  the sender of every message. The statement is written once and rendered, never paraphrased. The
  sweep found **zero violations across every existing surface** — so this is a ratchet on current
  behaviour, not a fix. Proven non-vacuous by injecting "Our doctors will review your results"
  into a live page and watching the sweep catch it.

- 2026-08-09 — v1 established (W50). All eight surfaces mapped; zero unmapped surfaces in `app/`.
- 2026-08-10 — **Four surfaces landed outside the loop** in founder commit 603219f (voice
  care-finder now served at `/`, clinician walkthrough, practices page). They arrived without
  dossier rows, so this document's prior claim of "zero unmapped surfaces in `app/`" was untrue
  until this entry; the rows above now describe what is actually deployed, and the W23 landing-page
  row is marked stale rather than silently left wrong. **No Meherr control has been applied to
  any of them** — no copy lint, no G6/G7 assessment, no G5 review of the condition/drug content.
  Awaiting the founder's ruling on whether these are design prototypes (in which case: mark
  prototype-only, keep them off any patient-reachable deployment, and the exposures below stay
  theoretical) or a shipping direction (in which case each needs its controls before traffic).
  Recorded by the round-13 check-in; the gate is green (452 tests) — this is a governance gap,
  not a broken build.
- 2026-08-09 — W60 adds the register console (nine surfaces). Its catalogue ships **placeholders
  only**: the real guideline intervals are W56, blocked pending a founder ruling on whether
  transcribed national guidance is G5 clinical content. A test asserts the shipped catalogue
  names no real condition or guideline, so clinical values cannot reach a practice-facing surface
  ahead of that ruling.
- 2026-08-10 — **W77: zero unmapped surfaces restored.** The four Q6 controls (W66 condition-leak
  linter, W67 template approval, W68 safety rails, W69 G5 workspace) are mapped above. The three
  surfaces that landed outside the loop are no longer "UNMAPPED": each now carries an honest row
  saying which controls apply today and which are missing, rather than a placeholder implying the
  question is unanswered. That is the distinction this document has to keep — a surface with no
  controls, described accurately, is mapped; a surface nobody has assessed is not. The stale
  `app/page.tsx` row is replaced by an `app/practices` row, which is where the lint-gated B2B copy
  actually lives now. **Still open and still the founder's:** the G5 ruling covering both W56's
  guideline intervals and the `/clinicians` clinical content, the G6/G7 position on the
  care-finder, and the seven P1 honesty defects in `qa/audit-matching-trust/audit.md`.
  Two further routes arrived in founder commit 3317340 (`app/finder`, `app/console/interest`) and
  are mapped above. The interest register is worth the founder's attention specifically: it is the
  first surface that would hold contact details for people who are **not** patients of a
  subscribing practice, which changes the privacy analysis (collection notice, retention, erasure)
  rather than merely extending it. Synthetic-only today, so the exposure is theoretical.
- 2026-08-10 — **Recurring false positive worth the compliance owner's attention, not a
  unilateral fix.** The W23 `no-ratings` rule (`/\breviews?\b/`) has now blocked correct copy
  three times: "medication review" (W45), the analytics withheld-explainer (W65), and "reviews
  due by the practice's schedule" (W100). In a healthcare product "review" overwhelmingly means
  a *clinical* review, not a customer rating. Each time the copy was reworded and the linter
  left alone, which is the right power balance and the W45 precedent — but three hits is
  evidence the rule is miscalibrated rather than that the copy keeps being wrong. A tighter
  pattern (e.g. requiring a rating context: customer/patient/online/Google reviews, star
  ratings, `n/5`) would keep the protection and stop taxing correct sentences. **Not changed
  here**: loosening a compliance rule is a decision for whoever owns the compliance posture,
  and doing it inside an unrelated unit is exactly how such rules erode.
