// U9: every sentence the finder speaks to a screen reader, as data.
//
// The finder used to wrap its whole stage machine in one `aria-live="polite"` region, so a stage
// change read the entire new screen aloud — the heading, the copy, every button — and a re-rank
// read the whole results list again. This module is the script instead: one short line per
// change, written before the code that says it (`frontend-design`'s brief-first method), held as
// constants the same way U3 holds the boundary copy, so `announce.test.ts` runs every line through
// the patient rule set and the sentences cannot drift into a claim while the code around them is
// being edited.
//
// Each line says what changed and no more. The heading that follows is what the person reads
// next; the line is not a summary of the screen, it is the one fact the screen change carries
// that the heading does not — that the microphone is off, how many matches there are and for
// where, that the order changed because of a refine.

export const FINDER_ANNOUNCEMENTS = {
  /** The welcome screen, only when returned to — a fresh arrival is the page itself. */
  welcome: "Back at the start.",
  /** The example-searches screen. */
  scenarios: "Example searches.",
  /** The microphone is open. */
  listening: "Listening.",
  /** The toggle was tapped; the recogniser is finishing its last phrase. */
  finishing: "Finishing.",
  /** The typing screen when the microphone was not involved. */
  type: "Type what you are looking for.",
  /** The typing screen after the microphone stopped, whichever side stopped it. */
  typeAfterMic: "Listening stopped.",
  /** A profile is open; the name follows. */
  profile: "Profile:",
  /** The comparison of two profiles. */
  compare: "Comparing",
  /** The booking screen; the short name follows. */
  booking: "Booking",
  /** No match at all — the roster does not answer the request. */
  noMatches: "No matches.",
  /** The results were re-ordered after a refine or a place change. */
  reranked: "Re-ranked:",
} as const;

/** A language restart on the listening screen: the label is the language's own name. */
export function listeningAgainIn(label: string): string {
  return `Listening again in ${label}.`;
}

/**
 * The typing screen's line. The microphone's own message (a permission refusal, a stop that was
 * not asked for) is read after the fact of the stop, so the person hears what happened before the
 * detail — and the detail is the same sentence the screen shows, not a second wording of it.
 */
export function typeAnnouncement(input: { micStopped: boolean; speechMessage: string | null }): string {
  if (!input.micStopped && !input.speechMessage) return FINDER_ANNOUNCEMENTS.type;
  return input.speechMessage
    ? `${FINDER_ANNOUNCEMENTS.typeAfterMic} ${input.speechMessage}`
    : FINDER_ANNOUNCEMENTS.typeAfterMic;
}

/** The results line: a count, a place when the request has one, and the re-rank prefix on a refine. */
export function resultsAnnouncement(input: { count: number; suburb: string | null; reranked: boolean }): string {
  const body =
    input.count === 0
      ? FINDER_ANNOUNCEMENTS.noMatches
      : `${input.count} ${input.count === 1 ? "match" : "matches"}${input.suburb ? ` near ${input.suburb}` : ""}.`;
  return input.reranked ? `${FINDER_ANNOUNCEMENTS.reranked} ${body}` : body;
}

export function profileAnnouncement(name: string): string {
  return `${FINDER_ANNOUNCEMENTS.profile} ${name}.`;
}

export function compareAnnouncement(a: string, b: string): string {
  return `${FINDER_ANNOUNCEMENTS.compare} ${a} and ${b}.`;
}

export function bookingAnnouncement(shortName: string): string {
  return `${FINDER_ANNOUNCEMENTS.booking} ${shortName}.`;
}

/**
 * Every line the finder can speak, with the substitutions a sweep needs to see filled in, so the
 * compliance test reaches each sentence without knowing which function makes it.
 */
export function finderAnnouncementSentences(): ReadonlyArray<{ key: string; text: string }> {
  const out: { key: string; text: string }[] = [];
  for (const [key, text] of Object.entries(FINDER_ANNOUNCEMENTS)) out.push({ key, text });
  out.push({ key: "listeningAgainIn", text: listeningAgainIn("Vietnamese") });
  out.push({ key: "type.plain", text: typeAnnouncement({ micStopped: false, speechMessage: null }) });
  out.push({ key: "type.stopped", text: typeAnnouncement({ micStopped: true, speechMessage: null }) });
  out.push({
    key: "type.stopped-with-message",
    text: typeAnnouncement({ micStopped: true, speechMessage: "The microphone stopped on its own." }),
  });
  out.push({ key: "results.none", text: resultsAnnouncement({ count: 0, suburb: null, reranked: false }) });
  out.push({ key: "results.one", text: resultsAnnouncement({ count: 1, suburb: null, reranked: false }) });
  out.push({ key: "results.place", text: resultsAnnouncement({ count: 7, suburb: "Footscray", reranked: false }) });
  out.push({ key: "results.reranked", text: resultsAnnouncement({ count: 7, suburb: "Footscray", reranked: true }) });
  out.push({ key: "profile", text: profileAnnouncement("Dr Anusha Saxena") });
  out.push({ key: "compare", text: compareAnnouncement("Dr Anusha Saxena", "Dr Tom Reilly") });
  out.push({ key: "booking", text: bookingAnnouncement("Dr Saxena") });
  return out;
}
