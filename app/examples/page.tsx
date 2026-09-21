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
import { seoMetadata } from "@/seo/pages";
import { exampleArchetypes } from "@/demo/care-archetypes";
import { matchQuality, needsFor, rankClinicians } from "@/demo/clinicians";
import { rosterSizeInWords } from "@/demo/roster-size";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = seoMetadata("/examples");

export default function ExamplesPage() {
  // Chosen for range — a care-area ask, a language ask, a "who" ask — not the first three of the
  // list; see `exampleArchetypes` for why the first three were the wrong three.
  const examples = exampleArchetypes().map((archetype) => {
    const understood = needsFor(archetype.request).length;
    const quality = matchQuality(archetype.request);
    return {
      headline: archetype.headline,
      understood,
      /*
        O203: THE FULL NAME, NOT `shortName`. Both GPs on this roster are Saxena, so the roster
        disambiguates hers ("Dr Anu Saxena") and leaves his as the bare surname ("Dr Saxena") —
        fine in a result row read one at a time, and on this page it produced THREE lines all
        reading "Shown first: Dr Saxena", leaving a reader unable to tell whether that was one
        doctor three times or two different people. O192 round 5 made exactly this ruling on the
        network deck; it applies wherever names appear together.
      */
      firstName: rankClinicians(archetype.request)[0]!.name,
      verdict:
        quality === "informed"
          ? "The order was earned; the reason is on the card."
          : quality === "tied"
            ? "The listed GPs answered it equally well, and the finder says so."
            // O111: "the words reached nothing" is true of `unmatched` and false of `unserved`,
            // where the words reached a facet and the LISTING is what falls short.
            : quality === "unserved"
              ? "Nobody listed answers it, and the finder names the gap as ours."
              : "The words reached nothing, and the finder says so.",
    };
  });

  /** Derived: do the scenarios above actually demonstrate different outcomes, or the same one? */
  const sameFirstForAll =
    examples.length > 1 && new Set(examples.map((e) => e.firstName)).size === 1;

  return (
    <>
    <PublicHeader />
    {/* Footer as a sibling of `main` — see the note on /faq: a `<footer>` inside `main` is not the
        page's `contentinfo` landmark. `.prose-wrap` carries the `flex: 1` that keeps the foot down. */}
    <div className="prose-screen">
      <main id="main-content" className="prose-wrap">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Worked examples", href: "/examples" }]} />
        <h1>Worked examples</h1>
        {/* Demo scenarios, not patients: a patient outcome presented as marketing is a testimonial.
            The requests themselves are not printed, because they carry clinical vocabulary a public
            page may not repeat (the rendered-copy sweep refused a draft that did). What is printed
            is what the finder made of them, computed live by the same pipeline. */}
        <p className="prose-note">Demo scenarios, not patients. Each result is computed live by the finder.</p>
        {examples.map((example) => (
          <section key={example.headline} className="example-item">
            <h2>{example.headline}</h2>
            <p>
              Read <strong>{example.understood}</strong> {example.understood === 1 ? "thing" : "things"} asked
              for. {example.verdict} First: {example.firstName}.
            </p>
          </section>
        ))}
        {/* Derived, not transcribed: this line renders only while every scenario still ranks the
            same clinician first, so the page never claims variety it has not earned
            (`honesty.claim-earned`). "Clinician", not "GP": most of the roster are not GPs. */}
        {sameFirstForAll ? (
          <p>All three land on the same clinician first: with {rosterSizeInWords()} listed, there are few orders to give.</p>
        ) : null}
        <p>The order is overlap between your words and what each GP declares, never a judgement of who is better.</p>
        <div className="prose-doors">
          <Link className="notfound-primary" href="/">Try it with your own words</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
    </>
  );
}
