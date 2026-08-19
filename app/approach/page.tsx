// The scroll sequence, on its own route.
//
// WHY IT IS NOT ON THE LANDING PAGE ANY MORE. It was, and it cost the landing page the thing the
// landing page is for. Eight pinned scenes is roughly six screens of scrolling that a reader has
// to travel THROUGH to reach the founders and the form, and somebody who arrived ready to look
// for a GP now has an essay between them and the finder. The argument is good and it is not the
// first thing everybody needs.
//
// So the landing page is back to what it was — a claim, the change it rests on, what it costs,
// three steps, the founders, one form — and the sequence is a door at the foot of it, for the
// reader who wants the long version. Opt-in rather than compulsory.
//
// Nothing about the sequence itself changed. `StorySequence` renders identically here; it simply
// has a page of its own and a way back.

import Link from "next/link";
import { StorySequence } from "../story-sequence";

export const metadata = {
  alternates: { canonical: "/approach" },
  title: "The approach",
  description:
    "The search that returns no GPs, the practice pages read one doctor at a time, the questions " +
    "a profile page cannot answer, and what changed in NSW and Queensland.",
};

export default function ApproachPage() {
  return (
    <main className="story approach-page">
      <header className="story-header">
        <div className="story-wrap story-header-inner">
          <Link href="/" className="story-wordmark" aria-label="ADHD.ME home">ADHD.ME</Link>
          <Link href="/finder" className="story-demo-link">Find a GP</Link>
        </div>
      </header>

      <section className="approach-open">
        <div className="story-wrap">
          <p className="story-eyebrow">The ADHD.ME approach</p>
          <h1 className="story-heading approach-title">
            What finding ADHD care actually looks like, and what we changed.
          </h1>
          <p className="approach-lede">
            The long version, in eight scenes. It takes a few minutes to scroll. If you would
            rather skip it, the finder is the fastest way to a name and a date.
          </p>
          <div className="approach-actions">
            <Link className="story-primary-link" href="/finder">
              Find a GP near you<span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      <StorySequence />

      <section className="approach-close">
        <div className="story-wrap">
          <h2 className="story-heading">That is the whole argument.</h2>
          <p className="approach-lede">
            One GP, from the first appointment to the follow-up. You book with the practice on
            Healthengine, where the live times are.
          </p>
          <div className="approach-actions">
            <Link className="story-primary-link" href="/finder">
              Find a GP near you<span className="arrow" aria-hidden="true">→</span>
            </Link>
            <Link className="approach-back" href="/">Back to the front page</Link>
          </div>
        </div>
      </section>

      <footer className="story-footer">
        <div className="story-wrap story-footer-inner">
          <Link href="/" className="story-footer-wordmark">ADHD.ME</Link>
          <div className="story-footer-links">
            <a href="mailto:stefan.thottunkal@gmail.com">Contact</a>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
