// W46: the sales deck and one-pager content, as data. Two reasons it is not written
// straight into the generators: the compliance linter can lint exactly what ships
// (same gate as the landing page, W23), and the figures test can check that every
// number rendered is one the register can source.
//
// Numbers appear in the copy ONLY as {{figure.id}} placeholders, never as literals.
// That is what makes "figures traceable" mechanical rather than aspirational: a
// literal number in a slide would slip past the register, so the test bans them.

export interface Slide {
  title: string;
  bullets: string[];
  /**
   * "cards" renders each bullet as a stat card whose leading token is the big
   * number — so every bullet on a card slide MUST begin with a {{figure}}
   * placeholder (asserted in collateral.test.ts). Default is icon-and-text rows.
   */
  layout?: "cards" | "rows";
  /** Speaker note — context for whoever presents, never shown to the audience. */
  note?: string;
}

export const DECK: { title: string; subtitle: string; slides: Slide[] } = {
  title: "Meherr",
  subtitle: "Continuity yield for general practice",
  slides: [
    {
      title: "The problem",
      bullets: [
        "Late cancellations and quiet mid-week sessions leave clinician time unused.",
        "Manual recall is slow to run, hard to target, and impossible to measure.",
        "Most tools count every booking they touch as their own, which tells a practice nothing about real impact.",
      ],
    },
    {
      title: "What Meherr does",
      bullets: [
        "Finds the established patients most likely to value a return visit to their usual GP.",
        "Sends an availability-only message, inside the rules the practice sets.",
        "One tap books a real open slot; when the session fills, the other offers close.",
      ],
      note: "Availability language only — no clinical content in any patient message.",
    },
    {
      title: "The number we report",
      bullets: [
        "A share of each practice's patients is held back at random and never messaged.",
        "We report the difference between the two groups — appointments that would not have happened otherwise.",
        "We never report the raw count of bookings we touched as impact.",
      ],
      note: "This is the differentiator. Every competitor claim is the raw count.",
    },
    {
      title: "What a {{assumption.gp-count}}-GP practice can expect",
      layout: "cards",
      bullets: [
        "{{roi.incremental-visits-year}} incremental attended appointments a year.",
        "{{roi.net-annual-benefit}} net annual benefit, after the Meherr subscription.",
        "{{roi.multiple}} return on the Meherr subscription.",
      ],
      note: "Every input is on the next slide. These are modelled, not measured — say so.",
    },
    {
      title: "The assumptions behind those numbers",
      bullets: [
        "{{assumption.open-slot-rate}} of appointment capacity sits unfilled.",
        "{{assumption.incremental-share}} of generated visits are genuinely incremental; the rest would have happened anyway.",
        "Billing per attended visit is set by the practice — a standard Level B consultation rebates {{mbs.item23}}, and an all-in bulk-billed Level B is {{mbs.bulk-billed-level-b-metro}} in metro.",
        "A pilot replaces every assumption above with the practice's own measured figures.",
      ],
    },
    {
      title: "Built for the rules",
      bullets: [
        "Availability-only messaging, with a compliance check on every template.",
        "One-tap opt-out, honoured permanently.",
        "Per-practice pause and an instant stop, plus an audit log of every message, booking and opt-out.",
        "Practice data stays isolated to that practice.",
      ],
    },
    {
      title: "How a pilot runs",
      bullets: [
        "Self-serve setup in one sitting: practice details, clinicians, sessions, eligibility rules.",
        "The held-back group is on by default, so the result is measurable from week one.",
        "A weekly report shows incremental appointments, the revenue estimate, and every guardrail.",
      ],
    },
  ],
};

export const ONE_PAGER = {
  title: "Meherr — continuity yield for general practice",
  intro:
    "Meherr fills unused appointment capacity by inviting established patients back to " +
    "their usual GP, and proves how many of those visits are genuinely additional.",
  sections: [
    {
      heading: "What it does",
      body:
        "Within the eligibility rules a practice sets, Meherr identifies established patients " +
        "who may value a return visit, sends an availability-only message, and books them into a " +
        "real open slot with their usual GP. When a session fills, the remaining offers close.",
    },
    {
      heading: "How impact is measured",
      body:
        "A share of each practice's patients is held back at random and never messaged. The " +
        "difference between the two groups is what Meherr added. We report that figure and " +
        "never the raw count of bookings we touched.",
    },
    {
      heading: "What a {{assumption.gp-count}}-GP practice can expect",
      body:
        "On the modelling assumptions stated below: {{roi.incremental-visits-year}} incremental " +
        "attended appointments a year, and {{roi.net-annual-benefit}} net annual benefit after the " +
        "subscription — a {{roi.multiple}} return. A pilot replaces these with measured figures.",
    },
    {
      heading: "Assumptions",
      body:
        "{{assumption.open-slot-rate}} of capacity unfilled; {{assumption.incremental-share}} of " +
        "generated visits genuinely incremental; billing per visit set by the practice, against a " +
        "standard Level B rebate of {{mbs.item23}}.",
    },
    {
      heading: "Compliance",
      body:
        "Availability-only messaging with a compliance check on every template, permanent one-tap " +
        "opt-out, per-practice pause, a full audit log, and practice-level data isolation.",
    },
  ],
  footer:
    "Business-to-business service for accredited general practices. Not patient medical advice.",
} as const;
