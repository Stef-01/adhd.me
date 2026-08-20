// About us, as its own door (founder-directed 2026-08-20): the founders chapter leaves the
// landing page for this route, reached from the "About us" button in every footer. The title
// is the founder's exact spec — "Team", nothing else — and the page holds one idea: the four
// plates. Static on purpose: a list that does not reorder needs no motion (adhdme-taste).
import Image from "next/image";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { FOUNDERS, monogram } from "./founders";

export const metadata = {
  alternates: { canonical: "/about" },
  title: "Team",
  description: "The four people building ADHD.ME.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Team", href: "/about" }]} />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Team</h1>
      <ul className="story-founders about-founders">
        {FOUNDERS.map((f) => (
          <li key={f.name}>
            <div className="story-founder-plate">
              {f.portrait ? (
                <Image
                  className="story-founder-photo"
                  src={f.portrait}
                  alt={`${f.name}, co-founder of ADHD.ME`}
                  width={260}
                  height={347}
                />
              ) : (
                <span className="story-founder-monogram" aria-hidden="true">{monogram(f.name)}</span>
              )}
            </div>

            <div className="story-founder-id">
              <strong>{f.name}</strong>
              <span className="story-founder-role">{f.role}</span>
            </div>

            <p className="story-founder-remit">{f.remit}</p>

            <ul className="story-affiliations">
              {f.affiliations.map((a) => (
                <li key={a.name}>
                  <a href={a.href} target="_blank" rel="noreferrer" aria-label={a.label}>
                    {a.logo
                      ? <Image src={a.logo} alt={a.label} width={446} height={80} />
                      : <span>{a.name}</span>}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <SiteFooter />
    </main>
  );
}
