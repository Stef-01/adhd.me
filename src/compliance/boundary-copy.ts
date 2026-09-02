// U3 (O228): every sentence an error boundary or a loading state can show, as data.
//
// A boundary is the one screen nobody designs on purpose, which is exactly why its copy has to be
// where the compliance linter can read it. Held here as constants — the same shape as W23's
// `LANDING_COPY` — so `public-surfaces.test.ts` sweeps each sentence under the patient rule set,
// and so the boundaries themselves cannot drift into vendor copy or an error code (the taste
// register's `interaction.errors-plain`: an error is a plain sentence with a way out).
//
// Each boundary says three things and no more: what happened, that the reader did not cause it,
// and what to do. Retry is first because it is what a boundary can actually offer; the second
// door is a full navigation, so that a client tree the boundary caught can be left behind.

export const BOUNDARY_COPY = {
  /** `app/error.tsx`: a page under the root layout threw while rendering. */
  route: {
    heading: "Something went wrong on this page.",
    body: "This page did not load properly. Nothing you did caused it. Try it again, or start from the beginning.",
    retry: "Try again",
    home: "Start from the beginning",
  },
  /** `app/console/error.tsx`: a console screen threw; the way out is the console's front page. */
  console: {
    heading: "This screen did not load.",
    body: "The console could not draw this screen. Nothing you did caused it. Try it again, or go back to the console's front page.",
    retry: "Try again",
    home: "Back to the console",
  },
  /** `app/global-error.tsx`: the root layout itself failed, so this draws its own document. */
  global: {
    heading: "ADHD.ME did not load.",
    body: "Something went wrong before the page could be drawn. Nothing you did caused it. Reload to try again.",
    reload: "Reload",
    home: "Start from the beginning",
  },
  /** `loading.tsx` under the finder and the console shell: one line while the route streams in. */
  loading: {
    finder: "Loading the finder…",
    console: "Loading…",
  },
} as const;

/** Every sentence above, flattened, so a sweep reaches each one without knowing the shape. */
export function boundarySentences(): ReadonlyArray<{ key: string; text: string }> {
  const out: { key: string; text: string }[] = [];
  for (const [group, leaves] of Object.entries(BOUNDARY_COPY)) {
    for (const [leaf, text] of Object.entries(leaves)) out.push({ key: `${group}.${leaf}`, text });
  }
  return out;
}
