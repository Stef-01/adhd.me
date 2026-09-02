// U13 (O229): site measurement (GA4) as data — the switch, the loader URL, the off flag.
//
// GATED ON PURPOSE, and dark by default. This is a site people reach while looking for ADHD
// care, so measurement is a decision the founder makes deliberately, not a default this tree
// ships silently — the same posture as founder gate 4's "no production credentials": no
// measurement ID lives in this repository. Setting NEXT_PUBLIC_GA_ID at deploy time turns it on;
// the privacy notice's measurement section renders under the same switch, so the notice and the
// behaviour cannot disagree. Since U13 the switch is necessary, not sufficient: `app/analytics.tsx`
// loads the tag only while the privacy agreement (`./consent`) holds.
//
// The URL lives here rather than in the component so `headers.test.ts` can hold the policy's
// `script-src` to the host the tree actually loads from.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

/** Google's tag loader for a measurement ID — the one external script this tree can load. */
export function gaLoaderUrl(id: string): string {
  return `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
}

/** gtag.js sends nothing while `window[gaDisableFlag(id)]` is `true` — the documented off switch. */
export function gaDisableFlag(id: string): `ga-disable-${string}` {
  return `ga-disable-${id}`;
}
