// W51 audit fix: reading a number out of a FormData.
//
// `Number(formData.get(name))` is wrong in a way that is easy to miss and unsafe here:
// `Number(null)` and `Number("")` are both 0, and 0 is a VALID value for every eligibility
// field. So a form that omits `minDaysSinceLastVisit` — a renamed input, a JS-disabled
// browser, a hand-rolled POST — silently stores "no recency floor" and the practice starts
// contacting patients it saw yesterday. Validation cannot catch it, because 0 is legal.
//
// The onboarding action already guarded holdoutPercent this way, inline, with a comment
// explaining exactly this hazard (`Number(null) === 0`). The eligibility fields never got the
// same treatment. Extracting it means the next numeric field cannot be added without it.

/**
 * Parse a numeric form field, treating ABSENT and BLANK as invalid rather than as zero.
 *
 * Returns NaN for both, which every validator in the tree already rejects
 * (`Number.isFinite` / `Number.isInteger` both fail on NaN), so a missing field surfaces as
 * a field error instead of a silently permissive setting.
 */
export function numberField(form: FormData, name: string): number {
  const raw = form.get(name);
  if (raw === null) return Number.NaN;
  const text = String(raw).trim();
  if (text === "") return Number.NaN;
  return Number(text);
}
