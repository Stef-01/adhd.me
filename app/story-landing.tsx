"use client";

import Link from "next/link";
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
 * THE PAGE IS SEVEN BEATS AND IT USED TO BE FIVE BANDS.
 *
 * The five-section cut was right about WHAT to say and had nothing to say it with: five stacked
 * full-width bands, each a heading over a paragraph, is an argument set as a list. The argument
 * has not changed and no claim has been added — the beats below are the same five points plus
 * two that carry no new assertion (a stat rail quoting figures already in
 * src/compliance/landing-copy.ts, and one dark band restating the hero's claim). What changed is
 * that the page now has a RHYTHM: wide, split-reversed, split, inverted, ruled list, portraits,
 * form. Nothing sits at the same width as the thing above it, which is the entire reason it
 * reads as a page rather than as a stack.
 *
 *   1. Hero        - the claim, in one sentence, beside the coverage diagram.
 *   2. The shape   - one GP end to end, against a pull-line.
 *   3. The change  - the fact the whole product rests on. Without it the claim is marketing.
 *   4. The cost    - what the old route cost, as indicative figures with their own disclaimer.
 *   5. Throughline - the one dark beat. The permission changed; the appointment must be findable.
 *   6. How         - three lines, because "what do I actually do" is the next question.
 *   7. Register    - the only action on the page, placed before the founders.
 *   8. Founders    - three names, because a health product with anonymous founders is a red flag.
 *
 * FOUNDER ACTION. The three founders are real people and their entries are ROLES, not
 * biographies: whatever Vikram and Anubhav want said about themselves belongs in their own words,
 * and inventing it would put unverified claims about named clinicians on a public page. The NSW
 * AND QUEENSLAND rule statements and the figures in src/compliance/landing-copy.ts need confirming
 * against each state's current guideline before launch; they are written without false precision
 * for that reason, and the stat rail carries that qualification directly under it rather than in a
 * footer.
 *
 * ALL THREE PORTRAITS ARE NOW SUPPLIED, AND THE MONOGRAM FALLBACK STAYS ANYWAY. Nothing in this
 * tree generates a face for a real person: each of these is a photograph its subject handed over,
 * cut out against the paper with the system subject-mask model rather than keyed off the studio
 * backdrop, and framed to a shared 3:4 so the three heads sit on one line. `portrait: null` still
 * renders a monogram at the same size, because the next founder or advisor added here will not
 * have handed one over on the day they are added.
 */

/**
 * The three founders, with the affiliations that sit under each of them.
 *
 * `logo` points at a file in public/ when there is one licensed to use, and is null otherwise;
 * the entry falls back to the institution's name set as a wordmark. That is deliberate rather
 * than a stopgap: a university mark is trademarked and not ours to copy off a website, so the two
 * we hold (both Stefan's, from his own work) render as images and the rest render as names. Drop
 * a licensed file in and set `logo` to swap it without touching the layout.
 *
 * `portrait` is null only where no photograph has been supplied: nothing here generates a face for
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
    name: "Vikram Ganeshalingam",
    role: "Co-founder",
    remit: "What a person meets when they first look for help.",
    portrait: "/vikram.png",
    affiliations: [
      { name: "Final-year MD candidate, Bond University", logo: null, href: "https://bond.edu.au/", label: "Final-year MD candidate, Bond University" },
    ],
  },
  {
    name: "Dr Anubhav Saxena",
    role: "Co-founder, MBBS, FRACGP",
    remit: "A documented baseline before anything starts, then follow-up on a schedule.",
    portrait: "/anubhav-saxena.png",
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

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Say what you need", body: "In your words. Not a quiz, and not a score." },
  { title: "See who is near you", body: "GPs who have done the training, by suburb, care area and language." },
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
  { value: "Now in-practice", label: "NSW and Queensland now let a GP with the right training carry the whole pathway", accent: true },
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
      initial={reduce ? false : { y: 20 }}
      whileInView={{ y: 0 }}
      // `margin` fires the entrance slightly BEFORE the element reaches the read line, so the
      // movement has finished by the time it is being read rather than starting under the eye.
      viewport={{ once: true, amount: 0.35, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item: Variants = { hidden: { y: 16 }, show: { y: 0, transition: { duration: 0.55, ease: EASE } } };
/** The founders' plates travel further and land slower — they are the heaviest objects on the page. */
const plate: Variants = { hidden: { y: 28 }, show: { y: 0, transition: { duration: 0.8, ease: EASE } } };

/** "Dr Anubhav Saxena" -> "AS". The honorific is not an initial. */
function monogram(name: string): string {
  return name
    .replace(/^Dr\.?\s+/, "")
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export function StoryLanding() {
  const reduce = useReducedMotion();
  const mounted = useMounted();
  const live = mounted && !reduce;

  const heroRef = useRef<HTMLElement>(null);
  const throughlineRef = useRef<HTMLElement>(null);
  const pullRef = useRef<HTMLElement>(null);

  // The hero figure drifts UP against the copy — the classic depth cue, at a magnitude small
  // enough that it reads as depth rather than as an effect.
  const heroFigureY = useSectionParallax(heroRef, 44);
  const throughlineY = useSectionParallax(throughlineRef, 34);
  const pullY = useSectionParallax(pullRef, 26);

  // Read progress, drawn as a hairline under the sticky header. Decorative and aria-hidden: it
  // repeats what a scrollbar already says, and a screen reader has better ways to ask.
  const { scrollYProgress } = useScroll();
  const readProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <main className="story">
      <motion.header
        className="story-header"
        initial={reduce ? false : { y: -10 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="story-wrap story-header-inner">
          <Link href="/" className="story-wordmark" aria-label="ADHD.ME home">ADHD.ME</Link>
          <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={PRESS}>
            <Link href="/finder" className="story-demo-link">Find a GP</Link>
          </motion.div>
        </div>
        <motion.span
          className="story-progress"
          aria-hidden="true"
          style={live ? { scaleX: readProgress } : { scaleX: 0 }}
        />
      </motion.header>

      {/* 1. The claim, beside the only honest figure this page has. */}
      <section className="story-hero" aria-labelledby="story-hero-title" ref={heroRef}>
        <div className="story-wrap story-hero-grid">
          <motion.div
            className="story-hero-copy"
            initial={reduce ? false : "hidden"}
            animate="show"
            variants={stagger}
          >
            <motion.p className="story-eyebrow" variants={item}>Why we founded ADHD.ME</motion.p>
            <motion.h1 id="story-hero-title" variants={item}>
              ADHD care, start to finish, <span className="story-claim">with one GP</span>.
            </motion.h1>
            <motion.p className="story-hero-sub" variants={item}>
              Everything from assessment to follow-up, all with one GP. No psychiatrist queue to clear first.
            </motion.p>
            <motion.div className="story-hero-actions" variants={item}>
              <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.98 }} transition={PRESS}>
                <Link className="story-primary-link" href="/finder">
                  Find a GP near you<span className="arrow" aria-hidden="true">→</span>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* The entrance and the parallax are on two different elements on purpose: one `y` per
              element, or the scroll-linked value and the keyframed one fight over the transform. */}
          <motion.figure
            className="story-portrait"
            initial={reduce ? false : { y: 24 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
          >
            <motion.div className="story-portrait-drift" style={live ? { y: heroFigureY } : undefined}>
              <CoverageMap />
            </motion.div>
          </motion.figure>
        </div>
      </section>

      {/* 2. The shape of the alternative, against a pull-line. */}
      <section className="story-chapter" aria-labelledby="shape-title" ref={pullRef}>
        <div className="story-wrap story-split story-split-reverse">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="shape-title" className="story-heading">
                One GP, from the first appointment to the follow-up.
              </h2>
            </Reveal>
            <Reveal delay={0.06} className="story-prose">
              <p>
                Nobody should have to tell their story twice to get through a door. One clinician
                holds the assessment, the medication and the follow-up, and what they wrote down
                in the first appointment is still there in the fourth.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="story-pull">
            <motion.p style={live ? { y: pullY } : undefined}>
              Care that fits the person in front of it.
            </motion.p>
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
              South Wales and Queensland, GPs with the right training can now do it themselves — so
              the wait is no longer the only way in.
            </p>
            <p>
              That gap is what ADHD.ME closes. We connect you straight to those GPs, so assessment
              and follow-up start with one clinician near you — not at the back of a referral queue.
            </p>
            <p className="story-note">
              Every clinician here is a GP with dedicated training in ADHD assessment and care,
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
                The old route ran through a queue with no visible end and a cost most people
                could not plan for. Some waited it out. Most of them paid for it twice, in time
                and then again at the door.
              </p>
              <p>
                None of that waiting made the care better. It only made it later.
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
          <Reveal delay={0.08} className="story-throughline-sub">
            <p>
              A rule that nobody can act on is a rule that did not change anything. ADHD.ME exists
              to close that last gap: from the change on paper to a GP near you, with a date.
            </p>
          </Reveal>
        </motion.div>
      </section>

      {/* 6. What you actually do. */}
      <section className="story-chapter" aria-labelledby="steps-title">
        <div className="story-wrap">
          <Reveal className="story-eyebrow-block">
            <p className="story-eyebrow">What ADHD.ME is</p>
          </Reveal>
          <Reveal delay={0.04}>
            <h2 id="steps-title" className="story-heading story-heading-wide">How it works, end to end.</h2>
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
          </div>
          <InterestForm />
        </div>
      </section>

      {/* 8. Who is behind it. */}
      <section className="story-chapter" aria-labelledby="founders-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="founders-title" className="story-heading">We do not build this alone.</h2>
          </Reveal>
          <Reveal delay={0.06} className="story-prose">
            <p>
              Three people, one conviction: care lands better when it is built around the person in
              front of it, their language and their family.
            </p>
          </Reveal>

          <motion.ul
            className="story-founders"
            initial={reduce ? false : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={stagger}
          >
            {FOUNDERS.map((f) => (
              <motion.li key={f.name} variants={plate} whileHover="lift">
                <motion.div
                  className="story-founder-plate"
                  variants={{ lift: { y: -8 } }}
                  transition={PRESS}
                >
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
                </motion.div>

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
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* JOIN US — the clinician door, immediately after the founders.
          It sits here rather than in the header because the reader who acts on it has just read
          who is behind this: a GP deciding whether to be listed is deciding whether to stand
          beside these three names, and the answer to "who are you" is the paragraph above. */}
      <section className="story-join" aria-labelledby="join-title">
        <div className="story-wrap story-join-inner">
          <div>
            <p className="story-eyebrow">Join us</p>
            <h2 id="join-title" className="story-heading">Are you a GP who does this work?</h2>
            <p className="story-join-copy">
              Done the NSW or Queensland training? Get found. One sitting — what you see, how you
              work, how to reach you. A person reads every application, and nothing goes live until
              you have read it back.
            </p>
          </div>
          <Link className="story-join-link" href="/clinicians/join">
            Start onboarding<span className="arrow" aria-hidden="true">→</span>
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
