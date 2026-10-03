// SMOOTH (2026-09-06, founder-directed): the app's three tabs share one layout, so the tab bar
// mounts once and stays mounted while the finder, the profile and the learn tab swap beneath it.
// Before this each page rendered its own bar, and a tab change was a hard cut: the bar remounted,
// its marker appeared under the new tab rather than travelling to it, and the filter badge was
// re-read from nothing. The bar's marker carries a shared layout id, so with one mounted bar it
// springs from tab to tab, which is the continuity a person reads as "the same app".
//
// The finder still hides the bar on its inner stages: it stamps `data-tabs` on its own root and
// the bar's stylesheet reads it (`body:has(.care-app[data-tabs="hidden"]) .app-tabs`), so no
// state has to cross the layout boundary.
import { PlatformHeader } from "../platform-header";
import type { Viewport } from "next";

/** Patient-only browser chrome follows the aurora launch surface; public and console stay yellow. */
export const viewport: Viewport = { themeColor: "#07151d" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="platform-shell">
      {/* A procedural sky keeps the patient app alive without a remote image dependency. Each
          veil moves on its own long cycle, so the light never resolves into an obvious loop. */}
      <div className="aurora-atmosphere" aria-hidden="true">
        <span className="aurora-stars" />
        <span className="aurora-curtain aurora-curtain-one" />
        <span className="aurora-curtain aurora-curtain-two" />
        <span className="aurora-curtain aurora-curtain-three" />
        <span className="aurora-horizon" />
        <span className="aurora-grain" />
      </div>
      <PlatformHeader />
      {children}
    </div>
  );
}
