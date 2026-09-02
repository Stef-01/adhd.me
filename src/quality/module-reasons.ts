// U15 (R0): the module-reasons register — every module the product does not import, and why it is
// still here.
//
// THE LAW IT MAKES EXECUTABLE (`docs/SIMPLICITY-LAWS.md` §2): a module is reached by the product,
// by the law, or by a named gate — or it is deleted. `size-census-read.ts` already computes the
// product's import closure from `app/`; everything in `src/` outside it lands here, tagged, or the
// test fails. Both directions: a module that leaves the closure and is not tagged fails, and a tag
// naming a module that is now reached (or gone) fails too. That is the whole point — a register
// that only fails one way silently rots into a list of things that used to be true.
//
// THE TAGS:
//   `law`            The module exists to be read by a gate, a test, a script or a document
//                    generator in this tree. Unreached by the product BY DESIGN: this is the
//                    machinery that judges the product, and a law the product imported would be
//                    a law the product could bend.
//   `gated:<ref>`    Real product that cannot be reached yet. The reference is either a FOUNDER
//                    GATE (`G1`–`G10`, `docs/FIVE-YEAR-PLAN.md` §4) or the PLAN UNIT whose
//                    surface will reach it (`W48`, `W97`, `W157`, `W214`). Both are named gates
//                    in the law's sense — somebody decided, on the record, that this may not run
//                    yet — and a tag that names neither is not a reason, it is a shrug.
//   `delete`         Nothing reads it, no gate holds it, no plan unit needs it. A finding for
//                    U30, which is where deletions happen; U15 names, it does not remove.
//
// EVERY `why` IS THE MODULE'S OWN FIRST LINE, not a sentence written about it here. A register
// whose reasons were composed at register-writing time describes what somebody assumed on the day;
// quoting the module means the reason changes when the module does, and a module whose header says
// nothing has to earn one.
//
// THE PLAN SAID 127 AND THE TREE SAYS 130. `docs/ONE-YEAR-BUILD-PLAN.md` U15 quotes 127 unreached
// modules, measured the day the plan was laid; U1–U14 and O230 each added law modules the product
// does not import, and U14's census pins the figure at 130. The register covers the MEASURED set,
// as U14's did for §1 — the plan's number is what the tree said that day, not a target to bend the
// tree towards.

export type ModuleTag = "law" | "delete" | `gated:${string}`;

export interface ModuleReason {
  /** Repo-relative path, exactly as the census spells it. */
  readonly module: string;
  readonly tag: ModuleTag;
  /** The module's own account of itself — its first header line. */
  readonly why: string;
}

/** Sorted by path, so a diff shows what moved rather than where it was inserted. */
export const MODULE_REASONS: readonly ModuleReason[] = [
  { module: "src/analysis/dna.ts", tag: "gated:G4", why: "W44: DNA analysis — do ADHD.ME-generated bookings no-show more than organic ones?" },
  { module: "src/booking/deeplink.ts", tag: "gated:G1", why: "W29: booking deep-link providers. A practice books through whichever rail it" },
  { module: "src/capability/continuity-guard.ts", tag: "gated:G4", why: "W85: the continuity guardrail — routing may not degrade continuity below a practice floor." },
  { module: "src/capability/experience.ts", tag: "gated:G4", why: "W80: case-mix telemetry — derive a clinician's EXPERIENCE from what they actually did." },
  { module: "src/capability/explain.ts", tag: "gated:G4", why: "W86: routing explainability — every decision renders its reason to the practice." },
  { module: "src/capability/routing.ts", tag: "gated:G4", why: "W84: in-panel routing — the right GP for this condition, INSIDE the practice." },
  { module: "src/capability/threshold.ts", tag: "gated:G4", why: "W82: the competence floor — enthusiasm never outranks it." },
  { module: "src/capacity/attribution.ts", tag: "gated:G4", why: "W233: did opening the slots help?" },
  { module: "src/capacity/copy.ts", tag: "gated:G4", why: "W226: the composed half of this lane's copy — the half no linter has ever seen." },
  { module: "src/capacity/coupling.ts", tag: "gated:G4", why: "W231: the forecast → invitation-volume coupling, shipped OFF." },
  { module: "src/collateral/content.ts", tag: "gated:G4", why: "W46: the sales deck and one-pager content, as data. Two reasons it is not written" },
  { module: "src/collateral/deck.ts", tag: "gated:G4", why: "W46: sales deck generator. Content comes from ./content with every figure" },
  { module: "src/collateral/figures.ts", tag: "gated:G4", why: "W46: the figures register. Every number that appears in the sales deck or the" },
  { module: "src/collateral/one-pager.ts", tag: "gated:G4", why: "W46: one-pager generator (docx), same content source and same figure register as" },
  { module: "src/collateral/render.ts", tag: "gated:G4", why: "W46: placeholder resolution shared by both generators, so the deck and the" },
  { module: "src/compliance/cdss-boundary.ts", tag: "law", why: "W200: the G7 boundary, re-derived rather than assumed to have survived Y4." },
  { module: "src/compliance/console-honesty.ts", tag: "law", why: "AR30: the console honesty register — accepted marketing-rule findings on signed-in surfaces." },
  { module: "src/compliance/surfaces.ts", tag: "law", why: "W102: the surface census, made mechanical." },
  { module: "src/credentials/ahpra.ts", tag: "gated:G6", why: "W111: Ahpra register lookup — read-only, recorded, never inferred." },
  { module: "src/credentials/model.ts", tag: "gated:G6", why: "W108: the credential record model." },
  { module: "src/credentials/provenance-report.ts", tag: "gated:G6", why: "W115: the credential provenance report — what the practice actually checked, and what it" },
  { module: "src/credentials/scope.ts", tag: "gated:G6", why: "W114: scope statements — what a credential permits, as data." },
  { module: "src/demo/pending-clinicians.ts", tag: "law", why: "W228 (O26/O34): the staging area for a clinician who is asked-for but not yet declarable." },
  { module: "src/demo/real-person-fields.ts", tag: "law", why: "W193 (O162): the BASIS of every field this tree holds about a real, named clinician." },
  { module: "src/demo/synthetic-clinician.ts", tag: "law", why: "W193 (O179): a synthetic clinician template, so a ranking LAW is never pinned to a real person." },
  { module: "src/design/accepted-diffs.ts", tag: "law", why: "AR16: the accepted-diff register — a visual change lands only with the unit id that intended it." },
  { module: "src/design/dark-grounds.ts", tag: "law", why: "AR18: theme parity, dark — \"as AR17, plus contrast measured in both themes.\"" },
  { module: "src/design/dead-css.ts", tag: "law", why: "O200: the stylesheet may not style markup that does not exist." },
  { module: "src/design/focus-ring.ts", tag: "law", why: "AR23: the visible ring's static law — outline suppression without a replacement is a build" },
  { module: "src/design/fold-bands.ts", tag: "law", why: "AR19: the visual fold register — the check `layout.fold-governed` actually needs." },
  { module: "src/design/founder-gates.ts", tag: "law", why: "AR36: the founder gate register — the aesthetic and working-truth questions that are PRODUCT" },
  { module: "src/design/hover-gate.ts", tag: "law", why: "O199: the hover half of `interaction.hover-focus`, made executable." },
  { module: "src/design/mutation-report.ts", tag: "law", why: "AR13: the mutation report — which sweeps have a live probe, and which enforced rules do not" },
  { module: "src/design/reduced-motion.ts", tag: "law", why: "AR20: reduced-motion equality — the census half." },
  { module: "src/design/route-array-triage.ts", tag: "law", why: "AR5: the 49 remaining hardcoded route arrays, triaged." },
  { module: "src/design/taste-coverage-doc.ts", tag: "law", why: "AR4: the coverage document generates itself, never by hand." },
  { module: "src/design/taste-register.ts", tag: "law", why: "AR1: the taste law becomes a register." },
  { module: "src/design/theme-parity.ts", tag: "law", why: "AR17: theme parity (light) — the raw-hex ratchet." },
  { module: "src/design/touch-exemptions.ts", tag: "law", why: "AR22: per-element touch-floor exemptions — declared, never inferred." },
  { module: "src/design/type-scale.ts", tag: "law", why: "AR21: type scale and rhythm from the tokens — asserted rather than remembered." },
  { module: "src/design/zero-states.ts", tag: "law", why: "AR24: three kinds of zero — W246's device, generalised as far as one careful reading reaches." },
  { module: "src/directory/copy-lint.ts", tag: "gated:G6", why: "W184: the copy linter over every field a directory profile can emit." },
  { module: "src/directory/correction.ts", tag: "gated:G6", why: "W190: what a clinician can do about a profile that is wrong about them." },
  { module: "src/directory/disclosure.ts", tag: "gated:G6", why: "W193: a public profile is a disclosure, and the subject is a clinician." },
  { module: "src/directory/fees.ts", tag: "gated:G6", why: "W198: what a practice charges, stated plainly." },
  { module: "src/directory/membership.ts", tag: "gated:G6", why: "W188: who is in the network, and on what basis." },
  { module: "src/directory/profile.ts", tag: "gated:G6", why: "W183: what a public directory profile may contain." },
  { module: "src/directory/render.ts", tag: "gated:G6", why: "W187: how a GP with a deep interest is described without being called a specialist." },
  { module: "src/directory/search.ts", tag: "gated:G6", why: "W189: a directory search that does not choose a clinician for anybody." },
  { module: "src/education/advice-lint.ts", tag: "gated:G5", why: "W150: informs the GP, never recommends — and a linter that reaches every education surface." },
  { module: "src/engine/arm-stability.ts", tag: "gated:G4", why: "W175: a patient's arm must survive a vertical version change." },
  { module: "src/engine/continuity.ts", tag: "gated:G4", why: "W24: usual-GP continuity metrics. The brief's clinical argument is that filling" },
  { module: "src/guardrails/condition-monitors.ts", tag: "gated:G5", why: "W70: condition-aware guardrails — per-register opt-out and complaint monitors." },
  { module: "src/integration/errors.ts", tag: "gated:G1", why: "W38: integration error taxonomy. Q3 added several independent failure vocabularies" },
  { module: "src/interop/contract.ts", tag: "gated:G1", why: "W237: the interop conformance contract. Any mapping — appointments now, referrals now, whatever" },
  { module: "src/lib/version.ts", tag: "delete", why: "No header line; see the module." },
  { module: "src/loop/claims.ts", tag: "law", why: "W54: when may a session reclaim someone else's claimed ledger row?" },
  { module: "src/matching/declaration-state.ts", tag: "law", why: "M8: express \"we cannot tell\" (F10)." },
  { module: "src/matching/explain.ts", tag: "gated:W214", why: "W213: the explainability floor for slot matching — built BEFORE the matcher that will need it." },
  { module: "src/matching/extractor-quality.ts", tag: "law", why: "M6: grade the parser and the ranker separately (F8)." },
  { module: "src/matching/known-fps.ts", tag: "law", why: "W231 (O131): the false positives this tree has pinned, as data — and the two-case bar that" },
  { module: "src/matching/match.ts", tag: "gated:W214", why: "W214: deterministic slot assignment, built through W213's floor." },
  { module: "src/matching/refused-cues.ts", tag: "law", why: "W231 (O125): the cues this tree has measured and REFUSED, as data." },
  { module: "src/matching/scale-fixture.ts", tag: "law", why: "W234 (O142): a SYNTHETIC roster, fixture only, so the clarifier's behaviour at scale can be" },
  { module: "src/matching/separation-effect.ts", tag: "law", why: "M5 (F7, Q-M Phase 2): a roster-size-invariant separation metric." },
  { module: "src/mbs/items.ts", tag: "gated:G4", why: "W34: MBS context tables — item metadata for REVENUE ESTIMATION ONLY." },
  { module: "src/messaging/approval.ts", tag: "gated:G3", why: "W67: template approval workflow." },
  { module: "src/messaging/condition-lint.ts", tag: "gated:G3", why: "W66: per-condition templates + the condition-leak linter." },
  { module: "src/messaging/twilio.ts", tag: "gated:G3", why: "W31: Twilio adapter — sandbox only. Founder gate G3 (live SMS) is enforced IN CODE:" },
  { module: "src/ops/smoke.ts", tag: "law", why: "U12 (O229): the smoke — four requests that prove a deployment is serving, as data." },
  { module: "src/outcomes/agreement.ts", tag: "gated:G4", why: "W172: did the specialist agree with what the pathway said?" },
  { module: "src/outcomes/audit-export.ts", tag: "gated:G4", why: "W177: the practice's own audit trail, as a document it can take away." },
  { module: "src/outcomes/escalation-monitor.ts", tag: "gated:G4", why: "W171: unrouted escalations, over time." },
  { module: "src/outcomes/time-to-escalation.ts", tag: "gated:G4", why: "W176: how long it took to notice — reported, and never targeted." },
  { module: "src/pathways/audit.ts", tag: "gated:G5", why: "W126: the pathway audit trail, on W10's spine." },
  { module: "src/pathways/binding.ts", tag: "gated:G5", why: "W123: which clinicians a pathway may be offered under." },
  { module: "src/pathways/consent.ts", tag: "gated:G5", why: "W125: what the patient agreed to — recorded, never inferred." },
  { module: "src/pathways/diff.ts", tag: "gated:G5", why: "W122: what changed between two versions of a pathway, in clinician-readable form." },
  { module: "src/pathways/escalation.ts", tag: "gated:G5", why: "W121: escalation rules as data, shipping empty." },
  { module: "src/pathways/simulation.ts", tag: "gated:G5", why: "W124: running a pathway over a synthetic cohort." },
  { module: "src/pilot/casestudy.ts", tag: "gated:G4", why: "W45: case-study generator — pilot data → a publishable, de-identified case study." },
  { module: "src/pilot/report.ts", tag: "gated:G4", why: "W35: pilot instrumentation — one structured report wiring every venture-brief §Pilot metric" },
  { module: "src/platform/api.ts", tag: "gated:G1", why: "W253: the platform's read surface — a census of endpoints, each of which takes a proven practice." },
  { module: "src/platform/refusals.ts", tag: "gated:G1", why: "W255: what a refused caller is told, and what a refusal is structurally incapable of telling them." },
  { module: "src/platform/scope.ts", tag: "gated:G1", why: "W253: a practice a caller has been PROVEN to hold — the only thing a platform read will accept." },
  { module: "src/platform/scopes.ts", tag: "gated:G1", why: "W254: what kind of read a caller has been granted — a different question from which practice." },
  { module: "src/pms/contract.ts", tag: "gated:G1", why: "W27: the PMS adapter contract. Any adapter — synthetic now, Best Practice/Halo/" },
  { module: "src/pms/drift.ts", tag: "gated:G1", why: "W38: fixture-drift detection. The W28 vendor mappings are written against a" },
  { module: "src/pms/fixtures.ts", tag: "gated:G1", why: "W28: recorded PMS API fixtures — synthetic, hand-authored to mirror each vendor's" },
  { module: "src/pms/ingest.ts", tag: "gated:G1", why: "W32: identity & consent ingestion — PMS reads (W27 contract) mapped onto platform" },
  { module: "src/pms/synthetic.ts", tag: "gated:G1", why: "W27: synthetic PMS adapter — the reference implementation of PmsReadAdapter over" },
  { module: "src/pms/vendors.ts", tag: "gated:G1", why: "W28: Best Practice / Halo PMS adapter skeletons — behind a flag, NO credentials" },
  { module: "src/privacy/record-classes.ts", tag: "law", why: "W106: every class of record that can hold a patient's identity, enumerated." },
  { module: "src/quality/a11y-exemptions.ts", tag: "law", why: "AR33: the a11y sweep completed to WCAG 2.2 AA, \"every exemption named and dated\" — the" },
  { module: "src/quality/contradictions.ts", tag: "law", why: "W210 (M4): the contradiction register — invariants that must hold NOW, checked continuously." },
  { module: "src/quality/engine-purity.ts", tag: "law", why: "O221 (STANDALONE-APP-PLAN.md Phase 2): the engine seam, made law. O222 rebuilt the scanner on" },
  { module: "src/quality/gate-state.ts", tag: "law", why: "AR14: the gate reaches the loop — O173's fix made structural." },
  { module: "src/quality/latent-findings.ts", tag: "law", why: "W210: a recorded finding carries the condition that would make it live — as code, not prose." },
  { module: "src/quality/non-vacuous.ts", tag: "law", why: "O196: the non-vacuity helper, and the register of loops that are allowed to iterate nothing." },
  { module: "src/quality/module-reasons.ts", tag: "law", why: "U15 (R0): the module-reasons register — every module the product does not import, and why it is" },
  { module: "src/quality/order-independence.ts", tag: "law", why: "W167: order-dependence, made mechanical." },
  { module: "src/quality/order-regressions.ts", tag: "law", why: "W178: the order-dependence defects, as a permanent corpus." },
  { module: "src/quality/route-weights.ts", tag: "law", why: "AR32: per-route shipped-JS budgets — performance floors that mean something." },
  { module: "src/quality/simplicity-read.ts", tag: "law", why: "U15 (R0): the reader behind the simplicity laws — files measured and blocks compared, nothing" },
  { module: "src/quality/simplicity.ts", tag: "law", why: "U15 (R0): the three size-and-shape laws of `docs/SIMPLICITY-LAWS.md`, as registers that fail." },
  { module: "src/quality/size-census-read.ts", tag: "law", why: "U14 (R0): the reader behind the size census — the tree measured, nothing decided." },
  { module: "src/quality/size-census.ts", tag: "law", why: "U14 (R0): the size census register — every number §1 and §2.5 of `docs/ONE-YEAR-BUILD-PLAN.md`" },
  { module: "src/referrals/analytics.ts", tag: "gated:G4", why: "W141: referral analytics — process, never people." },
  { module: "src/referrals/capture.ts", tag: "gated:G4", why: "W92: referral capture — referrals written but not completed." },
  { module: "src/referrals/compliance.ts", tag: "gated:G4", why: "W139: the referral compliance linter." },
  { module: "src/referrals/report.ts", tag: "gated:G4", why: "W96: leakage reporting for the practice." },
  { module: "src/referrals/scoping.ts", tag: "gated:G4", why: "W140: the referral layer's scoping triage, made mechanical." },
  { module: "src/registers/analytics.ts", tag: "gated:G5", why: "W64: register analytics — gap-closure rate by condition, under W9's holdout discipline." },
  { module: "src/registers/compare.ts", tag: "gated:G5", why: "W63: 26-week simulation, registers enabled vs disabled." },
  { module: "src/registers/escalation.ts", tag: "gated:G5", why: "W73: escalation triggers as data." },
  { module: "src/registers/safety-rails.ts", tag: "gated:G5", why: "W68: clinical-safety rails." },
  { module: "src/report/registers-section.ts", tag: "gated:G4", why: "W76: practice reporting v2 — gap closure and condition incrementality in the weekly report." },
  { module: "src/report/weekly.ts", tag: "gated:G4", why: "W20: weekly practice report generator — the document a practice manager actually reads." },
  { module: "src/security/audit-allowlist.ts", tag: "law", why: "W53: accepted-risk dependency advisories (W51 finding A2)." },
  { module: "src/security/audit-gate.ts", tag: "law", why: "W53: dependency-advisory gate (W51 finding A2 — `pnpm audit` had never been run)." },
  { module: "src/security/instruction-sinks.ts", tag: "law", why: "W153: the fourth sink, asserted against the source rather than promised." },
  { module: "src/security/reachability.ts", tag: "law", why: "W107: which npm packages a request-serving path can reach." },
  { module: "src/sim/fleet.ts", tag: "gated:W48", why: "W48: load/perf — the whole loop at fleet scale. One process runs N independent" },
  { module: "src/sim/scale.ts", tag: "gated:W48", why: "W99: 500-practice scale projection." },
  { module: "src/synthetic/recalls.ts", tag: "gated:G4", why: "W71: synthetic practice-recall data." },
  { module: "src/tenancy/multisite.ts", tag: "gated:W97", why: "W97: multisite tenancy — group-level roles, cross-site reporting, per-site isolation." },
  { module: "src/tenancy/rollout.ts", tag: "gated:W97", why: "W98: group rollout tooling — onboard N sites from one config." },
  { module: "src/tenancy/store-reads.ts", tag: "law", why: "W209: every exported function of every store, and what scopes it." },
  { module: "src/verticals/binding.ts", tag: "gated:W157", why: "W160: a practice is bound to the vertical version it accepted, and stays there." },
  { module: "src/verticals/declare.ts", tag: "gated:W157", why: "W248: one declaration path, so a second vertical is a DECLARATION rather than a second copy." },
  { module: "src/verticals/dermatology.ts", tag: "gated:W157", why: "W191: the dermatology vertical, assembled against W157's model." },
  { module: "src/verticals/third.ts", tag: "gated:W157", why: "W250: the third vertical. Also nameless, and for a reason the row states outright." },
  { module: "src/verticals/undecided.ts", tag: "gated:W157", why: "W248: the second vertical, which names no condition — because nobody has picked one." },
];

/** The gate references a `gated:` tag may name: a founder gate, or the plan unit that reaches it. */
export const GATE_REFERENCES: readonly string[] = [
  "G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8", "G9", "G10",
  "W48", "W97", "W157", "W214",
];

export interface ModuleReasonFinding {
  readonly kind: "untagged" | "stale" | "bad-gate" | "empty-why" | "duplicate";
  readonly module: string;
  readonly detail: string;
}

/**
 * The register against the measured tree, in both directions.
 *
 * `unreached` is what the census computed. A module in it with no entry is `untagged`; an entry
 * naming a module that is no longer unreached (reached again, or deleted) is `stale`.
 */
export function moduleReasonFindings(
  unreached: readonly string[],
  register: readonly ModuleReason[] = MODULE_REASONS,
): ModuleReasonFinding[] {
  const out: ModuleReasonFinding[] = [];
  const tagged = new Map<string, ModuleReason>();
  for (const entry of register) {
    if (tagged.has(entry.module)) {
      out.push({ kind: "duplicate", module: entry.module, detail: "named twice; one module, one reason" });
    }
    tagged.set(entry.module, entry);
    if (entry.why.trim().length < 12) {
      out.push({ kind: "empty-why", module: entry.module, detail: "no reason — quote the module's own header line" });
    }
    if (entry.tag.startsWith("gated:")) {
      const ref = entry.tag.slice("gated:".length);
      if (!GATE_REFERENCES.includes(ref)) {
        out.push({ kind: "bad-gate", module: entry.module, detail: `${ref} is not a founder gate or a plan unit` });
      }
    }
  }
  const set = new Set(unreached);
  for (const module of unreached) {
    if (!tagged.has(module)) {
      out.push({ kind: "untagged", module, detail: "unreached by the product and unexplained — tag it law, gated:<ref> or delete" });
    }
  }
  for (const entry of register) {
    if (!set.has(entry.module)) {
      out.push({ kind: "stale", module: entry.module, detail: "the register explains a module the census no longer reports as unreached" });
    }
  }
  return out;
}

/** The modules U30 will delete, named here and removed there. */
export function deletions(register: readonly ModuleReason[] = MODULE_REASONS): readonly string[] {
  return register.filter((entry) => entry.tag === "delete").map((entry) => entry.module);
}

/** How many modules each tag holds — the shape a reader checks before the detail. */
export function tagCounts(register: readonly ModuleReason[] = MODULE_REASONS): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const entry of register) {
    const key = entry.tag.startsWith("gated:") ? "gated" : entry.tag;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}
