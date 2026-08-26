// O192: one place that knows a name must not wrap away from its honorific.
//
// Extracted when the deck became a server component and the profile became its own route: both
// render the same name and a second copy of this replace would be the kind of duplicate that
// drifts. `type.numeric-typography` covers it — non-breaking spaces inside names and units.

/** A non-breaking space. */
const NBSP = " ";

/** "Dr Anubhav Saxena" → "Dr<NBSP>Anubhav Saxena", so "Dr" never sits alone at a line end. */
export function nameNoBreak(name: string): string {
  return name.replace(/^(Dr|Prof|Mr|Ms|Mrs|Mx)\.?\s+/, (match) => match.trim() + NBSP);
}
