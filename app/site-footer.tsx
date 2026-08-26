// Launch item 3: every public page ends with the same set of doors. One list, one component,
// so a page added tomorrow cannot ship with a different idea of what this site contains.
import Link from "next/link";
import { TEAM_PAGE_PUBLIC } from "./about/team";

const DOORS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Find a GP", href: "/finder" },
  { label: "The network", href: "/network" },
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
const VISIBLE_DOORS = TEAM_PAGE_PUBLIC
  ? [...DOORS.slice(0, 4), { label: "About us", href: "/about" }, ...DOORS.slice(4)]
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
