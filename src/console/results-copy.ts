// W42: the practice-facing results copy, as data so the compliance linter can lint
// exactly what ships (src/console/results.test.ts). Plain English throughout — no
// "incrementality", no "holdout arm", no "per 1,000", no "attribution". Every number
// on the page is explained in a sentence a practice manager can act on.
//
// The framing of the hard idea (why the honest number is smaller than the raw count)
// deliberately states the inflated claim FIRST and rejects it, so the reader arrives
// at the real number having already discounted the bigger one. Rigour is the product.

export const RESULTS_COPY = {
  heading: "Your results",
  lede:
    "What your practice got from Meherr that it would not have got anyway — measured " +
    "against a group of your own patients we never message.",
  syntheticNote:
    "Demonstration data. Every figure here comes from a simulated practice. The measurement " +
    "is the real one — the same held-back group and the same arithmetic your practice will " +
    "get. Only the patients are invented.",

  tiles: {
    extraAppointments: {
      label: "Extra appointments",
      explain: "Appointments your practice would not have had if Meherr had never sent a message.",
    },
    extraBillings: {
      label: "Extra billings, estimated",
      explain:
        "Those extra appointments multiplied by what an average visit bills. Change the " +
        "per-visit figure on the ROI calculator.",
    },
    optOuts: {
      label: "Patients who asked us to stop",
      explain: "People who replied STOP. If this passes the limit we stop sending and tell you.",
    },
  },

  comparison: {
    heading: "Why the smaller number is the real one",
    body: [
      "Some appointments booked from a Meherr message were going to happen anyway — our " +
        "message changed when and how those patients booked, not whether they came.",
      "To separate the two, a share of your patients is picked at random and never messaged. " +
        "They are your comparison group. Whatever they do on their own is what the rest of " +
        "your patients would have done without Meherr.",
      "The difference between the two groups is what Meherr added. That is the number we " +
        "report, and the only number we would ever bill against.",
    ],
    barLabelExtra: "extra",
    barLabelAnyway: "would have happened anyway",
  },

  guardrails: {
    heading: "Is anything going wrong?",
    allClear: "Nothing needs your attention. Every check is inside its limit.",
    attention: "Some checks need your attention.",
    continuityNote:
      "Meherr only offers appointments with the patient's own GP, so every booking above " +
      "kept that continuity. This confirms the rule held — it is not a result.",
  },

  chart: {
    heading: "The two groups, week by week",
    sub:
      "Appointments attended per 100 patients. Both lines move with your normal demand; the " +
      "gap between them is what Meherr added.",
    caption:
      "Single weeks bounce around, and some come out negative. That is normal — one week is " +
      "too small a sample to mean anything on its own. The whole-period total is the number " +
      "to plan around.",
    messagedLabel: "Messaged patients",
    comparisonLabel: "Comparison group",
    tableHeading: "Week-by-week numbers",
    tableCaption:
      "Appointments attended per 100 patients each week in each group, and the difference " +
      "converted into appointments.",
  },

  method: {
    heading: "How this is measured",
    body: [
      "A share of your patients is picked at random and never messaged. Everyone stays in the " +
        "group they were assigned to, whatever happens next — including patients who opted out " +
        "or ignored every message. Taking those people out afterwards would tilt the answer in " +
        "our favour.",
      "We count attended appointments only. A booking that is cancelled or missed never counts.",
      "This is an estimate, not an exact count — it compares two groups of people, so it moves " +
        "around. Week-by-week views are each measured over their own span, so the weeks may not " +
        "add to the total exactly.",
    ],
  },

  footer: "Meherr reports no impact figure for a practice with no comparison group.",
} as const;
