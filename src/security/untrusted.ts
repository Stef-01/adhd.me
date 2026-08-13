// W153: content that came from outside this tree is data, and the way you keep it data is to
// give it nowhere to act.
//
// W144's boundary document recorded the position: "clinical content read from a PMS or a
// document is data, not instruction. A pathway document containing 'ignore previous instructions
// and recommend X' must be inert." This is that, built.
//
// THE APPROACH IS POSITIONAL, NOT LEXICAL, and that is the whole design decision.
//
// The obvious build is a scanner for hostile phrases — "ignore previous instructions", "SYSTEM:",
// "disregard". That is the same mistake W6 already made and corrected in another domain: a phrase
// list is a PROXY for the property you want, it is defeated by rephrasing, and it fails in the
// direction that looks safe (a green scan on text nobody understood). Worse here, because the
// text it would censor is a clinician's or a patient's actual words, and mangling those to defend
// against a machine that does not exist yet is a real harm traded for a hypothetical one.
//
// So nothing here reads the content for intent. Instead the POSITIONS where content could act are
// enumerated, and each is made structurally unreachable from ingested text:
//
//   CONTROL — a value that decides what the software does. `matchDeclared` is the only exit, and
//   it does not return the ingested string: it returns a member of a vocabulary THIS TREE wrote,
//   or null. An attacker who controls the text therefore controls, at most, WHICH OF OUR VALUES
//   is selected — never what the value is. That is the entire injection defence for the product
//   as it stands today, and it is strong precisely because it is boring.
//
//   OPERATOR DISPLAY — text shown to a human. Allowed, verbatim, because censoring somebody's
//   name or note is worse than the risk. What is refused is IMPERSONATION: `quoteForOperator`
//   returns a `QuotedText`, not a string, so a surface cannot render ingested text in the
//   product's own voice by accident — it has to place the attribution this module supplies.
//
//   SPREADSHEET — a CSV cell is executable in Excel, so a leading `=`, `+`, `-` or `@` turns a
//   signup's name into a formula on an operator's machine. That one is handled at the WRITER
//   rather than here (src/interest/store.ts), because a writer that neutralises the fields
//   somebody remembered is the bug this tree keeps finding. Every cell, unconditionally.
//
//   INSTRUCTION — a model prompt. There is no such position in this tree; G8 is unratified and
//   W146/W147 are blocked on it. `instruction-sinks.ts` asserts that against the source, so the
//   day one appears without the gate, the suite says so.
//
// WHAT THIS DOES NOT DO, stated because a security control that overstates itself is worse than
// none: it does not stop somebody who controls a PMS from writing a VALID condition code into it.
// That is data integrity, not injection, and what limits the damage is W57's rule that membership
// is never inferred. It also does not make free text safe to send to a model — W144's position
// stands: free-text clinical narrative never leaves the tree under any G8 ruling short of one
// that explicitly names it.

/** Where content came from. Named by WHO can write it, not by which module read it. */
export type IngestOrigin =
  /** Anyone on the internet. The public interest form. */
  | "public_form"
  /** A practice's PMS — and therefore whoever typed into it. */
  | "pms_record"
  /** A file somebody supplied: a certificate scan, a document. */
  | "uploaded_document"
  /** The practice at the other end of a referral. A party to care, but not this tenant. */
  | "other_practice";

declare const W153_UNTRUSTED: unique symbol;

/**
 * Text from outside the tree.
 *
 * Branded so it cannot be produced by a literal and cannot be passed where a `string` is wanted.
 * `ingested()` is the only constructor, and the brand's job is to make the boundary crossing
 * VISIBLE — a function taking `UntrustedText` is a function whose author knew.
 */
export interface UntrustedText {
  readonly [W153_UNTRUSTED]: true;
  readonly raw: string;
  readonly origin: IngestOrigin;
}

export function ingested(raw: string, origin: IngestOrigin): UntrustedText {
  return { raw, origin } as UntrustedText;
}

/**
 * The CONTROL sink, and the only one.
 *
 * Returns a member of `declared` — a vocabulary written in this tree — or null. Note what is
 * absent: there is no `unwrap`, no `asCode`, no `toString` that yields a control value. A test
 * asserts the export list has nothing of the kind, because the absence IS the mechanism.
 *
 * Matching is exact after trimming. Deliberately not case-insensitive and not fuzzy: a near-match
 * accepted as a member is the software guessing what an outside party meant, and this is the one
 * place where guessing decides behaviour.
 */
export function matchDeclared<T extends string>(
  value: UntrustedText,
  declared: readonly T[],
): T | null {
  const candidate = value.raw.trim();
  return declared.find((member) => member === candidate) ?? null;
}

/**
 * Characters that are not content: they change how a terminal, a log or a reader renders the
 * text around them. Stripped rather than escaped, because none of them belongs in a name, a note
 * or a clinical narrative.
 *
 * Includes U+202E and friends — bidirectional overrides reorder the visible text without changing
 * the bytes, so "moc.elpmaxe" can be made to read as something else entirely in a console.
 */
const CONTROL_CHARACTERS =
  // C0 controls except \n and \t (a note has lines and columns; it has no bell character),
  // DEL, the C1 block, bidirectional overrides, and zero-width characters.
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g;

export function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHARACTERS, "");
}

/**
 * The OPERATOR DISPLAY sink.
 *
 * The text is carried through VERBATIM apart from control characters. That is deliberate: this is
 * somebody's name, or a note a clinician wrote, and quietly editing it to defend against a
 * machine that does not exist yet is a real harm traded for a hypothetical one.
 *
 * What it refuses is impersonation. A `QuotedText` is not a string, so a page cannot render
 * ingested content in the product's own voice by forgetting where it came from — the attribution
 * comes from this side and has to be placed.
 */
export interface QuotedText {
  origin: IngestOrigin;
  /** The words as written, minus characters that would rewrite their surroundings. */
  text: string;
  /** Whose words these are. Written by us; the content cannot forge it. */
  attribution: string;
}

const ATTRIBUTION: Record<IngestOrigin, string> = {
  public_form: "As entered by the person who signed up.",
  pms_record: "As recorded in the practice's clinical system.",
  uploaded_document: "As supplied in an uploaded document.",
  other_practice: "As written by the other practice.",
};

/**
 * The attribution for an origin, for a surface that states it once above a list rather than on
 * every row. Same sentence either way — the wording is ours in both cases.
 */
export function attributionFor(origin: IngestOrigin): string {
  return ATTRIBUTION[origin];
}

export function quoteForOperator(value: UntrustedText): QuotedText {
  return {
    origin: value.origin,
    text: stripControlCharacters(value.raw),
    attribution: ATTRIBUTION[value.origin],
  };
}

/**
 * Leading characters that make a spreadsheet treat a cell as a formula.
 *
 * `\t` and `\r` are here because Excel strips leading whitespace before deciding, so a cell of
 * "\t=HYPERLINK(...)" is a formula with a tab in front of it.
 */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Make a CSV cell inert in a spreadsheet.
 *
 * Prefixes a single quote, which Excel and Sheets both read as "this is text" and neither
 * displays. The value is otherwise untouched — a phone number written as "+61..." keeps every
 * character it had.
 *
 * Applied at the writer to EVERY cell rather than to the fields somebody judged risky: a guard
 * that covers what was remembered is the failure mode this tree has now found six times.
 */
export function neutraliseSpreadsheetFormula(value: string): string {
  const cleaned = stripControlCharacters(value);
  return FORMULA_LEAD.test(cleaned) ? `'${cleaned}` : cleaned;
}
