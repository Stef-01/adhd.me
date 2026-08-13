"use client";

import Link from "next/link";
import Image from "next/image";
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
 * The founder storybook: a first-person account, in Narayani's voice, of the
 * logical progression from overlooked women -> lymphoedema research -> VR rehab
 * -> Meherr. One desktop-optimised page with scroll-revealed chapters.
 *
 * Portrait: /narayani.png is a background-removed cut-out sitting on the paper.
 */
const PORTRAIT_SRC = "/narayani.png";

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
  // Gentle parallax: the portrait drifts up slightly as the hero scrolls away.
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, -56]);
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
          <Link href="/" className="story-wordmark" aria-label="Meherr home">
            Meherr
          </Link>
          <Link href="/finder" className="story-demo-link">
            Early demo
          </Link>
        </div>
      </motion.header>

      {/* Hero: asymmetric split, portrait cut-out on paper */}
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
              Why I founded Meherr
            </motion.p>
            <motion.h1 id="story-hero-title" variants={item}>
              For years I met women the system overlooked. Then I understood I was one of them.
            </motion.h1>
            <motion.p className="story-hero-sub" variants={item}>
              The short version of how a lymphoedema clinic, a VR headset and my own diagnosis
              led me here.
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

          {/* Outer figure carries the scroll parallax; the inner div owns the
              entrance slide so the two y-drivers never fight. No opacity in
              `initial` anywhere on this page (A11Y-2 above). */}
          <motion.figure
            className="story-portrait"
            style={reduce ? undefined : { y: portraitY }}
          >
            <motion.div
              initial={reduce ? false : { y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src={PORTRAIT_SRC}
                alt="Narayani, founder of Meherr"
                width={439}
                height={610}
                priority
                sizes="(min-width: 900px) 40vw, 78vw"
                className="story-portrait-img"
              />
            </motion.div>
          </motion.figure>
        </div>
      </section>

      {/* Chapter 01: the pattern that kept repeating */}
      <section className="story-chapter story-chapter-open" aria-labelledby="ch1-title">
        <div className="story-wrap">
          <Reveal>
            <h2 id="ch1-title" className="story-heading">
              The same story kept repeating in front of me.
            </h2>
          </Reveal>
          <Reveal delay={0.05} className="story-prose story-prose-lead">
            <p>
              In my family the symptoms ran through every generation. My mother had them too,
              so we assumed this was simply how the women in our family were built.
            </p>
            <p>
              It took me years to learn that what felt normal was PMOS, the condition long known
              as PCOS, going unnamed. Around half the women who have it never find out. I could
              not stop noticing how often the answer was there, just never offered.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 02: lymphoedema research + PACE prize */}
      <section className="story-chapter" aria-labelledby="ch2-title">
        <div className="story-wrap story-split">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="ch2-title" className="story-heading">
                So I went to where care actually breaks.
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="story-prose">
              <p>
                At Macquarie&rsquo;s ALERT lymphoedema clinic I worked inside a multidisciplinary
                team on women&rsquo;s recovery before and after surgery. Lymphoedema is a condition
                women are quietly expected to live with: stigmatised, brushed off as cosmetic, when
                it changes how a woman dresses, works, moves and feels in her own body.
              </p>
              <p>
                Tracking dermal backflow pulled me into the measurement side of that gap, and
                opened the door to lymphoedema device innovation. I rebuilt how our recovery data
                was kept, and the work was recognised. What stayed with me was how much good care
                quietly depends on one person caring enough to get the details right.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="story-stats">
            <motion.dl
              initial={reduce ? false : "hidden"}
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={stagger}
            >
              <motion.div variants={item}>
                <dt>~20%</dt>
                <dd>more complete recovery datasets</dd>
              </motion.div>
              <motion.div variants={item}>
                <dt>30 to 35%</dt>
                <dd>fewer documentation errors</dd>
              </motion.div>
              <motion.div variants={item}>
                <dt className="story-stat-award">PACE Prize</dt>
                <dd>2024 Professor Judyth Sachs award, for placement excellence</dd>
              </motion.div>
            </motion.dl>
          </Reveal>
        </div>
      </section>

      {/* Chapter 03: VR rehab + USYD honours + scholarship */}
      <section className="story-chapter" aria-labelledby="ch3-title">
        <div className="story-wrap story-split story-split-reverse">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="ch3-title" className="story-heading">
                Then I followed the question into rehabilitation.
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="story-prose">
              <p>
                For my honours year at the University of Sydney I designed, built and evaluated a
                virtual-reality supermarket: a safe place to relearn how to move through the world
                after a stroke or vision loss. I built it with Guide Dogs Australia and tested it
                with the people who would actually use it. It earned first-class honours and a
                University of Sydney scholarship.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="story-pull">
            <p>
              Technology is only worth building when it bends around the person, not the other way
              around.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 04: the through-line, dark ground */}
      <section className="story-throughline" aria-labelledby="through-title">
        <div className="story-wrap">
          <Reveal>
            <p id="through-title" className="story-throughline-line">
              Every project was the same problem wearing a different face. Care that never quite fit
              the <em>person in front of it.</em>
            </p>
          </Reveal>
          <Reveal delay={0.08} className="story-throughline-sub">
            <p>
              Lymphoedema patients. Stroke survivors. And South Asian women, like me, whose bodies
              were treated as a footnote. At some point I stopped waiting for the system to notice
              them.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Chapter 05: Meherr, and Stefan */}
      <section className="story-chapter" aria-labelledby="meherr-title">
        <div className="story-wrap">
          <Reveal className="story-eyebrow-block">
            <p className="story-eyebrow">What Meherr is</p>
          </Reveal>
          <Reveal>
            <h2 id="meherr-title" className="story-heading story-heading-wide">
              Meherr helps South Asian women in Western Sydney find answers earlier.
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
              <h3>Community education</h3>
              <p>Practical PMOS sessions in the language schools, temples, mosques and women&rsquo;s groups where women already gather.</p>
            </motion.li>
            <motion.li variants={item}>
              <h3>Know the signs, privately</h3>
              <p>Answer a few quiet questions at home, then walk into a GP conversation with a clear summary.</p>
            </motion.li>
            <motion.li variants={item}>
              <h3>An appointment that fits</h3>
              <p>A GP who understands PMOS alongside language, culture and family context.</p>
            </motion.li>
          </motion.ol>

        </div>
      </section>

      {/* Chapter 06: Stefan, co-founder */}
      <section className="story-chapter" aria-labelledby="cofounder-title">
        <div className="story-wrap story-split story-cofounder-split">
          <div className="story-split-lead">
            <Reveal>
              <h2 id="cofounder-title" className="story-heading">
                I do not build this alone.
              </h2>
            </Reveal>
            <Reveal delay={0.05} className="story-prose">
              <p>
                Stefan Thottunkal is a physician-in-training and health-systems researcher at
                Stanford Medicine, working on precision pharmacogenomic treatment in
                Stanford&rsquo;s concierge medicine clinic and on LLM-driven, culturally tailored
                nutrition research at NOURISH.
              </p>
              <p>
                The same conviction runs through his work and mine: care lands better when it is
                built around the person, their culture and their family.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="story-cofounder-card">
            <Image
              src="/stefan.png"
              alt="Stefan Thottunkal, co-founder of Meherr"
              width={1368}
              height={1817}
              sizes="(min-width: 900px) 26vw, 60vw"
              className="story-cofounder-photo"
            />
            <div className="story-cofounder-id">
              <strong>Stefan Thottunkal</strong>
              <span>Co-founder</span>
              <div className="story-affiliations">
                <a
                  href="https://med.stanford.edu/nourish-project.html"
                  target="_blank"
                  rel="noreferrer"
                  className="story-nourish-link"
                  aria-label="NOURISH, culturally tailored nutrition research at Stanford Medicine"
                >
                  <Image src="/nourish-logo.png" alt="NOURISH" width={446} height={80} />
                </a>
                <a
                  href="https://hsph.harvard.edu/research/health-systems-innovation-lab/team/#scholars"
                  target="_blank"
                  rel="noreferrer"
                  className="story-hsil-link"
                  aria-label="Health Systems Innovation Lab, Harvard T.H. Chan School of Public Health"
                >
                  <Image src="/hsil-logo.png" alt="Harvard T.H. Chan School of Public Health, Health Systems Innovation Lab" width={472} height={54} />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="story-register" aria-labelledby="register-heading">
        <div className="story-wrap story-register-grid">
          <div>
            <h2 id="register-heading" className="story-heading">
              Join the first community sessions.
            </h2>
            <p className="story-register-copy">
              Hear about upcoming sessions, or be among the first to try the self-check and the
              directory.
            </p>
          </div>
          <InterestForm />
        </div>
      </section>

      <footer className="story-footer">
        <div className="story-wrap story-footer-inner">
          <Link href="/" className="story-footer-wordmark">
            Meherr
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
