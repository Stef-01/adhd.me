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
import { careArchetypes } from "@/demo/care-archetypes";
import { matchQuality, needsFor, rankClinicians } from "@/demo/clinicians";
import { rosterSizeInWords } from "@/demo/roster-size";
import { Breadcrumbs } from "../breadcrumbs";
import { SiteFooter } from "../site-footer";
import { PublicHeader } from "../public-header";

export const metadata: Metadata = seoMetadata("/examples");

export default function ExamplesPage() {
  const examples = careArchetypes.slice(0, 3).map((archetype) => {
    const understood = needsFor(archetype.request).length;
    const quality = matchQuality(archetype.request);
    return {
      headline: archetype.headline,
      understood,
      /*
        O203: THE FULL NAME, NOT `shortName`. Both GPs on this roster are Saxena, so the roster
        disambiguates hers ("Dr Anusha Saxena") and leaves his as the bare surname ("Dr Saxena") —
        fine in a result row read one at a time, and on this page it produced THREE lines all
        reading "Shown first: Dr Saxena", leaving a reader unable to tell whether that was one
        doctor three times or two different people. O192 round 5 made exactly this ruling on the
        network deck; it applies wherever names appear together.
      */
      firstName: rankClinicians(archetype.request)[0]!.name,
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

  /** Derived: do the scenarios above actually demonstrate different outcomes, or the same one? */
  const sameFirstForAll =
    examples.length > 1 && new Set(examples.map((e) => e.firstName)).size === 1;

  return (
    <>
    <PublicHeader />
    <main id="main-content" className="prose-screen">
      <div className="prose-wrap">
        <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Worked examples", href: "/examples" }]} />
        <h1>Worked examples</h1>
        <p className="prose-note">
          These are demo scenarios, not patients — nobody’s story is used to sell anything here.
          Each result below is computed live by the same matching the finder runs, so this page
          shows what the product actually does, not what a brochure says it does.
        </p>
        {/*
          O203: "From that request" USED TO HAVE NO ANTECEDENT. No request appeared anywhere on the
          page — a reader met a headline, which is not a request, and then a sentence referring to
          "that request" as though they had read one.

          The fix is not to print the request. The page's header records why: a first draft rendered
          the demo requests verbatim and the rendered-copy sweep REFUSED the page, because those
          sentences carry clinical vocabulary a patient-facing page may not repeat. That control is
          working. So the constraint gets disclosed instead of hidden, which is the more honest
          version of the same page rather than a softer one.
        */}
        <p className="prose-note">
          The scenarios themselves are not printed here: they are written as somebody would really
          say them, and a public page may not repeat that language. What is printed is what the
          finder made of them.
        </p>
        {examples.map((example) => (
          <section key={example.headline} className="example-item">
            <h2>{example.headline}</h2>
            <p>
              {/*
                O203: "From that request," is gone rather than reworded. With the constraint
                disclosed above, the phrase was doing nothing but pointing at something the reader
                still cannot see — and the sentence reads better without it.
              */}
              The finder read <strong>{example.understood}</strong>{" "}
              {example.understood === 1 ? "thing" : "things"} the person asked for —{" "}
              {example.verdict}. Shown first: {example.firstName}.
            </p>
          </section>
        ))}
        {/*
          O203: THE SAMENESS IS STATED RATHER THAN LEFT TO LOOK LIKE VARIETY. Measured before this
          sentence was written: all three scenarios currently rank the same GP first and produce the
          same order — the only thing that differs between them is how many asks the finder read.
          Three sections that look like three demonstrations, when they are one demonstration run
          three times, is the page overstating itself; `honesty.claim-earned` says a page may only
          claim what it has earned. Derived, not transcribed, so the day a third GP joins and the
          orders diverge this sentence stops appearing on its own.
        */}
        {sameFirstForAll ? (
          <p>
            All three land on the same GP first, and that is what a roster this size looks like
            rather than a finding about anybody: with {rosterSizeInWords()} listed GPs there are
            not many orders available. What differs above is how much of each request the finder
            read.
          </p>
        ) : null}
        <p>
          The order is never a judgement about who is a better doctor. It is overlap between what
          you asked for and what each GP declares about their own work — and when your words do
          not separate the list, the finder tells you that in as many words.
        </p>
        <div className="prose-doors">
          <Link className="notfound-primary" href="/">Try it with your own words</Link>
        </div>
      </div>
      <SiteFooter />
    </main>
    </>
  );
}
