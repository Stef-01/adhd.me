// Launch item 3: every public page ends with the same set of doors. One list, one component,
// so a page added tomorrow cannot ship with a different idea of what this site contains.
import Link from "next/link";
import { TEAM_PAGE_PUBLIC } from "./about/team";

const DOORS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Find a GP", href: "/finder" },
  { label: "The network", href: "/network" },
  // O197: the mission page sits directly after the network it introduces, because that is the
  // relationship — one is the argument, the other is the people. A public route with no door in
  // this list is reachable only by somebody who already knows the URL, which is the fault O189
  // named on the join page and O155's gated /about deliberately avoids.
  { label: "Why this exists", href: "/mission" },
  { label: "Worked examples", href: "/examples" },
  { label: "Questions", href: "/faq" },
  { label: "The approach", href: "/approach" },
  { label: "For practices", href: "/practices" },
  { label: "For GPs", href: "/clinicians/join" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

// O155: the About us door is not in DOORS while the team is gated; it is added back from the one
// flag rather than hand-edited, so the door and the route can never disagree.
//
// O197 REPLACED THE INDEX WITH A LOOKUP. The position was `slice(0, 4)` — "after Questions" written
// as a number — and adding one door above it silently moved About up a slot. The insertion point is
// a NEIGHBOUR, not an offset, so it is now named: the door after which About belongs. A dead branch
// that quietly means something different is worse than one that is simply dead, because the day the
// founder ungates the team page nobody re-derives the four.
const AFTER = DOORS.findIndex((door) => door.href === "/faq") + 1;
const VISIBLE_DOORS = TEAM_PAGE_PUBLIC
  ? [...DOORS.slice(0, AFTER), { label: "About us", href: "/about" }, ...DOORS.slice(AFTER)]
  : DOORS;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link href="/" className="site-footer-wordmark" translate="no">ADHD.ME</Link>
      <nav aria-label="Site">
        <ul>
          {VISIBLE_DOORS.map((door) => (
            <li key={door.href}><Link href={door.href}>{door.label}</Link></li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
