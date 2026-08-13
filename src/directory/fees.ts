// W198: what a practice charges, stated plainly.
//
// Placed beside the directory rather than in `src/reporting` because a fee is read by a patient
// deciding whether they can afford an appointment, not by a commissioner. The Q16 row it belongs
// to is about transparency; the audience is the one W192 classified as `patient`.
//
// A price is the most comparison-shaped fact a directory can hold. Every instinct a product has
// about prices — sort them, badge the cheap one, say "great value" — is a claim about worth rather
// than a statement of fact, and beside a clinician's name it is regulated advertising. So the
// refusals here are unusually flat, and one of them is not about advertising at all.
//
// WHAT WE CHARGE IS A FACT. WHAT YOU WILL PAY IS NOT, AND THIS PRODUCT WILL NOT SAY IT. That is
// the sharp one. "Standard consultation $95" is something the practice knows. "You'll be about $53
// out of pocket" depends on the patient's concession status, their safety-net position, which item
// numbers the consultation ends up attracting, and whether the practice bulk bills them on the
// day — none of which this product holds, and the error direction is the bad one: a patient told
// they will pay less than they do has been given a reason to attend that turns out to be false, at
// the counter, after the consultation. So there is no out-of-pocket field, no rebate arithmetic
// and no estimate; `FeeSchedule` has nowhere to put one and `REFUSED_FEE_FIELDS` says why.
//
// NO COMPARISON AND NO RANKING, BY CONSTRUCTION RATHER THAN BY POLICY. `feeLines` orders by the
// service's own declared order and there is no sort-by-price anywhere: not exported, not internal,
// not available to a caller. W83 refused ranking clinicians internally, W184 refused comparative
// claims in profile copy, W188 refused an ordered membership list — a price list is the fourth
// place the same temptation arrives and the one where a single `sort` would turn the directory
// into a price-comparison site.
//
// A FEE IS PERISHABLE AND SAYS WHEN IT WAS STATED. W183 made `acceptingNewPatients` "a fact, and a
// perishable one"; a fee is worse, because a stale price is not merely out of date, it is a
// misrepresentation a patient acted on. Every schedule carries `statedOn`, and the rendered copy
// carries it too rather than leaving it in the data.
//
// A METHOD NOTE, because this unit produced the clearest instance of something that has now
// happened in five consecutive units. A scan whose subject matter IS the thing it bans will match
// the sentence doing the banning. W184's copy scan tripped on the page's own "no breakdown by
// clinician"; W188's import scan on its own refused-basis text; W190's additive-verb heuristic on
// `claimCount`; W192's twice; and here the caveat that exists to say "this is not an estimate of
// what you will pay" was refused for containing "you will pay". Each was caught by the test rather
// than by review, which is the system working — but the recurring fix is worth naming: assert on
// STRUCTURE (fields, exports, keys) where you can, and where the assertion must be over prose,
// scope it to the prose that makes the claim rather than the prose that refuses it.
//
// The copy linter reaches every fee field, the same way W184's reaches every profile field —
// `FEE_FIELD_LINTING` is checked against the schedule's own declared field list in both
// directions, so a field added to the type fails until somebody says how it is linted.

import { type ProfileCopyViolation, lintDirectoryText } from "./copy-lint";

/**
 * How a service is billed. A closed set: these are the arrangements a practice can state as a
 * fact about itself, and none of them is a claim about what a given patient will pay.
 */
export type BillingArrangement =
  /** No charge to the patient; the practice bills Medicare directly. */
  | "bulk_billed"
  /** The patient pays the fee below and claims their own rebate. */
  | "private_fee"
  /** Bulk billed for some patients, private for others, on the practice's stated criteria. */
  | "mixed";

export const ALL_BILLING_ARRANGEMENTS: readonly BillingArrangement[] = [
  "bulk_billed",
  "mixed",
  "private_fee",
];

export const BILLING_COPY: Readonly<Record<BillingArrangement, string>> = {
  bulk_billed: "Bulk billed — no charge to you for this appointment type.",
  mixed: "Bulk billed for some patients and charged for others. The practice sets who, and says so below.",
  private_fee: "A fee is charged. You claim your Medicare rebate afterwards; how much you get back depends on your own circumstances.",
};

export interface FeeLine {
  /** What the appointment is called, in the practice's own words. */
  service: string;
  arrangement: BillingArrangement;
  /**
   * What the practice charges, in whole cents. Null when bulk billed — not 0, because 0 would
   * read as a price of zero rather than as no charge arising.
   */
  feeCents: number | null;
  /** Who is bulk billed, when the arrangement is mixed. Free text, and linted. */
  bulkBillingCriteria: string | null;
}

export interface FeeSchedule {
  practiceId: string;
  lines: readonly FeeLine[];
  /** When the practice last stated these. A fee with no date is a fee nobody can rely on. */
  statedOn: string;
}

/** Every field a fee schedule emits, declared. Checked against the type by the test. */
export const FEE_FIELDS: readonly string[] = [
  "arrangement",
  "bulkBillingCriteria",
  "feeCents",
  "service",
  "statedOn",
];

export type FeeFieldLinting =
  | { kind: "linted_copy" }
  | { kind: "structured"; why: string };

export const FEE_FIELD_LINTING: Readonly<Record<string, FeeFieldLinting>> = {
  arrangement: {
    kind: "structured",
    why: "A closed enum of three billing arrangements. There is no free text in it, and the copy a reader sees comes from BILLING_COPY, which is linted by this module's own test.",
  },
  bulkBillingCriteria: { kind: "linted_copy" },
  feeCents: {
    kind: "structured",
    why: "An integer in whole cents. Held as cents rather than a formatted string precisely so that no currency phrasing, rounding claim or 'from' qualifier can enter through it.",
  },
  service: { kind: "linted_copy" },
  statedOn: {
    kind: "structured",
    why: "An ISO date. Its own format is checked on construction; there is no prose in it to lint.",
  },
};

/**
 * Fee-specific claims no existing linter covers.
 *
 * Short, and unioned with W23/W6 through `lintDirectoryText` rather than restated — W139's rule,
 * fourth use. What is new here is the vocabulary of WORTH, which is what a price invites and which
 * none of the clinical or marketing rules names.
 */
const FEE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  {
    rule: "no-value-language",
    pattern: /\b(great|good|excellent|exceptional)\s+value\b|\bvalue for money\b|\baffordable\b|\bcheap(?:er|est)?\b|\binexpensive\b|\bbudget[- ]friendly\b/i,
  },
  {
    rule: "no-price-comparison",
    // W205 narrowed the first alternative. `\b(lower|less) than\b` matched "Bulk billed for
    // children less than 16", refusing an entire fee schedule over an age threshold. A price
    // comparison needs a price on the other side of it, so the pattern now requires one.
    pattern: /\b(?:lower|less) than\s+(?:\$|the\s+(?:usual|average|market|standard)|average|market|other|others|elsewhere|anywhere)\b|\bcompared? (?:to|with)\b|\bbeat(?:s|ing)? (?:any|the)\b|\bmarket rate\b|\bbelow average\b/i,
  },
  {
    rule: "no-out-of-pocket-estimate",
    pattern: /\bout[- ]of[- ]pocket\b|\byou(?:'ll| will) (?:only )?pay\b|\bgap (?:fee|payment|of)\b|\bafter (?:the )?rebate\b|\bcosts? you\b/i,
  },
  {
    rule: "no-inducement",
    pattern: /\b(free|discount\w*|special offer|no[- ]gap|save \$?\d)\b/i,
  },
];

export const FEE_ONLY_RULES: readonly string[] = FEE_PATTERNS.map((p) => p.rule);

export const FEE_RULE_COPY: Record<string, string> = {
  "no-value-language":
    "Value is a judgement about worth, not a statement of price. A practice can say what it charges; saying the charge is good value is an advertising claim about its own service, made beside a clinician's name.",
  "no-price-comparison":
    "A comparison turns a fee list into a price-comparison site and makes a claim about other practices this product has no basis for. W83 refused ranking internally and the same refusal applies harder in public.",
  "no-out-of-pocket-estimate":
    "What a patient will actually pay depends on their concession status, their safety-net position and which item numbers the consultation attracts — none of which this product holds. Told they will pay less than they do, a patient finds out at the counter after the appointment.",
  "no-inducement":
    "Free, discounted and no-gap framing is an inducement to attend, which is the thing W6 refuses in a message and the thing Ahpra's guidelines name in advertising. A fee is stated, not promoted.",
};

/**
 * Words that name a SERVICE rather than a claim, so a match on one in a fee line is not a finding.
 *
 * One entry, and it is here because W23's `no-ratings` matches the bare word "review" — the rule
 * exists to catch patient ratings, and "review" is what half the MBS item descriptors are called.
 * "Care plan review" is one of the most commonly billed consultations in Australian general
 * practice, and a fee schedule that cannot name it is unusable.
 *
 * THIS IS THE THIRD COLLISION WITH THE SAME WORD, and three is a pattern rather than bad luck.
 * W192 hit it twice: once scanning /clinicians' SOURCE, where it matched the identifier
 * `is-reviewed`, and once on the ADM notice, where the page is required to say how a decision can
 * be reviewed — accepted there with a review date. Now a clinical service name.
 *
 * `\breviews?\b` is mis-specified: a patient rating is "reviews" in the sense of stars and 5/5,
 * which `no-ratings` already matches separately. Narrowing the pattern is a real fix and it is NOT
 * this unit — it edits W23's rule and W23's own landing tests depend on it. Filed as
 * `RATING_RULE_OVER_BROAD` so the next hardening week has it in the suite rather than in a commit
 * message, and handled locally here in the narrowest way that lets a practice name its services.
 */
export const SERVICE_WORD_EXEMPTIONS: Readonly<Record<string, string>> = {
  review: "Half the MBS item descriptors are a review — care plan review, medication review, health assessment review. `no-ratings` matches the bare word because a patient rating is also called a review, and it already catches stars, 5/5 and 'rated' separately.",
  reviews: "The plural of the same service name, for a line that lists more than one.",
};

/** The exempt service words as one pattern, so masking them needs no fold. */
const SERVICE_WORD_PATTERN = new RegExp(
  `\\b(?:${Object.keys(SERVICE_WORD_EXEMPTIONS).join("|")})\\b`,
  "gi",
);

/**
 * Filed for the next hardening week, in the suite rather than in a commit message.
 *
 * Three demonstrated false positives on three surfaces is a mis-specified rule, not three unlucky
 * pages. Fixing it means narrowing `no-ratings` in `src/compliance/landing.ts` and re-checking
 * W23's landing tests, which is its own unit.
 */
export const RATING_RULE_OVER_BROAD =
  "W23's `no-ratings` matches the bare word \"review\", which has now produced false positives on three surfaces: /clinicians (the identifier `is-reviewed`, W192), /privacy/automated-decisions (an ADM notice saying a review is scheduled, W192, accepted — and since retired at W201, whose rewrite of that page removed the phrase, so the acceptance was deleted rather than left to rot), and fee service names (\"Care plan review\", W198, exempted here). A patient rating is caught separately by the star, 5/5 and \"rated\" branches of the same rule. Narrowing the word branch is a unit of its own because W23's landing tests depend on the current pattern.";

function lintFeeOnly(text: string, field: string): ProfileCopyViolation[] {
  const out: ProfileCopyViolation[] = [];
  for (const { rule, pattern } of FEE_PATTERNS) {
    const match = text.match(pattern);
    if (match) out.push({ field, rule, match: match[0] });
  }
  return out;
}

/**
 * The full union applied to one fee string: W23, W6, W184's directory rules, and these.
 *
 * W205 FIXED A HOLE HERE, AND THE SHAPE OF IT IS WORTH KEEPING. The exemption used to be a
 * FILTER over the results: drop a `no-ratings` violation whose matched word is a service name.
 * But a linter returns the FIRST match per rule, so one exempt word consumed the whole rule for
 * that string — "Medication review clinic, rated 5/5 by patients" produced exactly one
 * `no-ratings` violation, matching "review", which the filter then removed. The rating claim
 * went out unlinted, and the same string without the word "review" was correctly refused.
 *
 * The exemption is now applied to the TEXT rather than to the findings: service words are masked
 * before linting, so they cannot be the match, and everything else in the sentence is still
 * checked. Masking preserves length so any offsets stay meaningful.
 */
export function lintFeeText(text: string, field: string): ProfileCopyViolation[] {
  // One alternation rather than a fold over the words: with a fold, whether "reviews" survives
  // depends on which key was masked first, and although both orders happen to agree here (the
  // word boundaries make the two disjoint) that is a fact somebody would have to re-derive.
  // W167's register exists for folds like it; not writing one is better than declaring one.
  const masked = text.replace(SERVICE_WORD_PATTERN, (word) => "x".repeat(word.length));
  return [...lintDirectoryText(masked, field), ...lintFeeOnly(masked, field)];
}

/** Every rule a fee schedule answers to, assembled rather than transcribed (W139's device). */
export function feeCopyRules(directoryRules: readonly string[]): string[] {
  return [...new Set([...directoryRules, ...FEE_ONLY_RULES])].sort();
}

export type FeeRefusal =
  | "service_missing"
  | "date_missing_or_unreadable"
  | "fee_on_a_bulk_billed_line"
  | "fee_missing_on_a_charged_line"
  | "criteria_missing_on_a_mixed_line"
  | "criteria_on_a_line_that_has_none"
  | "negative_fee"
  | "copy_makes_a_claim";

export type FeeResult =
  | { ok: true; schedule: FeeSchedule }
  | { ok: false; errors: FeeRefusal[]; violations: ProfileCopyViolation[] };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Build a fee schedule, or refuse it with every reason.
 *
 * The arrangement and the fee have to agree: a bulk-billed line carrying a price, or a charged
 * line without one, is a schedule that will read as the opposite of what it means to somebody
 * skimming it.
 */
export function feeSchedule(
  practiceId: string,
  lines: readonly FeeLine[],
  statedOn: string,
): FeeResult {
  const errors: FeeRefusal[] = [];
  const violations: ProfileCopyViolation[] = [];

  if (!ISO_DATE.test(statedOn)) errors.push("date_missing_or_unreadable");

  lines.forEach((line, i) => {
    if (line.service.trim() === "") errors.push("service_missing");
    if (line.arrangement === "bulk_billed" && line.feeCents !== null) {
      errors.push("fee_on_a_bulk_billed_line");
    }
    if (line.arrangement !== "bulk_billed" && line.feeCents === null) {
      errors.push("fee_missing_on_a_charged_line");
    }
    if (line.feeCents !== null && line.feeCents < 0) errors.push("negative_fee");
    if (line.arrangement === "mixed" && (line.bulkBillingCriteria ?? "").trim() === "") {
      errors.push("criteria_missing_on_a_mixed_line");
    }
    if (line.arrangement !== "mixed" && line.bulkBillingCriteria !== null) {
      errors.push("criteria_on_a_line_that_has_none");
    }
    violations.push(...lintFeeText(line.service, `lines[${i}].service`));
    if (line.bulkBillingCriteria !== null) {
      violations.push(...lintFeeText(line.bulkBillingCriteria, `lines[${i}].bulkBillingCriteria`));
    }
  });

  if (violations.length > 0) errors.push("copy_makes_a_claim");
  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)], violations };
  return { ok: true, schedule: { practiceId, lines, statedOn } };
}

/**
 * The schedule as lines to render, in the order the practice declared them.
 *
 * NOT SORTED, and there is no sort available: no comparator is exported, none is taken as an
 * argument, and nothing here reads `feeCents` for ordering. A price list sorted by price is a
 * price-comparison site, and it would be one `sort` away if this returned anything else.
 */
export function feeLines(schedule: FeeSchedule): Array<{ service: string; amount: string; note: string }> {
  return schedule.lines.map((line) => ({
    service: line.service,
    amount: line.feeCents === null ? "No charge" : formatCents(line.feeCents),
    note:
      line.arrangement === "mixed" && line.bulkBillingCriteria
        ? `${BILLING_COPY.mixed} ${line.bulkBillingCriteria}`
        : BILLING_COPY[line.arrangement],
  }));
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * The caveat that travels with every rendered schedule.
 *
 * Rendered, not documented — W149's rule for anything that leaves the product that explains it.
 * The date is in the sentence because a fee without one is a fee nobody can rely on.
 */
export function feeCaveat(schedule: FeeSchedule): string {
  // Worded to say the distinction without using the constructions `no-out-of-pocket-estimate`
  // bans. The first draft said "not what you will pay" and failed this module's own rule — which
  // is the right outcome: a disclaimer that has to phrase itself as the thing it disclaims is a
  // disclaimer that will be quoted out of context. See the method note in the header.
  return (
    `These are the fees this practice stated on ${schedule.statedOn}. They are what the practice ` +
    `charges, not an estimate of your final cost: how much Medicare gives back depends on your ` +
    `own circumstances, and the practice can tell you before your appointment.`
  );
}

/**
 * Fields this model refuses to have, with the reason each is refused.
 *
 * Data rather than a comment, so the test reads the same list a human does and a future unit has
 * to delete a stated refusal rather than simply add a property.
 */
export const REFUSED_FEE_FIELDS: Readonly<Record<string, string>> = {
  outOfPocketCents:
    "The number a patient actually pays depends on their concession status, safety-net position and which item numbers the consultation attracts. This product holds none of those, and the error direction is the bad one: told they will pay less than they do, a patient finds out at the counter after the appointment.",
  rebateCents:
    "A rebate is a fact about the patient's Medicare entitlement rather than about the practice, and publishing one invites the subtraction the field above refuses.",
  comparisonToAverage:
    "There is no average this product could compute honestly, and if there were, publishing a practice's position against it is the ranking W83 refused one floor down.",
  priceRank:
    "The same refusal as the field above, stated separately so that nobody adds ordering as a sort key having read only the list of fields and concluded that ranking was merely undeclared.",
  discount:
    "A discount is an inducement to attend. W6 refuses that in a message and Ahpra's guidelines name it in advertising; a fee is stated, not promoted.",
};

export const FEE_REFUSAL_COPY: Record<FeeRefusal, string> = {
  service_missing: "A fee line that does not say what it is for cannot be read.",
  date_missing_or_unreadable: "A fee with no date is a fee nobody can rely on.",
  fee_on_a_bulk_billed_line: "A bulk-billed line carries no fee. A price beside it reads as a charge that is not made.",
  fee_missing_on_a_charged_line: "A line that charges must say what it charges, or it is not transparency.",
  criteria_missing_on_a_mixed_line: "Mixed billing without saying who is bulk billed tells a patient nothing they can act on.",
  criteria_on_a_line_that_has_none: "Bulk-billing criteria on a line that is not mixed will be read as applying when it does not.",
  negative_fee: "A negative fee is not a fee, and a schedule carrying one has a sign error somewhere upstream.",
  copy_makes_a_claim: "The wording carries a claim rather than only a price. See the violations for which rule and which words.",
};
