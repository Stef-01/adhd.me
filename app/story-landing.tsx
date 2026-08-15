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
import { StorySequence } from "./story-sequence";

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
 * bottom leaves the top. One caller left — the hero figure — since the sequence took the
 * throughline and the pull-line and drives their motion from CSS instead.
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

  // The hero figure drifts UP against the copy — the classic depth cue, at a magnitude small
  // enough that it reads as depth rather than as an effect.
  const heroFigureY = useSectionParallax(heroRef, 44);

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
              Assessment, medication and follow-up with one GP. No psychiatrist queue to clear first.
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

      {/* ══ 2–8. THE SEQUENCE ═══════════════════════════════════════════════════════════════
          Six stacked bands became eight scrolled scenes. The beats they replaced said the same
          things — the shape of the alternative, the rule change, the wait, the cost, the
          throughline, the three steps — as a heading over a paragraph each, which is an argument
          set as a list. The sequence keeps every one of those claims and adds the half the page
          never had: what the search actually returns, what reading a practice page is like, and
          the questions a profile page never answers. See app/story-sequence.tsx for why the copy
          lives in the steps and the illustration is aria-hidden. */}
      <StorySequence />

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
