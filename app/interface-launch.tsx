"use client";

// O192 (founder-directed): the bottom-right control that moves between the product's two
// interfaces — and it is deliberately NOT a toggle.
//
// THE FOUNDER'S CORRECTION, AND WHY IT CHANGES THE CONTROL RATHER THAN ITS LABEL: "instead of
// toggle make it, launch finder which has a different URL, this will help differentiate the two
// experiences". A toggle says two things are the same kind of thing and you are picking one. These
// are not the same kind of thing. `/network` is a PLACE — you arrive, you read people, you leave
// when you have read enough. `/finder` is a TOOL — you start it, it asks you something, it gives
// you an answer. Symmetric chrome would flatten that difference on both screens, which is exactly
// the differentiation the founder is asking the URLs to carry.
//
// So the control is asymmetric by design, and the asymmetry is the whole point:
//
//   ON THE NETWORK it LAUNCHES. The label is an action ("Launch the finder"), it carries the arrow
//   of something starting, and its second line says what the tool will do — because a reader who
//   has been browsing faces has not been asked a question yet and needs to know one is coming.
//
//   ON THE FINDER it RETURNS. The label is a destination ("The network"), no verb, quieter — you
//   are stepping back out to the place you came from, and a second "launch" mid-task would compete
//   with the finder's own controls.
//
// `interaction.touch-44`: the hit area clears the floor through padding rather than a large glyph,
// and it sits above the privacy bar's stacking context and clear of the safe-area inset.

import Link from "next/link";
import { usePathname } from "next/navigation";

export function InterfaceLaunch() {
  const pathname = usePathname();
  const onFinder = pathname === "/finder" || pathname?.startsWith("/finder/");

  if (onFinder) {
    return (
      <div className="interface-launch interface-launch-return">
        <Link href="/network" className="interface-launch-link" aria-label="Back to the network">
          <span className="interface-launch-glyph" aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3.5 5.5 8l4.5 4.5" />
            </svg>
          </span>
          <span className="interface-launch-text">
            <span className="interface-launch-label">The network</span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="interface-launch">
      <Link href="/finder" className="interface-launch-link" aria-label="Launch the finder">
        <span className="interface-launch-glyph" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="4.25" />
            <path d="M10.2 10.2 13.5 13.5" />
          </svg>
        </span>
        <span className="interface-launch-text">
          <span className="interface-launch-label">Launch the finder</span>
          <span className="interface-launch-hint">Describe what you need instead</span>
        </span>
      </Link>
    </div>
  );
}
