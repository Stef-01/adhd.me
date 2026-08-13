"use client";

import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from "motion/react";
import { useRef, type ReactNode } from "react";
import { InterestForm } from "./interest-form";

/**
 * A11Y-2 — WHY NOTHING HERE ANIMATES OPACITY.
 *
 * motion/react renders `initial` on the SERVER, and `useReducedMotion()` cannot read a media
 * query during SSR, so an `initial` containing `opacity: 0` ships as an inline style in the
 * HTML. This page did that on 24 elements, including the `<h1>`. The copy was then invisible
 * until React hydrated, invisible permanently if the bundle never arrived, and a reduced-motion
 * reader still got the entrance because the preference is only honoured after mount.
 *
 * The chosen fix is to animate from a VISIBLE state: the slide-up and its easing are unchanged,
 * the opacity fade is gone. It is the only option that holds in every failure mode — a mounted
 * flag would suppress the animation entirely (motion reads `initial` once, so flipping it after
 * mount does nothing), and a `<noscript>` override rescues scripting-disabled readers but not a
 * bundle that fails to load.
 *
 * THE TRADE IS REAL AND IS A DESIGN CALL, SO IT IS WRITTEN DOWN RATHER THAN BURIED: this page
 * loses its fade. The judgement is that a health product's landing copy must be readable when
 * the JavaScript is not, and a slide without a fade is a smaller loss than a blank page. Any
 * `opacity: 0` reintroduced into an `initial` or a `hidden` variant here brings the defect back,
 * and e2e/landing.spec.ts fails on it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE STORY, AND WHY IT ARGUES INSTEAD OF REMINISCING.
 *
 * The page this was adapted from was a founder's biography: a named clinic, a named prize, a
 * named honours project, a personal diagnosis. That shape only works when every specific is
 * true, and both founders here are real people whose specifics are theirs to state. So this
 * version carries the ARGUMENT rather than a CV — the structural reason ADHD assessment in
 * Australia fails people, which is documented and needs nobody's biography to be true.
 *
 * FOUNDER ACTION, AND THE ONLY PLACE THIS PAGE IS DELIBERATELY THIN: the two `FOUNDER_BIO`
 * entries below are roles, not biographies. Whatever Krish and Anubhav want said about
 * themselves — training, institutions, why this problem — belongs in their own words, and
 * inventing it here would put unverified claims about named clinicians on a public page. The
 * numbers in the hero card and in src/compliance/landing-copy.ts need the same check: every one
 * is sourced, none has been confirmed against the live source by anybody in this repo.
 *
 * No portraits. Nothing in this tree generates a face for a real person, so the founders are set
 * typographically until they supply photographs — see also ClinicianPortrait in app/care-finder.tsx.
 */

/** The structural facts the hero card renders. Each needs source confirmation before launch. */
const ASSESSMENT_GAP: ReadonlyArray<{ figure: string; detail: string }> = [
  { figure: "Referral-gated", detail: "the adult pathway has largely run through psychiatry, and there is not enough of it" },
  { figure: "Months to years", detail: "typical wait for an adult assessment appointment" },
  { figure: "Thousands", detail: "common out-of-pocket cost of going privately instead" },
  { figure: "State by state", detail: "what a GP is allowed to do for you changes at the border" },
];

/**
 * The founders, as roles. Bios are deliberately absent — see the FOUNDER ACTION note above.
 */
const FOUNDERS: ReadonlyArray<{ name: string; role: string; remit: string }> = [
  {
    name: "Krish Ganesh",
    role: "Co-founder",
    remit:
      "Works on the part of this that is not clinical: what a person meets when they first look for help, and whether it meets them as somebody worth assessing properly.",
  },
  {
    name: "Dr Anubhav Saxena",
    role: "Co-founder, clinical",
    remit:
      "Brings the measurement discipline from metabolic medicine to assessment: a documented baseline before anything starts, and follow-up at set intervals rather than when a problem gets loud enough to prompt a call.",
  },
];

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 26 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};
const item: Variants = {
  hidden: { y: 18 },
  show: { y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export function StoryLanding() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);
  // Gentle parallax: the hero card drifts up slightly as the hero scrolls away.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const cardY = useTransform(scrollYProgress, [0, 1], [0, -56]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -20]);

  return (
    <main className="story">
      <motion.header
        className="story-header"
        initial={reduce ? false : { y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="story-wrap story-header-inner">
          <Link href="/" className="story-wordmark" aria-label="ADHD.ME home">
            ADHD.ME
          </Link>
          <Link href="/finder" className="story-demo-link">
            Early demo
          </Link>
        </div>
      </motion.header>

      {/* Hero: asymmetric split, the argument on the left and the shape of the gap on the right */}
      <section ref={heroRef} className="story-hero" aria-labelledby="story-hero-title">
        <div className="story-wrap story-hero-grid">
          <motion.div
            className="story-hero-copy"
            style={reduce ? undefined : { y: copyY }}
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={stagger}
          >
            <motion.p className="story-eyebrow" variants={item}>
              Why we founded ADHD.ME
            </motion.p>
            <motion.h1 id="story-hero-title" variants={item}>
              Getting assessed for ADHD in Australia is a test of stamina, not of need.
            </motion.h1>
            <motion.p className="story-hero-sub" variants={item}>
              The people who clear it are the ones who can afford to. That is a design choice
              somebody made, which means it is one somebody can change.
            </motion.p>
            <motion.div className="story-hero-actions" variants={item}>
              <motion.a
                className="story-primary-link"
                href="#register"
                whileHover={reduce ? undefined : { y: -2 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 24 }}
              >
                Register interest
              </motion.a>
            </motion.div>
          </motion.div>

          {/* Outer figure carries the scroll parallax; the inner div owns the entrance slide so
              the two y-drivers never fight. No opacity in `initial` anywhere on this page. */}
          <motion.figure
            className="story-gap-card"
            style={reduce ? undefined : { y: cardY }}
          >
            <motion.div
              initial={reduce ? false : { y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <figcaption>The shape of the gap</figcaption>
              <dl>
                {ASSESSMENT_GAP.map((entry) => (
                  <div key={entry.figure}>
                    <dt>{entry.figure}</dt>
                    <dd>{entry.detail}</dd>
                  </div>
                ))}
              </dl>
            </motion.div>
          </motion.figure>
        </div>
      </section>

      {/* Chapter 01: the pattern */}
      <section className="story-chapter story-chapter-open" aria-labelledby="ch1-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="ch1-title" className="story-heading">
              The same conversation keeps happening in the same order.
            </h2>
          </Reveal>
          <Reveal delay={0.05} className="story-prose story-prose-lead">
            <p>
              Somebody finally asks the question out loud. They are told they will need a
              psychiatrist. They discover what that costs and how long the list is. They are
              handed a number to call in six months, and the thing that made them ask in the
              first place goes back to being a personal failing they are managing alone.
            </p>
            <p>
              Almost nothing in that sequence is a clinical judgement. It is a queue.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 02: who the queue selects for */}
      <section className="story-chapter" aria-labelledby="ch2-title">
        <div className="story-wrap story-split">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="ch2-title" className="story-heading">
                A queue is never neutral about who gets through it.
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="story-prose">
              <p>
                Clearing this one takes money, several months of persistence, the confidence to
                hold your ground in a consulting room, and enough English and spare time to keep
                chasing it. Those are not symptoms. They are advantages.
              </p>
              <p>
                So the people who get assessed are systematically not the people who most need
                it — and the ones who fall out are the ones already carrying a diagnosis of
                anxiety, or a reputation for being difficult, or a family who thinks the whole
                idea is imported nonsense. They do not present again. They conclude they were
                wrong to ask.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="story-pull">
            <p>
              The barrier is not scepticism about ADHD. It is that the front door was built for
              somebody with more resources than most people have.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 03: what has actually changed */}
      <section className="story-chapter" aria-labelledby="ch3-title">
        <div className="story-wrap story-split story-split-reverse">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="ch3-title" className="story-heading">
                What changed is that general practice is now allowed to help.
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="story-prose">
              <p>
                Australia now has its own evidence-based ADHD guideline, a Senate inquiry that
                said plainly that assessment is too slow and too expensive, and states that have
                begun letting GPs take on more of this work rather than only referring it onward.
              </p>
              <p>
                None of that takes psychiatry out of the picture, and it should not. What it does
                is make the first appointment reachable — and put the follow-up, the baseline
                checks and the dose adjustments with the clinician a person can actually get back in
                to see.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="story-pull">
            <p>
              The permission arrived before the pathway did. Building the pathway is the work.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 04: the through-line, dark ground */}
      <section className="story-throughline" aria-labelledby="through-title">
        <div className="story-wrap">
          <Reveal>
            <p id="through-title" className="story-throughline-line">
              Every part of this is the same problem wearing a different face. A door that only
              opens for <em>the person who can push hardest.</em>
            </p>
          </Reveal>
          <Reveal delay={0.08} className="story-throughline-sub">
            <p>
              The adult who was called lazy for thirty years. The child whose school gave up
              first. The woman whose coping stopped working and was offered another
              antidepressant. At some point you stop waiting for the queue to fix itself.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 05: what the product is */}
      <section className="story-chapter" aria-labelledby="product-title">
        <div className="story-wrap">
          <Reveal className="story-eyebrow-block">
            <p className="story-eyebrow">What ADHD.ME is</p>
          </Reveal>
          <Reveal>
            <h2 id="product-title" className="story-heading story-heading-wide">
              ADHD.ME is how you find a GP who does this work.
            </h2>
          </Reveal>

          <motion.ol
            className="story-pillars"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
          >
            <motion.li variants={item}>
              <h3>Say it in your own words</h3>
              <p>Describe what you need looked at and how you want to be treated. Not a quiz, and not a score — nothing here tells you whether you have ADHD.</p>
            </motion.li>
            <motion.li variants={item}>
              <h3>A GP who does this work</h3>
              <p>Matched on what clinicians say they see often, your language, and whether the practice is one you can physically get to.</p>
            </motion.li>
            <motion.li variants={item}>
              <h3>The follow-up, not just the first visit</h3>
              <p>Baseline checks before anything starts, and dose adjustments on a schedule — the half of assessment that usually gets dropped.</p>
            </motion.li>
          </motion.ol>
        </div>
      </section>

      {/* Chapter 06: the founders */}
      <section className="story-chapter" aria-labelledby="founders-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="founders-title" className="story-heading">
              We do not build this alone.
            </h2>
          </Reveal>

          <motion.ul
            className="story-founders"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
          >
            {FOUNDERS.map((founder) => (
              <motion.li key={founder.name} variants={item}>
                <span className="story-founder-monogram" aria-hidden="true">
                  {founder.name.replace(/^Dr\.?\s+/, "").split(" ").map((part) => part[0]).join("")}
                </span>
                <div>
                  <strong>{founder.name}</strong>
                  <span className="story-founder-role">{founder.role}</span>
                  <p>{founder.remit}</p>
                </div>
              </motion.li>
            ))}
          </motion.ul>

          <Reveal delay={0.1} className="story-prose">
            <p>
              Dr Saxena also sees patients through this directory. He is listed in it like any
              other clinician, and every listing of his carries that disclosure — because a
              founder appearing in his own company&rsquo;s directory is a conflict whether or not
              the ranking favours him, and you cannot see the ranking.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="story-register" aria-labelledby="register-heading">
        <div className="story-wrap story-register-grid">
          <div>
            <h2 id="register-heading" className="story-heading">
              Be among the first to try it.
            </h2>
            <p className="story-register-copy">
              Hear when the finder opens in your area, or when the first assessment appointments
              become available.
            </p>
          </div>
          <InterestForm />
        </div>
      </section>

      <footer className="story-footer">
        <div className="story-wrap story-footer-inner">
          <Link href="/" className="story-footer-wordmark">
            ADHD.ME
          </Link>
          <div className="story-footer-links">
            <a href="mailto:stefan.thottunkal@gmail.com">Contact</a>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
