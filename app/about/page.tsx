// About us, as its own door (founder-directed 2026-08-20): the founders chapter leaves the
// landing page for this route, reached from the "About us" button in every footer. The title
// is the founder's exact spec — "Team", nothing else — and the page holds one idea: the four
// plates. The plates rise once on view (founder-directed "more motion", the landing's reveal
// language) and render in place under prefers-reduced-motion — see team-plates.tsx.
import { notFound } from "next/navigation";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { TEAM_PAGE_PUBLIC } from "./team";
import { TeamPlates } from "./team-plates";

export const metadata = {
  alternates: { canonical: "/about" },
  title: "Team",
  description: "The people building ADHD.ME.",
  // O155: while the team is gated the page must not advertise itself to crawlers either. A hidden
  // page that still asks to be indexed is not hidden.
  robots: { index: false, follow: false },
};

export default function AboutPage() {
  // O155: gated, not deleted. See TEAM_PAGE_PUBLIC in founders.ts for the founder's reason.
  if (!TEAM_PAGE_PUBLIC) notFound();

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Team", href: "/about" }]} />
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Team</h1>
      <TeamPlates />
      <SiteFooter />
    </main>
  );
}
