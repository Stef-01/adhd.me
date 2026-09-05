"use client";

// O230 (founder-directed): the app's one navigation bar.
//
// Fixed to the bottom, because that is where every phone-shaped health product puts the thing you
// switch with and because the top of this app belongs to the search field. It reads
// `src/app-shell/tabs.ts` rather than listing anything, so the bar, the routes and what crawlers
// are told cannot disagree (the register's header says why that matters here).
//
// THE RULES IT IMPLEMENTS, EACH FROM THE RESEARCH AND EACH VISIBLE IN THE CSS:
//   * icon AND label, always, at every width — icon-only bars fail readers and are read as a
//     trust failure in health products specifically;
//   * the whole tab is the target, not the glyph: `flex: 1` with a 56px minimum block size, well
//     over the 44–48px floor and far over WCAG 2.2's 24px legal minimum, which is a floor and not
//     a design target;
//   * the active tab is stated three ways — colour, a filled icon weight, and the band above it —
//     never colour alone (the same rule the charts follow);
//   * `aria-current="page"` is what a screen reader gets, and the bar is a real `<nav>` with real
//     links, so Back, long-press-to-open-in-new-tab and the browser's own history all still work;
//   * the safe-area inset is padding, not margin, so the bar paints to the bottom edge of an
//     installed app while its controls sit above the home indicator.
//
// It renders on the four tab routes only. A deep flow inside the finder (listening, a profile, the
// booking handoff) hides it the way a native push hides a tab bar — `hidden` is that prop, and the
// finder is what decides, because the finder owns its stages.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, MagnifyingGlass, UserCircle, type Icon } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { activeFilterCount, readFilters } from "@/finder/filters";
import { activeTab, APP_TABS, type AppTab } from "@/app-shell/tabs";

const ICONS: Record<AppTab["icon"], Icon> = { MagnifyingGlass, UserCircle, BookOpen };

export function AppTabs({ hidden = false }: { hidden?: boolean }) {
  const pathname = usePathname();
  const current = activeTab(pathname ?? "/");
  // O240: the marker is ONE element that travels to the current tab (a shared layout id), the
  // way iOS and Material bars move their indicator — under reduced motion it simply appears.
  const reducedMotion = useReducedMotion();
  // transitions.dev notification badge, on a state this device already holds: how many filters are
  // on. `null` until mounted — localStorage does not exist during the server render, and a badge
  // that hydrated differently from the server would flash. Re-read on focus and on `storage`, so a
  // filter changed in another tab of the same site shows here without a reload; on the profile
  // itself the count is on the page, and it lands here on the next navigation.
  const [filtersOn, setFiltersOn] = useState<number | null>(null);
  useEffect(() => {
    const read = () => setFiltersOn(activeFilterCount(readFilters(window.localStorage)));
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
    };
  }, [current?.href]);
  if (hidden) return null;
  return (
    <nav className="app-tabs" aria-label="Sections">
      <ul className="app-tabs-list">
        {APP_TABS.map((tab) => {
          const Glyph = ICONS[tab.icon];
          const isCurrent = current?.href === tab.href;
          return (
            <li key={tab.href} className="app-tabs-item">
              <Link
                href={tab.href}
                className={isCurrent ? "app-tab is-current" : "app-tab"}
                aria-current={isCurrent ? "page" : undefined}
              >
                {isCurrent && (
                  <motion.span
                    className="app-tab-marker"
                    layoutId="app-tab-marker"
                    aria-hidden="true"
                    transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42, mass: 0.7 }}
                  />
                )}
                <motion.span
                  className="app-tab-glyph"
                  // Under reduced motion the glyph rests untransformed — the sweep holds every element to that.
                  animate={reducedMotion ? { scale: 1, y: 0 } : { scale: isCurrent ? 1.08 : 1, y: isCurrent ? -1 : 0 }}
                  transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 46 }}
                >
                  <Glyph size={22} weight={isCurrent ? "fill" : "regular"} aria-hidden="true" />
                </motion.span>
                <span className="app-tab-label">{tab.label}</span>
                {tab.href === "/profile" && (
                  <span className="t-badge" data-open={filtersOn !== null && filtersOn > 0 ? "true" : "false"} aria-hidden="true">
                    <span className="t-badge-dot">{filtersOn ?? ""}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
