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
import { AppTabs } from "../app-tabs";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppTabs />
    </>
  );
}
