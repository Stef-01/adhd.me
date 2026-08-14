"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode } from "react";
import Image from "next/image";
import { InterestForm } from "./interest-form";
import { CoverageMap } from "./coverage-map";

/**
 * A11Y-2 — WHY NOTHING HERE ANIMATES OPACITY.
 *
 * motion/react renders `initial` on the SERVER, and `useReducedMotion()` cannot read a media
 * query during SSR, so an `initial` containing `opacity: 0` ships as an inline style in the HTML.
 * The copy is then invisible until React hydrates, invisible permanently if the bundle never
 * arrives, and a reduced-motion reader still gets the entrance because the preference is only
 * honoured after mount. Everything here animates from a VISIBLE state instead: the slide-up and
 * its easing are unchanged, the opacity fade is gone. Any `opacity: 0` reintroduced into an
 * `initial` here brings the defect back, and e2e/landing.spec.ts fails on it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE PAGE IS FIVE SECTIONS AND IT USED TO BE EIGHT.
 *
 * The cut was the point rather than a side effect. The previous version argued its case in six
 * chapters: the queue, who the queue selects for, what changed, a throughline, what the product
 * is, and the founders. All of it was true and almost none of it was read, because a landing page
 * is a first impression and the argument now has ONE move: the rule changed in NSW, so the
 * appointment is reachable. Everything that supported the old, longer argument is gone rather
 * than shortened, since a shortened chapter is still a chapter.
 *
 * WHAT SURVIVED, AND WHY EACH ONE EARNS ITS SECTION:
 *   1. Hero        - the claim, in one sentence.
 *   2. The change  - the fact the whole product rests on. Without it the claim is marketing.
 *   3. How         - three lines, because "what do I actually do" is the next question.
 *   4. Founders    - two names, because a health product with anonymous founders is a red flag.
 *   5. Register    - the only action on the page.
 *
 * FOUNDER ACTION. The two founders are real people and their entries are ROLES, not biographies:
 * whatever Krish and Anubhav want said about themselves belongs in their own words, and inventing
 * it would put unverified claims about named clinicians on a public page. The NSW statement and
 * the figures in src/compliance/landing-copy.ts need confirming against the current guideline
 * before launch; they are written without false precision for that reason.
 *
 * No portraits. Nothing in this tree generates a face for a real person.
 */

/**
 * The three founders, with the affiliations that sit under each of them.
 *
 * `logo` points at a file in public/logos when there is one licensed to use, and is null
 * otherwise; the chip falls back to the institution's name set as a wordmark. That is deliberate
 * rather than a stopgap: a university mark is trademarked and not ours to copy off a website, so
 * the two we hold (both Stefan's, from his own work) render as images and the rest render as
 * names. Drop a licensed file in and set `logo` to swap it without touching the layout.
 *
 * `portrait` is null for two of the three for the same reason: nothing here generates a face for
 * somebody who has not supplied one.
 */
interface Affiliation {
  name: string;
  logo: string | null;
  href: string;
  /** Alt text and the accessible name of the link. */
  label: string;
}

const FOUNDERS: ReadonlyArray<{
  name: string;
  role: string;
  remit: string;
  portrait: string | null;
  affiliations: readonly Affiliation[];
}> = [
  {
    name: "Krish Ganesh",
    role: "Co-founder",
    remit: "What a person meets when they first look for help.",
    portrait: null,
    affiliations: [
      { name: "Bond University", logo: null, href: "https://bond.edu.au/", label: "Bond University" },
    ],
  },
  {
    name: "Dr Anubhav Saxena",
    role: "Co-founder, clinical",
    remit: "A documented baseline before anything starts, then follow-up on a schedule.",
    portrait: null,
    affiliations: [
      { name: "Beecroft", logo: null, href: "#", label: "Beecroft" },
      { name: "University of Sydney", logo: null, href: "https://www.sydney.edu.au/", label: "University of Sydney" },
    ],
  },
  {
    name: "Stefan Thottunkal",
    role: "Co-founder",
    remit: "Physician-in-training and health-systems researcher, Stanford Medicine.",
    portrait: "/stefan.png",
    affiliations: [
      {
        name: "NOURISH, Stanford Medicine",
        logo: "/nourish-logo.png",
        href: "https://med.stanford.edu/nourish-project.html",
        label: "NOURISH, Stanford Medicine",
      },
      {
        name: "Harvard T.H. Chan",
        logo: "/hsil-logo.png",
        href: "https://hsph.harvard.edu/research/health-systems-innovation-lab/team/#scholars",
        label: "Health Systems Innovation Lab, Harvard T.H. Chan School of Public Health",
      },
    ],
  },
];

const STEPS: ReadonlyArray<{ n: string; title: string; body: string }> = [
  { n: "01", title: "Say what you need", body: "In your words. Not a quiz, and not a score." },
  { n: "02", title: "See who is near you", body: "Specialised GPs, by suburb, care area and language." },
  { n: "03", title: "Book the first appointment", body: "Assessment, baseline checks and follow-up with one clinician." },
];

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 20 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = { hidden: { y: 16 }, show: { y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } } };

export function StoryLanding() {
  const reduce = useReducedMotion();

  return (
    <main className="story">
      <motion.header
        className="story-header"
        initial={reduce ? false : { y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="story-wrap story-header-inner">
          <Link href="/" className="story-wordmark" aria-label="ADHD.ME home">ADHD.ME</Link>
          <Link href="/finder" className="story-demo-link">Find a GP</Link>
        </div>
      </motion.header>

      {/* 1. The claim */}
      <section className="story-hero" aria-labelledby="story-hero-title">
        <motion.div
          className="story-wrap story-hero-copy"
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={stagger}
        >
          <motion.p className="story-eyebrow" variants={item}>Why we founded ADHD.ME</motion.p>
          <motion.h1 id="story-hero-title" variants={item}>
            ADHD care, start to finish, with one GP.
          </motion.h1>
          <motion.p className="story-hero-sub" variants={item}>
            Assessment, medication and follow-up with one GP. No psychiatrist queue to clear first.
          </motion.p>
          <motion.div className="story-hero-actions" variants={item}>
            <Link className="story-primary-link" href="/finder">Find a GP near you</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. The fact it rests on */}
      <section className="story-change" aria-labelledby="change-title">
        <div className="story-wrap story-change-grid">
          <Reveal>
            <h2 id="change-title" className="story-heading">The rule changed in NSW.</h2>
          </Reveal>
          <Reveal delay={0.06} className="story-prose">
            <p>
              GPs with the right training can now assess ADHD and manage it themselves.
              Psychiatry stays available for the complex cases. The queue stops being the
              default.
            </p>
            <p className="story-note">
              ADHD.ME lists the GPs who have done that training. Every one of them is a GP.
              ADHD is not a specialty on the register, and nobody here claims otherwise.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. What you actually do */}
      <section className="story-steps-section" aria-labelledby="steps-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="steps-title" className="story-heading">How it works</h2>
          </Reveal>
          <motion.ol
            className="story-steps"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            {STEPS.map((step) => (
              <motion.li key={step.n} variants={item}>
                <span className="story-step-n">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>

          <Reveal delay={0.12}>
            <CoverageMap />
          </Reveal>
        </div>
      </section>

      {/* 4. Who is behind it */}
      <section className="story-chapter" aria-labelledby="founders-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="founders-title" className="story-heading">Founders</h2>
          </Reveal>
          <motion.ul
            className="story-founders"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.25 }}
            variants={stagger}
          >
            {FOUNDERS.map((f) => (
              <motion.li key={f.name} variants={item}>
                <div className="story-founder-head">
                  {f.portrait ? (
                    <Image
                      className="story-founder-photo"
                      src={f.portrait}
                      alt={`${f.name}, co-founder of ADHD.ME`}
                      width={124}
                      height={124}
                    />
                  ) : (
                    <span className="story-founder-monogram" aria-hidden="true">
                      {f.name.replace(/^Dr\.?\s+/, "").split(" ").map((part) => part[0]).join("")}
                    </span>
                  )}
                  <div>
                    <strong>{f.name}</strong>
                    <span className="story-founder-role">{f.role}</span>
                  </div>
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
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* 5. The one action */}
      <section id="register" className="story-register" aria-labelledby="register-heading">
        <div className="story-wrap story-register-grid">
          <div>
            <h2 id="register-heading" className="story-heading">Be among the first.</h2>
            <p className="story-register-copy">
              We will tell you when the finder opens in your area.
            </p>
          </div>
          <InterestForm />
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
