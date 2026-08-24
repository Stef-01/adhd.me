// Launch item 6, built the only way a health product may build "case studies": no patients.
//
// A case study on this site cannot be a person's story — a patient outcome presented as
// marketing is a testimonial, which the National Law prohibits and this tree's own laws ban
// outright. What CAN be shown, truthfully, is the product working. And it has to be shown in
// ALREADY-LINTED language: the first draft rendered the demo requests verbatim, and the
// rendered-copy sweep refused the page — those sentences carry clinical vocabulary a patient
// marketing page may not, which is exactly the control working. So each example renders its
// archetype HEADLINE (patient copy the finder already serves), and the numbers and verdicts
// the pipeline computes — counts and facts, never the clinical words themselves. Everything
// below is computed live by the SAME pipeline the finder runs, so this page cannot drift from
// the product it demonstrates.
import Link from "next/link";
import type { Metadata } from "next";
import { careArchetypes } from "@/demo/care-archetypes";
import { matchQuality, needsFor, rankClinicians } from "@/demo/clinicians";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = {
  alternates: { canonical: "/examples" },
  title: "Worked examples",
  description:
    "Demo scenarios run through the real finder: how much it understood, whether the order was earned, and who it showed first — with the reasons printed in the product itself.",
};

export default function ExamplesPage() {
  const examples = careArchetypes.slice(0, 3).map((archetype) => {
    const understood = needsFor(archetype.request).length;
    const quality = matchQuality(archetype.request);
    return {
      headline: archetype.headline,
      understood,
      firstName: rankClinicians(archetype.request)[0]!.shortName,
      verdict:
        quality === "informed"
          ? "the order was earned, and the reason is printed on the card"
          : quality === "tied"
            ? "the listed GPs answered it equally well, and the finder says so instead of pretending to rank them"
            // O111: this page had the same falsehood the finder's banner did. "The words
            // reached nothing" is true of `unmatched` and false of `unserved`, where the
            // words reached a facet and the LISTING is what falls short — and saying it
            // here would blame the reader for the roster's gap in the one place the product
            // is explaining its own honesty.
            : quality === "unserved"
              ? "the words were read, nobody listed answers them, and the finder names the gap as ours"
              : "the words reached nothing, and the finder says so instead of inventing an order",
    };
  });

  return (
    <>
    <PublicHeader />
    <main className="prose-screen">
      <div className="prose-wrap">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Worked examples", href: "/examples" }]} />
        <h1>Worked examples</h1>
        <p className="prose-note">
          These are demo scenarios, not patients — nobody’s story is used to sell anything here.
          Each result below is computed live by the same matching the finder runs, so this page
          shows what the product actually does, not what a brochure says it does.
        </p>
        {examples.map((example) => (
          <section key={example.headline} className="example-item">
            <h2>{example.headline}</h2>
            <p>
              From that request, the finder read <strong>{example.understood}</strong>{" "}
              {example.understood === 1 ? "thing" : "things"} the person asked for —{" "}
              {example.verdict}. Shown first: {example.firstName}.
            </p>
          </section>
        ))}
        <p>
          The order is never a judgement about who is a better doctor. It is overlap between what
          you asked for and what each GP declares about their own work — and when your words do
          not separate the list, the finder tells you that in as many words.
        </p>
        <div className="prose-doors">
          <Link className="notfound-primary" href="/finder">Try it with your own words</Link>
        </div>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
