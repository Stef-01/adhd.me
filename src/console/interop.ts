// W246: the interop console's view — where nothing has been exchanged, and the page says so.
//
// WHAT WAS EXCHANGED IS NOTHING, which makes this the hardest page in the lane to write honestly.
// Eight interop modules ship and not one byte has left this tree: no endpoint exists, every
// `SHIPPED_*` collection is pinned empty, and G1 is shut. A console over that renders very easily
// as a clean dashboard with zeroes in it — every count correct, every gauge green, and a reader
// concluding the integrations are working and quiet.
//
// A ZERO THAT MEANS "NOTHING HAS EVER BEEN ATTEMPTED" AND A ZERO THAT MEANS "EVERYTHING SUCCEEDED"
// ARE THE SAME CHARACTER. Keeping them apart is the whole page. Every count here therefore carries
// the sentence saying which kind it is, as a field rather than as prose a template remembers to
// print — the same device W219 used for its caveat and for the same reason.
//
// THE ABSENCES ARE THE CONTENT, AND THEY ARE DERIVED. The unbound codes come from W238's own work
// order, the unsent fields from W235's and W236's registers, the empty R4 slots from W236's, the
// ledger's emptiness from W239, the gate from W242. Nothing here is a list somebody typed: each
// absence already has a reason attached in the module that owns it, and a hand-written copy would
// go stale the first time one changed.
//
// AND THIS PAGE MUST NEVER SHOW A GREEN STATE. No tick, no "connected", no "healthy". W229 had to
// keep a drift verdict from being graded in CSS; the stakes here are higher, because a practice
// that believes its referrals are flowing will stop chasing them.

import { CONFIGURED_INTEGRATIONS, CREDENTIAL_GATES, G1_OPEN, interopCredentials } from "@/interop/credentials";
import { SHIPPED_DISCLOSURES } from "@/interop/disclosure-ledger";
import { APPOINTMENT_UNMAPPED, SHIPPED_MAPPINGS } from "@/interop/fhir";
import { REFERRAL_PROFILE_EMPTY_SLOTS, SHIPPED_REFERRAL_PROFILES } from "@/interop/referral-profile";
import { OPEN_LOCAL_SYSTEMS, SHIPPED_BINDINGS, codesNeedingBinding, loadBindings, unboundCodes } from "@/interop/terminology";
import { EXCHANGE_OUTCOME_COPY } from "@/interop/exchange";

/**
 * A count, and which kind of zero it is when it is zero.
 *
 * `meaning` is required and travels with the number. A count rendered without it is the ambiguity
 * this page exists to remove, and a template that has to remember to print a sentence beside a
 * figure is a template that will one day not.
 */
export interface CountedAbsence {
  label: string;
  count: number;
  /** What this number means, and specifically what a zero here does NOT mean. */
  meaning: string;
}

/** One thing that has not been exchanged, and why not. Derived from the module that owns it. */
export interface NotExchanged {
  what: string;
  why: string;
  /** Where the reason is declared, so a reader can check it rather than believe this page. */
  declaredIn: string;
}

export interface InteropView {
  /** Always false while G1 is shut. Never rendered as a status light — see the module note. */
  anythingExchanged: boolean;
  /** The sentence a reader gets instead of a dashboard. */
  headline: string;
  exchanged: readonly CountedAbsence[];
  notExchanged: readonly NotExchanged[];
  /** The gate, named, with the refusal the loader actually produces. */
  gate: { name: string; covers: string; refusal: string };
}

export const INTEROP_HEADLINE =
  "Nothing has been exchanged with any outside system. No connection is configured, nothing has been sent, and nothing has been received — so every count on this page is zero because nothing was attempted, not because everything succeeded.";

/**
 * The headline once something HAS been exchanged.
 *
 * This exists because the sentence above is a claim about the lane's current state, and a claim
 * pinned to today's emptiness is a lie in waiting: the first populated collection would leave the
 * page saying nothing had been sent directly above a number saying otherwise. Which of the two
 * renders is derived, never chosen by a template.
 */
export const SOMETHING_EXCHANGED_HEADLINE =
  "Something has been exchanged with an outside system. The counts below are of attempts this product made, not of deliveries an outside system confirmed — an exchange with no acknowledgement is recorded as unknown, and unknown is counted here the same as any other attempt.";

export const NOTHING_ATTEMPTED =
  "Zero because nothing was attempted. This is not a count of successful exchanges.";

/**
 * The second kind of zero: this lane has exchanged something, just nothing of THIS kind.
 *
 * Distinct from `NOTHING_ATTEMPTED` because the reader's next question differs. A zero under a
 * silent lane means no integration exists; a zero beside a sibling count of nine means this
 * particular thing is not going out, which is a fault worth chasing rather than a state.
 */
export const NONE_OF_THIS_KIND =
  "Zero, though other exchanges have been attempted. Nothing of this kind has been sent, which is not the same as nothing having been tried at all.";

/**
 * And a non-zero count, which needs its own caveat: it counts attempts, not arrivals.
 *
 * W244 records an unacknowledged exchange as `unknown` rather than as delivered. A count that
 * pools unknown with acknowledged — which this one does — must say so, or the number becomes the
 * delivery confirmation the lane refuses to give.
 */
export const ATTEMPTED_NOT_CONFIRMED =
  "Counts attempts this product made, including exchanges nothing came back for. It is not a count of deliveries an outside system confirmed.";

/**
 * Which of the three sentences belongs beside a count.
 *
 * Exported so a test can exercise the choice without reaching a rendered page, and so the rule
 * lives in one place rather than in whichever template last needed it.
 */
export function meaningFor(count: number, anythingExchanged: boolean): string {
  if (count > 0) return ATTEMPTED_NOT_CONFIRMED;
  return anythingExchanged ? NONE_OF_THIS_KIND : NOTHING_ATTEMPTED;
}

/**
 * The page as a value.
 *
 * Takes nothing: every input is a module-level declaration in the lane, and reading them here is
 * what makes the page derived rather than described. When one of them stops being empty, this page
 * changes without anybody editing it.
 */
export function interopView(): InteropView {
  const bindings = loadBindings(SHIPPED_BINDINGS);
  const unbound = unboundCodes(bindings);
  const refusal = interopCredentials({
    integration: "any",
    value: undefined,
    source: "process_environment",
  });

  const counted: readonly { label: string; count: number }[] = [
    { label: "Appointments mapped and sent", count: SHIPPED_MAPPINGS.length },
    { label: "Referrals sent", count: SHIPPED_REFERRAL_PROFILES.length },
    { label: "Disclosures recorded", count: SHIPPED_DISCLOSURES.length },
    { label: "Integrations configured", count: CONFIGURED_INTEGRATIONS.length },
  ];
  // Derived from the counts themselves rather than restated, so the two can never disagree.
  const anythingExchanged = counted.some((c) => c.count > 0);

  return {
    anythingExchanged,
    headline: anythingExchanged ? SOMETHING_EXCHANGED_HEADLINE : INTEROP_HEADLINE,
    exchanged: counted.map((c) => ({ ...c, meaning: meaningFor(c.count, anythingExchanged) })),
    notExchanged: [
      {
        what: `${unbound.length} of ${codesNeedingBinding().length} codes have no terminology binding`,
        why: "Each would be sent as this product's own local code. A receiving system that does not know that code cannot file what it is told, and binding them means opening a published release rather than writing a concept id from memory.",
        declaredIn: "src/interop/terminology.ts",
      },
      {
        what: `${OPEN_LOCAL_SYSTEMS.length} code systems have no fixed vocabulary to bind`,
        why: OPEN_LOCAL_SYSTEMS.map((o) => o.why).join(" "),
        declaredIn: "src/interop/terminology.ts",
      },
      {
        what: `${APPOINTMENT_UNMAPPED.length} appointment fields are deliberately not sent`,
        why: APPOINTMENT_UNMAPPED.map((u) => u.why).join(" "),
        declaredIn: "src/interop/fhir.ts",
      },
      {
        what: `${REFERRAL_PROFILE_EMPTY_SLOTS.length} slots in a referral are deliberately left empty`,
        why: "Each is a place a composed sentence would fit, and filling it would put clinical wording this tree wrote into a document travelling under a clinician's name.",
        declaredIn: "src/interop/referral-profile.ts",
      },
      // Conditional for the same reason the headline is: this one asserts that nothing has been
      // attempted, and it would go on asserting it beside a count that said otherwise. The
      // unknown-vs-delivered rule it carries is true either way, so only the framing changes.
      anythingExchanged
        ? {
            what: "An exchange with no acknowledgement is recorded as unknown, not as delivered",
            why: EXCHANGE_OUTCOME_COPY.unknown,
            declaredIn: "src/interop/exchange.ts",
          }
        : {
            what: "No exchange has an outcome, because none has been attempted",
            why: `When one is, an unacknowledged exchange reads as unknown rather than as delivered. ${EXCHANGE_OUTCOME_COPY.unknown}`,
            declaredIn: "src/interop/exchange.ts",
          },
    ],
    gate: {
      name: "G1",
      covers: CREDENTIAL_GATES.G1.covers,
      refusal: refusal.configured ? "" : refusal.copy,
    },
  };
}

/** Whether the gate is shut. Separate from the view so a page cannot render a status from a count. */
export const INTEROP_GATE_OPEN = G1_OPEN;
