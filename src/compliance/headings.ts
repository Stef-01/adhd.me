// A patient screen's heading is a sentence, and a sentence ends.
//
// Measured across the 73 patient screens the text-budget instrument reaches: 32 headings end in a
// full stop, 7 in a question mark, and 19 in nothing. The 19 are not one mistake nineteen times —
// most of them are RIGHT. "Privacy policy" is the name of a document, "Dr Mei Chao" is a person,
// "3 GPs" is a count. None of those takes a full stop.
//
// Four were wrong, and they were wrong against the product's own precedent: `/match`'s three empty
// states read as sentences ("Nothing to prepare yet") and "What to bring" is the same shape as
// "What you tried." two screens away, which has one.
//
// SO THE RULE CANNOT BE "EVERY HEADING ENDS IN A STOP", and a test that asserted that would have
// to be switched off for a third of the app. This is the same shape as `DYNAMIC_ROUTE_PLAN` in
// `e2e/site-routes.ts`, and for the same reason it gives: a sweep that quietly skips the awkward
// cases has reinvented the hardcoded list somewhere nobody looks. Every bare heading is named
// here with why it is bare, so a new one forces its author to decide which it is.

/** A heading with no terminal punctuation, and the reason it needs none. */
export const BARE_HEADINGS: Readonly<Record<string, string>> = {
  // Names of documents and surfaces. A title is a label, not a statement.
  "Privacy policy": "The name of a document.",
  "Terms of use": "The name of a document.",
  "The legal check": "The name of a document — the counsel review page.",
  "How ADHD.ME uses automated decision-making":
    "The name of a document. It is a noun phrase rather than a sentence, and long enough that a full stop reads as a typo.",
  "ADHD.ME demo": "The name of a surface, and it carries the product name.",
  "Worked examples": "The name of a surface.",
  Questions: "The name of a surface — the FAQ.",
  "The lab": "The name of a surface.",
  "My Toolkit": "The name of a surface.",
  "Eight lives": "The name of a surface — the cast page, and the count is the title.",
  "Search Filters": "The name of a surface.",
  "Everyday strategies": "The name of a learning module, shown as the card's own title.",

  // A person. Never punctuated, on any screen.
  "Dr Mei Chao": "A person's name.",
  "Dr Anubhav Saxena": "A person's name.",

  // A count. The number is the heading.
  "3 GPs": "A count of results, which is a label and not a sentence.",
};

/**
 * Which of `headings` are bare without being accounted for above.
 *
 * `headings` is what a browser found on screen, so this stays a pure function over strings and the
 * sweep that collects them lives in the e2e suite.
 */
export function undeclaredBareHeadings(headings: readonly string[]): string[] {
  return [...new Set(headings)]
    .filter((h) => h.length > 0 && !/[.?!:]$/.test(h))
    .filter((h) => !(h in BARE_HEADINGS))
    .sort();
}

/** Entries naming a heading no screen shows any more — the stale half. */
export function staleBareHeadings(headings: readonly string[]): string[] {
  const onScreen = new Set(headings);
  return Object.keys(BARE_HEADINGS).filter((h) => !onScreen.has(h)).sort();
}
