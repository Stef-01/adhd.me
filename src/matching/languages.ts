// W221: the governed consultation-language vocabulary shared by onboarding and matching.
/**
 * Languages the directory can recognise as an explicit consultation-language request.
 *
 * This is a closed vocabulary, shared by clinician onboarding and matching. Keeping it broader
 * than the current roster lets the finder say that Punjabi (for example) is not represented
 * today instead of silently treating the request as unreadable. English is omitted because it
 * is the default consultation language and is never used as a differentiating match reason.
 */
export const MATCHABLE_LANGUAGES = [
  "Arabic",
  "Hindi",
  "Igbo",
  "Malayalam",
  "Mandarin",
  "Punjabi",
  "Spanish",
  "Tamil",
  "Urdu",
  "Vietnamese",
] as const;
