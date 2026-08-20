// Launch item 3: every public page ends with the same set of doors. One list, one component,
// so a page added tomorrow cannot ship with a different idea of what this site contains.
import Link from "next/link";

const DOORS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "Find a GP", href: "/finder" },
  { label: "Worked examples", href: "/examples" },
  { label: "Questions", href: "/faq" },
  { label: "The approach", href: "/approach" },
  { label: "About us", href: "/#about" },
  { label: "For practices", href: "/practices" },
  { label: "For GPs", href: "/clinicians/join" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link href="/" className="site-footer-wordmark">ADHD.ME</Link>
      <nav aria-label="Site">
        <ul>
          {DOORS.map((door) => (
            <li key={door.href}><Link href={door.href}>{door.label}</Link></li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
