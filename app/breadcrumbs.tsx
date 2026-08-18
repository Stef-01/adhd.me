// Launch items 5 + 17 (in part): where the reader is, said in one line — on screen and in the
// page's structured data, from the same list so the two cannot disagree.
import Link from "next/link";
import { SITE_URL } from "./site";

export type Crumb = { label: string; href: string };

export function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.label,
      item: `${SITE_URL}${crumb.href}`,
    })),
  };
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ol>
        {trail.map((crumb, i) => (
          <li key={crumb.href}>
            {i < trail.length - 1 ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
