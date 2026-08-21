// W220: the response graph as a practice reads it.
//
// W212 built the graph, W218 gave it a disclosure floor, W219 settled what may and may not be
// claimed from it. Nothing rendered any of it — and every honesty device those three units built
// only does its work at the moment somebody reads a number, so this is where they are kept or
// lost. This module is the view; `app/console/responses/page.tsx` is a renderer over it, so the
// decisions below are testable rather than inspectable.
//
// THE RAW GRAPH IS NOT IN THE VIEW TYPE. `responsesView` calls `discloseResponseGraph` and the
// result holds only the disclosed one — there is no field a template could reach an undisclosed
// count through. A floor applied in a template is a floor one refactor from being dropped, and
// the refactor looks like tidying.
//
// THE CAVEAT TRAVELS WITH THE RATES. W219 attached `RESPONSE_RATE_CAVEAT` to the value precisely
// so a surface could not print the number without the sentence saying it is a within-arm rate and
// not an effect. The view carries it as its own field so the renderer has it in hand at the point
// it draws the table, rather than at the bottom of the page where a footnote goes to be unread.
//
// THREE EMPTY STATES, NOT ONE. The row's gate asks that nothing-happened be distinguished from
// nothing-recorded (W179), and building it surfaced a third that is neither:
//   - NOTHING HAPPENED — no interventions at all, so the graph refuses. There is nothing to have
//     been answered, and no rate is withheld: none exists.
//   - NOTHING RECORDED — interventions went out and the record holds no answer to any of them.
//     W211's `not_recorded`, which is not "nobody answered": it is the record's silence, and the
//     largest category on a young rail.
//   - EVERYTHING WITHHELD — answers exist and every kind sits below W218's disclosure floor, so
//     the page shows none of them. A withheld count is not a zero and not a silence; it is a
//     number too small to show without naming the people in it.
// Reading any of the three as another is a different false sentence, so each has its own.
//
// AND AN UNOBSERVED KIND IS NOT A ZERO ROW. W212's distinction, carried to the render: a kind the
// period never performed gets its own section with its own sentence, because "referrals: 0%" in a
// rate table describes a referral rail that answered nobody rather than one that was never used.

import type { CounterfactualResult } from "@/outcomes/counterfactual";
import {
  RESPONSE_RATE_CAVEAT,
  attributeByKind,
  kindWithheldCopy,
  type AttributionV2Result,
  type KindResponseRate,
} from "@/outcomes/attribution-v2";
import {
  discloseResponseGraph,
  type DisclosedResponseGraph,
  type GraphRefusal,
  type GraphResult,
  type UnobservedKind,
} from "@/outcomes/response-graph";

/** Why the page has no rates to show. Three states, because they are three different sentences. */
export type ResponsesEmptyReason = "nothing_happened" | "nothing_recorded" | "everything_withheld";

export const RESPONSES_EMPTY_COPY: Record<ResponsesEmptyReason, string> = {
  nothing_happened:
    "Nothing went out in this period, so there is nothing to have been answered. This is not a response rate of zero — no messages were sent, so no rate exists to report.",
  nothing_recorded:
    "Messages went out and the record holds no answer to any of them. That is the record being silent, not everybody declining: an answer that was never written down looks exactly like an answer that never came, and this page will not report one as the other.",
  everything_withheld:
    "Answers were recorded, and every group of them is too small to show. A group this size would identify the people in it, so the counts are withheld rather than displayed with a caveat. A withheld count is not a zero and not a silence — the number exists.",
};

/** Copy for the graph's own refusals, so a refusal never renders as a blank page. */
export const RESPONSES_REFUSAL_COPY: Record<GraphRefusal, string> = {
  nothing_recorded: RESPONSES_EMPTY_COPY.nothing_happened,
  period_missing_or_unreadable:
    "The reporting period could not be read, so no counts are shown. Nothing is being withheld and nothing is being claimed; the page has no period to count over.",
};

export interface ResponsesView {
  /** Set when there is nothing to show, and which of the three reasons it is. */
  empty: ResponsesEmptyReason | null;
  /** The sentence for that reason, resolved here so no surface writes its own. */
  emptyCopy: string | null;
  /** The DISCLOSED graph and W218's statement. Null only when the graph refused outright. */
  disclosure: DisclosedResponseGraph | null;
  /** Rates over the disclosed graph. Empty in all three empty states. */
  rates: readonly KindResponseRate[];
  /** Carried as a field so the renderer holds it at the table, not in a footnote. */
  caveat: typeof RESPONSE_RATE_CAVEAT;
  /** W219: the per-kind claim, or the reasons there is none. Null when the graph refused. */
  attribution: AttributionV2Result | null;
  /** The sentence when the per-kind claim is withheld. Null when it is not. */
  attributionWithheldCopy: string | null;
  /** Kinds the period never performed. Never rendered as a rate of zero. */
  unobserved: readonly UnobservedKind[];
  /** The graph's own refusals, with copy. Empty when a graph was built. */
  refusals: readonly { reason: GraphRefusal; copy: string }[];
}

/**
 * The whole page as a value.
 *
 * Takes an already-built `GraphResult` rather than a `SimResult`: the founder gate lives in
 * `interventionsFromSim`, which is the only producer of an intervention in this tree, and taking
 * the graph here is what makes the three empty states reachable by a test instead of reasoned
 * about. A view state nobody can construct is a view state nobody has checked.
 */
export function responsesView(
  graph: GraphResult,
  counterfactual: CounterfactualResult,
): ResponsesView {
  if (!graph.ok) {
    return {
      empty: "nothing_happened",
      emptyCopy: RESPONSES_EMPTY_COPY.nothing_happened,
      disclosure: null,
      rates: [],
      caveat: RESPONSE_RATE_CAVEAT,
      attribution: null,
      attributionWithheldCopy: null,
      unobserved: [],
      refusals: graph.errors.map((reason) => ({ reason, copy: RESPONSES_REFUSAL_COPY[reason] })),
    };
  }

  // Disclosed first, and the raw graph goes no further than this line.
  const disclosure = discloseResponseGraph(graph.graph);
  const attribution = attributeByKind(disclosure.graph, counterfactual);
  const rates = attribution.rates;

  // Which of the three, if any. Order matters: a graph whose every kind was withheld also has no
  // edges, and reporting it as silence would state the opposite of what happened.
  // Two branches, not three: a BUILT graph always holds at least one intervention (the builder
  // refuses over nothing), so every kind of it appears in the rates unless the floor withheld it.
  // "No rates and nothing withheld" is therefore unreachable, and it gets no defensive branch —
  // a fallback returns plausible copy for a state nobody has reasoned about, which is W213's
  // argument. The unreachability is asserted in the test instead.
  let empty: ResponsesEmptyReason | null = null;
  if (disclosure.withheldKinds.length > 0 && rates.length === 0) empty = "everything_withheld";
  else if (rates.length > 0 && rates.every((rate) => rate.answeredAtLeastOnce === 0)) {
    empty = "nothing_recorded";
  }

  return {
    empty,
    emptyCopy: empty === null ? null : RESPONSES_EMPTY_COPY[empty],
    disclosure,
    rates,
    caveat: RESPONSE_RATE_CAVEAT,
    attribution,
    attributionWithheldCopy: kindWithheldCopy(attribution),
    unobserved: disclosure.graph.unobserved,
    refusals: [],
  };
}
