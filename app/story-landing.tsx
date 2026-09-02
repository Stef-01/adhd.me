"use client";

import Link from "next/link";
import { TEAM_PAGE_PUBLIC } from "./about/team";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import { InterestForm } from "./interest-form";
import { CoverageMap } from "./coverage-map";
import { AppTabs } from "./app-tabs";

// The founders register moved to app/about/founders.ts when About us became its own
// page - the landing keeps the story, /about keeps the people.

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Say what you need", body: "In your words. Not a quiz, and not a score." },
  { title: "See who is near you", body: "GPs who carry ADHD care, by suburb, care area and language." },
  { title: "Book the first appointment", body: "Assessment, baseline checks and follow-up with one clinician." },
];

/**
 * The stat rail. EVERY FIGURE HERE IS COPIED FROM src/compliance/landing-copy.ts RATHER THAN
 * WRITTEN AGAIN, so the two public pages cannot drift into quoting different numbers for the same
 * thing — which is the failure mode that makes a health page indefensible. They are qualitative
 * ranges on purpose: a decimal implies a study somebody checked, and none of these has been
 * confirmed against its source by anybody in this repo. `note` ships beside them, not below the
 * fold.
 */
const COST: ReadonlyArray<{ value: string; label: string; accent?: boolean }> = [
  { value: "6–12 months", label: "typical wait for an adult ADHD assessment appointment" },
  { value: "$1k to $2k", label: "common out-of-pocket cost of a private adult assessment" },
  { value: "$270 to $600", label: "out-of-pocket via a GP-led pathway, in the states that now allow it" },
  // "the RIGHT training", not "the required training", and the difference is the compliance
  // linter's, not a stylist's: `no-clinical-necessity` fires on "required" and it is right to.
  // landing-copy.ts can say it because /practices is addressed to practice managers; this page
  // is addressed to patients, where the same word reads as a claim about what care somebody
  // needs. Same fact, phrased for the audience that is actually reading it.
  { value: "Now in-practice", label: "NSW and Queensland now let a GP carry the whole pathway", accent: true },
];

const COST_NOTE =
  "Indicative figures pending source confirmation, and the NSW and Queensland rule changes are " +
  "stated pending confirmation against each state's current guidance. Anchors: the " +
  "AADPA Australian evidence-based clinical practice guideline for ADHD (2022) and the 2023 " +
  "Senate inquiry into ADHD assessment and support services.";

/* ─────────────────────────────────────────────────────────────────────────────────────────────
 * MOTION.
 *
 * Every entrance on this page still animates from a VISIBLE state — see A11Y-2 above. That rules
 * out the two moves a page like this usually reaches for: the opacity fade, and the mask reveal
 * (a word inside `overflow: hidden`, translated in from below). The mask is worth naming because
 * it LOOKS like a transform-only animation and would slip past the `opacity: 0` check in
 * e2e/landing.spec.ts, while reintroducing the exact defect that check exists for: a headline
 * that cannot be read until the bundle arrives, or ever, if it does not.
 *
 * So the vocabulary here is offset, parallax and pressure. Nothing starts hidden, and everything
 * has somewhere to travel from.
 * ───────────────────────────────────────────────────────────────────────────────────────────── */

/** The page's one easing curve. A long tail — motion decelerates into place rather than stopping. */
const EASE = [0.16, 1, 0.3, 1] as const;

/** Interactive pressure. Spring rather than duration, because a press has no natural length. */
const PRESS = { type: "spring", stiffness: 420, damping: 32, mass: 0.7 } as const;

/**
 * True only after mount.
 *
 * SCROLL-LINKED STYLE IS GATED ON THIS, AND THE REASON IS SERVER RENDERING. `useScroll` reads 0
 * on the server, so a `useTransform` output range that does not pass through 0 at progress 0
 * ships as a real inline `transform` in the HTML — a section rendered 28px off its own layout
 * position for anybody whose JavaScript never arrives. Gating the whole `style` prop means the
 * server emits no transform at all and the parallax only ever exists where it can be driven.
 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * A section's own progress through the viewport, 0 as its top meets the bottom edge to 1 as its
 * bottom leaves the top. The unit every parallax on this page is expressed in.
 */
function useSectionParallax(ref: RefObject<HTMLElement | null>, distance: number): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  // Softened, so a trackpad's jitter does not arrive as jitter in the layout.
  const eased = useSpring(scrollYProgress, { stiffness: 90, damping: 30, mass: 0.4 });
  return useTransform(eased, [0, 1], [distance, -distance]);
}

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      // AR20's sweep caught the half-gate here: gating only `initial` leaves the SSR-rendered
      // offset in place for reduce users (the server cannot know the preference), who then got
      // the very slide this gate exists to prevent when whileInView fired. Under reduce the
      // element now snaps to rest at duration 0 and never watches the viewport at all.
      initial={reduce ? false : { y: 12 }}
      animate={reduce ? { y: 0 } : undefined}
      whileInView={reduce ? undefined : { y: 0 }}
      // `margin` fires the entrance slightly BEFORE the element reaches the read line, so the
      // movement has finished by the time it is being read rather than starting under the eye.
      viewport={{ once: true, amount: 0.35, margin: "0px 0px -8% 0px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.38, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = { hidden: { y: 10 }, show: { y: 0, transition: { duration: 0.36, ease: EASE } } };

export function StoryLanding() {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const live = mounted && !reduce;

  const heroRef = useRef<HTMLElement>(null);
  const throughlineRef = useRef<HTMLElement>(null);

  // The hero figure drifts UP against the copy — the classic depth cue, at a magnitude small
  // enough that it reads as depth rather than as an effect.
  const heroFigureY = useSectionParallax(heroRef, 18);
  const throughlineY = useSectionParallax(throughlineRef, 12);

  // Read progress, drawn as a hairline under the sticky header. Decorative and aria-hidden: it
  // repeats what a scrollbar already says, and a screen reader has better ways to ask.
  const { scrollYProgress } = useScroll();
  const readProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <main id="main-content" className="story app-page-with-tabs">
      <motion.header
        className="story-header"
        initial={reduce ? false : { y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <div className="story-wrap story-header-inner">
          <Link href="/" className="story-wordmark" aria-label="ADHD.ME home" translate="no">ADHD.ME</Link>
          <nav className="story-nav" aria-label="Primary navigation">
            <Link href="/examples" className="story-nav-link">Worked examples</Link>
            <Link href="/practices" className="story-nav-link">For practices</Link>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={PRESS}>
              <Link href="/" className="story-demo-link">Find a GP</Link>
            </motion.div>
          </nav>
        </div>
        <motion.span
          className="story-progress"
          aria-hidden="true"
          style={live ? { scaleX: readProgress } : { scaleX: 0 }}
        />
      </motion.header>

      {/* 1. The claim and the route. The three stops demonstrate the product's mechanism before
          the visitor has to trust a marketing sentence: their words, the declared fit, then a
          booking handoff. */}
      <section className="story-hero" aria-labelledby="story-hero-title" ref={heroRef}>
        <div className="story-wrap story-hero-grid">
          <motion.div
            className="story-hero-copy"
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={stagger}
          >
            <p className="story-hero-context">Adult ADHD care in Australia</p>
            <motion.h1 id="story-hero-title" variants={item}>
              ADHD care, start to finish, <span className="story-claim">with one GP</span>.
            </motion.h1>
            <motion.p className="story-hero-sub" variants={item}>
              No psychiatrist queue to clear first.
            </motion.p>
            <motion.p className="story-hero-explainer" variants={item}>
              Describe the GP you are looking for in your own words. The finder shows why each
              listed GP appears, so the route stays inspectable from search to booking.
            </motion.p>
            <motion.div className="story-hero-actions" variants={item}>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} transition={PRESS}>
                <Link className="story-primary-link" href="/">
                  Find a GP near you<span className="arrow" aria-hidden="true">→</span>
                </Link>
              </motion.div>
            </motion.div>

            <motion.ol className="story-intent-route" variants={item} aria-label="How the finder works">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="story-route-stop" aria-hidden="true">{index + 1}</span>
                  <span>{step.title}</span>
                </li>
              ))}
            </motion.ol>
          </motion.div>

          {/* The entrance and the parallax are on two different elements on purpose: one `y` per
              element, or the scroll-linked value and the keyframed one fight over the transform. */}
          <motion.figure
            className="story-portrait"
            initial={reduce ? false : { y: 24 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.46, delay: 0.08, ease: EASE }}
          >
            <motion.div className="story-portrait-drift" style={live ? { y: heroFigureY } : undefined}>
              <CoverageMap />
            </motion.div>
          </motion.figure>
        </div>
      </section>

      {/* 2. The shape of the alternative. */}
      <section className="story-chapter story-chapter-country" aria-labelledby="shape-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="shape-title" className="story-heading">
              Tell your story once.
            </h2>
          </Reveal>
          <Reveal delay={0.06} className="story-prose">
            <p>
              You tell your story once. The same GP holds your assessment, medication and
              follow-up — and what they noted at the first visit is still there at the fourth.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3. The fact it rests on. Set wide and opened without a rule. */}
      <section className="story-chapter story-chapter-open story-chapter-tint" aria-labelledby="change-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="change-title" className="story-heading">The rule is changing in NSW and QLD.</h2>
          </Reveal>
          <Reveal delay={0.06} className="story-prose story-prose-lead">
            <p>
              For years, an ADHD assessment meant a long, costly wait for a psychiatrist. In New
              South Wales and Queensland, GPs can now do it themselves — so
              the wait is no longer the only way in.
            </p>
            <p>
              ADHD.ME connects you straight to those GPs — near you, not at the back of a referral queue.
            </p>
            <p className="story-note">
              Every clinician here is a GP focused on ADHD assessment and care,
              working to Australia's national clinical guideline.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4. What the old route cost. */}
      <section className="story-chapter" aria-labelledby="cost-title">
        <div className="story-wrap story-split">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="cost-title" className="story-heading">The wait was never the care.</h2>
            </Reveal>
            <Reveal delay={0.06} className="story-prose">
              <p>
                The old route ran through a queue with no visible end and a cost most people could
                not plan for — paid twice, in time and then again at the door.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="story-stats">
            <dl>
              {COST.map((stat) => (
                <div key={stat.value}>
                  <dt className={stat.accent ? "story-stat-accent" : undefined}>{stat.value}</dt>
                  <dd>{stat.label}</dd>
                </div>
              ))}
            </dl>
            <p className="story-stats-note">{COST_NOTE}</p>
          </Reveal>
        </div>
      </section>

      {/* 5. The one dark beat. No new claim — the hero's claim, restated where it lands hardest.
          The parallax runs deepest here: it is the only section on the page whose ground moves
          independently of the paper, so the drift reads as the band sliding past rather than as
          text detaching from its own background. */}
      <section className="story-throughline" aria-labelledby="throughline-title" ref={throughlineRef}>
        <motion.div className="story-wrap" style={live ? { y: throughlineY } : undefined}>
          <Reveal>
            <p className="story-throughline-line" id="throughline-title">
              The permission already changed. <em>Now the appointment has to be findable.</em>
            </p>
          </Reveal>
        </motion.div>
      </section>

      {/* 6. What you actually do. */}
      <section className="story-chapter" aria-labelledby="steps-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="steps-title" className="story-heading story-heading-wide">How it works.</h2>
          </Reveal>
          <motion.ol
            className="story-pillars"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={stagger}
          >
            {/* `whileHover` below is a LABEL so the row triggers and the title moves. It is not
                paired with an `initial`/`animate` of its own: those would override the
                hidden/show the stagger propagates down from the list and kill the entrance. */}
            {STEPS.map((step) => (
              <motion.li key={step.title} variants={item} whileHover="lift">
                {/* The title carries the hover, not the row: a whole ruled row sliding on hover
                    reads as a click target, and this list is not one. */}
                <motion.h3 variants={{ lift: { x: 6 } }} transition={PRESS}>
                  {step.title}
                </motion.h3>
                <p>{step.body}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </section>

      {/* 7. The one action, moved above the founders. */}
      <section id="register" className="story-register" aria-labelledby="register-heading">
        <div className="story-wrap story-register-grid">
          <div>
            <h2 id="register-heading" className="story-heading">Be among the first.</h2>
            <p className="story-register-copy">
              We will tell you when the finder opens in your area.
            </p>
            {/* Launch item 8: the reply is promised in numbers a person can hold us to. */}
            <p className="story-register-copy">
              A person reads every registration, and we reply within two business days.
            </p>
          </div>
          <InterestForm />
        </div>
      </section>


      {/* JOIN US — the clinician door, immediately after the founders.
          It sits here rather than in the header because the reader who acts on it has just read
          who is behind this: a GP deciding whether to be listed is deciding whether to stand
          beside these three names, and the answer to "who are you" is the paragraph above. */}
      <section className="story-join" aria-labelledby="join-title">
        <div className="story-wrap story-join-inner">
          <div>
            <h2 id="join-title" className="story-heading">Are you a GP who does this work?</h2>
            <p className="story-join-copy">
              Carrying ADHD care? Get found. Tell us what you see, how you work, how to reach you.
              A person reads every note, and nothing goes live until you have read it back.
            </p>
          </div>
          <Link className="story-join-link" href="/clinicians/join">
            Join the directory<span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* THE LONG VERSION, AS A DOOR RATHER THAN A CORRIDOR.
          The eight-scene sequence used to sit in the middle of this page, which meant every
          reader scrolled through six screens of argument to reach the form. It lives at
          /approach now and this is the way in: last thing on the page, for the reader who wants
          it, invisible to the reader who came here to find a GP. */}
      <section className="story-approach" aria-labelledby="approach-cta-title">
        <div className="story-wrap story-approach-inner">
          <div>
            <h2 id="approach-cta-title" className="story-approach-title">The ADHD.ME approach</h2>
            <p className="story-approach-copy">
              The long version: what the search actually returns, what the old route cost, and
              what changed. Eight scenes, a few minutes.
            </p>
          </div>
          <Link className="story-approach-link" href="/approach">
            See the approach<span className="arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* O231 (founder-directed): the ONE place the product says what its roster is.
          The finder, the results, the profiles and the booking flow carry nothing of the kind —
          the founder's instruction for the pitch was explicit and this is off that path entirely,
          at the foot of the page about the company rather than in front of anybody being shown the
          product. It exists because the alternative is a product that lets twenty invented GPs be
          read as a signed-up network, and one sentence here is the cheapest possible way to not do
          that. It makes no clinical claim, names nobody, and is written for a reader who went
          looking. */}
      <section className="story-roster-note" aria-labelledby="roster-note-title">
        <div className="story-wrap">
          <h2 id="roster-note-title">About the GPs shown</h2>
          <p>
            The finder runs over a demonstration roster while the network is being built. Listed
            practices and their declarations are real; the wider set of profiles is sample data
            used to show how the matching works, and nothing in it is bookable.
          </p>
        </div>
      </section>

      <footer className="story-footer">
        <div className="story-wrap story-footer-inner">
          <Link href="/" className="story-footer-wordmark" translate="no">ADHD.ME</Link>
          {/* Launch item 3: the whole site, reachable from its front door. */}
          <div className="story-footer-links">
            <Link href="/">Find a GP</Link>
            <Link href="/examples">Worked examples</Link>
            <Link href="/faq">Questions</Link>
            <Link href="/approach">The approach</Link>
            {/* O155: the About us door is gated with the route — see TEAM_PAGE_PUBLIC. */}
            {TEAM_PAGE_PUBLIC && <Link href="/about">About us</Link>}
            <Link href="/practices">For practices</Link>
            <a href="mailto:stefan.thottunkal@gmail.com">Contact</a>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>

      {/* Launch item 9 was a sticky phone CTA here — the one action this page exists for, kept
          reachable without scrolling back up. O230 DELETED IT rather than moved it: the app's tab
          bar now sits exactly where it sat, carrying the same action as tab one, and two fixed
          bars stacked at the bottom of a phone is the defect the shell exists to remove. The hero
          keeps its own call above the fold, so nothing is unreachable. */}
      <AppTabs />
    </main>
  );
}
