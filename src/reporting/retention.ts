// W204: how long a produced report lives, and the answer is that today it does not.
//
// THE FINDING, WHICH IS ALSO THE UNIT: THIS PRODUCT KEEPS NO REPORTS, AND THAT IS NOT A GAP.
//
// W199 renders a report on demand from the practice's own live rails. Nothing is written down:
// there is no report store, no `producedAt`, no artefact table. So the retention question — how
// long do we keep it — has the shortest possible answer, and the honest thing is to declare that
// answer in W106's registry rather than to leave the class undeclared because it has no rows.
//
// An undeclared class is exactly what W51 found: erasure covered the booking rail and missed the
// complaints store, and the console reported no data held. "There is nothing to declare" and
// "nobody declared it" are indistinguishable from outside, and only one of them survives the next
// unit adding a table.
//
// WHY NOT KEEPING IT IS THE RIGHT DEFAULT AND NOT MERELY THE EASY ONE. A stored report is a
// second copy of figures that were derived from records which have their own retention. Purge a
// referral under W33 and a stored report computed last quarter still contains it — the erasure
// reaches the source and not the derivative, which is W51's failure in a new place. Recomputing
// on demand means erasure is automatically effective on every figure, because there is no figure
// to erase.
//
// AND THE DAY G9 OPENS, THAT REVERSES. This is the part worth writing down before anybody needs
// it. W202/W203 would send a report to a PHN, and you cannot have accountable disclosure without
// keeping a copy of what you disclosed: "what did we tell them in Q2?" is the first question
// asked after any dispute, and a product that recomputes cannot answer it — the rails have moved
// on. So the moment disclosure becomes possible, a disclosure log becomes MANDATORY, and it is a
// stored class with a real life rather than a derived one.
//
// That is a genuine tension and not a wrinkle: the retention posture that is safest while nothing
// is sent is the wrong posture the instant something is. `PROPOSED_DISCLOSURE_LOG` states what
// would have to exist, so the G9 decision is priced with its consequence attached rather than
// discovering it afterwards.

/**
 * The life of a produced report, today.
 *
 * A named constant rather than a comment, because "we do not store it" is a claim a test can
 * check against the tree and a comment is a claim about what somebody believed.
 */
export const REPORT_RETENTION = {
  handling: "derived" as const,
  /**
   * Zero days is not "purged immediately" — it is "never written". The distinction matters: a
   * zero-day purge is a job that can fail, and this is the absence of a thing to purge.
   */
  storedForDays: 0,
  why:
    "A report is recomputed from the practice's own live rails every time it is read. Nothing is persisted, so there is nothing to purge and erasure of a source record is automatically effective on every figure derived from it. Storing reports would create a second copy that erasure does not reach — W51's failure in a new place.",
} as const;

/**
 * What would have to exist the day G9 opens.
 *
 * Not built, and deliberately not built: a store that exists is a store something can be written
 * to, and G9 is unratified. Declared so the founder decision carries its consequence rather than
 * acquiring one later.
 */
export const PROPOSED_DISCLOSURE_LOG = {
  whenRequired: "The first time a report is sent to anybody outside the practice (W202/W203).",
  why:
    "Accountable disclosure requires knowing what was disclosed. 'What did we tell them in Q2?' is the first question after any dispute, and a product that recomputes cannot answer it because the rails have moved on. The log is a record of what LEFT, which is a different class from the figures it was made of.",
  handlingWouldBe: "stored" as const,
  /**
   * Seven years, matching the health-records posture the rest of the tree uses for
   * clinical-adjacent records. Stated as a starting point a founder can overrule, not as a
   * decision this unit is entitled to make on its own.
   */
  proposedLifeDays: 2555,
  openQuestion:
    "Whether the log holds the FIGURES that were sent or only the fact of sending. Holding the figures makes the log answer the question fully and makes it a lasting copy of practice-identifiable data; holding only the fact makes it cheap and half-useful. This is a founder call bundled with G9, not a modelling detail.",
} as const;

/**
 * Artefacts a reader might expect this product to keep, and whether it does.
 *
 * Enumerated because "we keep nothing" is easy to say and easy to be wrong about, and because a
 * reader auditing retention needs the list to check against rather than a sentence to trust.
 */
export const REPORTING_ARTEFACTS: readonly {
  what: string;
  kept: boolean;
  why: string;
}[] = [
  {
    what: "The rendered reporting summary (W199)",
    kept: false,
    why: "Recomputed on demand from live rails. Never written down, so there is no artefact with a life.",
  },
  {
    what: "The figures the summary was built from",
    kept: false,
    why: "A `Figure` is constructed per request from the rails and discarded with the response. The rails themselves are declared classes with their own retention (W106).",
  },
  {
    what: "A copy a practice took away",
    kept: false,
    why: "Outside this product entirely. W199's caveats travel on the document for exactly this reason — a copied figure keeps its denominator and its period because nothing here can reach it later. W177 made the same argument about an exported audit trail.",
  },
  {
    what: "A record of what was disclosed to an outside body",
    kept: false,
    why: "Nothing is disclosed: G9 is unratified and W199 has no recipient parameter. This becomes MANDATORY rather than optional the day that changes — see PROPOSED_DISCLOSURE_LOG.",
  },
];
