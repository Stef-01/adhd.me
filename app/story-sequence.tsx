"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { coveredSuburbs, describeDistance, distanceKm, resolvePlace, SUBURBS, type SuburbPoint } from "@/geo/suburbs";

/**
 * THE SCROLL SEQUENCE — the middle of the landing page, animated.
 *
 * The page used to state its argument in five stacked bands. It was true and nobody felt it,
 * because "finding a GP is hard" set as a heading over a paragraph is a claim, and the thing it
 * describes is an EXPERIENCE: the search that returns everything except a GP, the practice pages
 * read one doctor at a time, the questions nobody will answer, and only then the wait and the
 * bill. Eight scenes, driven by scroll position, over one pinned stage.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * HOW IT SATISFIES A11Y-2 RATHER THAN ARGUING WITH IT.
 *
 * The rule in story-landing.tsx is that nothing animates from a hidden state, because
 * motion/react renders `initial` on the SERVER and an `opacity: 0` ships as an inline style in
 * the HTML — copy that cannot be read until the bundle arrives, or ever. A scrollytelling
 * sequence is exactly the pattern that normally breaks this: scenes that fade in and out.
 *
 * So the split is structural. EVERY WORD A READER NEEDS LIVES IN THE STEPS — ordinary <section>
 * elements, server-rendered, always at full opacity, readable top to bottom with JavaScript
 * switched off. The stage is a DECORATION that illustrates them; it carries no information that
 * is not also in the prose beside it, which is why it is `aria-hidden` and why it is allowed to
 * hide and show its layers. Take the JavaScript away and you get the argument as plain text with
 * a still illustration of scene one. Take the CSS away and you get the argument as plain text.
 *
 * THE STAGE IS DRIVEN BY A `data-scene` ATTRIBUTE AND CSS, NOT BY REACT STATE PER LAYER.
 * One observer writes one attribute; the stylesheet owns every transition. That keeps the
 * component's render free of animation bookkeeping, and it means `prefers-reduced-motion` is
 * handled in one place instead of at eleven call sites.
 */

/** Copy for one scene. `detail` is the nuance — the specific things that actually go wrong. */
type Scene = {
  n: string;
  eyebrow: string;
  /** Rendered as an <h2>. Two of these are pinned by e2e/landing.spec.ts — see NOTE below. */
  heading: string;
  body: string;
  detail?: readonly string[];
  /** A quieter line under the detail, for the qualification a figure needs. */
  foot?: string;
};

/**
 * NOTE — TWO HEADINGS HERE ARE LOAD-BEARING FOR THE SUITE.
 * `e2e/landing.spec.ts` asserts a heading matching /NSW and QLD/i and one matching /How it
 * works/i are legible with JavaScript disabled. They are scenes 06 and 07. Renaming either
 * without updating that spec removes the page's only guarantee that its argument survives
 * without a bundle.
 */
const SCENES: readonly Scene[] = [
  {
    n: "01",
    eyebrow: "Where it starts",
    heading: "You search, and no GP comes back.",
    body:
      "Type “ADHD GP near me” and you get directories, sponsored clinics, telehealth start-ups and " +
      "psychiatry waiting lists. Almost none of it is a GP near you who assesses ADHD.",
    detail: [
      "No booking site has a filter for it",
      "The ads are for the expensive route",
      "Half the results are not in your state",
    ],
  },
  {
    n: "02",
    eyebrow: "So you go looking",
    heading: "Then you read the doctors one at a time.",
    body:
      "You open a practice page and work down the list, one GP at a time, looking for the word. " +
      "Usually it is not there. The profile says “special interests” and lists skin checks and " +
      "travel medicine, and you are still guessing.",
    detail: [
      "Practice pages list doctors, not what they do",
      "Reception often cannot say either",
      "There is no public register of who actually does this work",
      "The one GP who does it is not taking new patients",
    ],
  },
  {
    n: "03",
    eyebrow: "The part nobody answers",
    heading: "None of it answers what you want to ask.",
    body:
      "Even when a name finally looks plausible, the page is silent on everything that decides " +
      "whether this GP is right for you. You book, take the day off, and find out in the room.",
    detail: [
      "Will they take me seriously?",
      "Will they think I’m after something?",
      "Do they know how this looks in women?",
      "Will they understand my family, my language?",
      "Do I need school reports? I don’t have any.",
      "Will I forget what I meant to say?",
    ],
  },
  {
    n: "04",
    eyebrow: "Money, time, distance",
    heading: "How far, how long, how much.",
    body:
      "The questions that decide whether you go at all are the ones nobody publishes. You ring and " +
      "ask, or you turn up and find out.",
    detail: [
      "Can I get there without a car?",
      "Is a fifteen-minute appointment enough for this?",
      "Can I take another day off work?",
      "Is it bulk billed, or is there a gap?",
    ],
  },
  {
    n: "05",
    eyebrow: "What the old route cost",
    heading: "The wait was never the care.",
    body:
      "Before the rule changed, the route ran through a queue with no visible end and a bill most " +
      "people could not plan for. None of the waiting made the care better. It only made it later.",
    detail: [
      "Time off work",
      "A referral to chase",
      "Telling the whole story to somebody new",
    ],
    foot:
      "6–12 months is a typical wait for an adult ADHD assessment appointment; $1k to $5k is a " +
      "common out-of-pocket cost of a private adult assessment. Both indicative, pending source " +
      "confirmation.",
  },
  {
    n: "06",
    eyebrow: "What changed",
    heading: "The rule is changing in NSW and QLD.",
    body:
      "GPs can now carry the whole pathway rather than only refer it " +
      "onward. Psychiatry stays available for the complex cases. The queue stops being the default.",
    foot:
      "ADHD.ME lists the GPs who do this work. Every one of them is a GP; ADHD is not " +
      "a specialty on the register, and nobody here claims otherwise.",
  },
  {
    n: "07",
    eyebrow: "What ADHD.ME is",
    heading: "How it works, end to end.",
    body:
      "The permission already changed. Acting on it is the part that was missing. Three steps.",
    detail: [
      "Say what you need, in your words. Not a quiz, and not a score.",
      "See who is near you, by suburb, care area and language.",
      "Book the first appointment with one GP who carries it through.",
    ],
  },
  {
    n: "08",
    eyebrow: "The one action",
    heading: "One GP, from the first appointment to the follow-up.",
    body:
      "Nobody should have to tell their story twice to get through a door. One clinician holds the " +
      "assessment, the medication and the follow-up, and what they wrote down in the first " +
      "appointment is still there in the fourth.",
    foot:
      "You book with the practice on Healthengine, where the live times are. ADHD.ME does not see " +
      "your booking.",
  },
];

/**
 * THE PRACTICE THE ROSTER ACTUALLY LISTS.
 *
 * Scene 04 asks "how far", and until now the page asked it rhetorically: a diagram of rings with
 * an invented dot on it. It can be answered instead, from the same gazetteer the matcher uses, so
 * the scene stops being a picture of the question and becomes the answer to it.
 *
 * Beecroft, not "your nearest practice", because both GPs on the roster are at Beecroft Family &
 * Skin Cancer Clinic. Writing this as a lookup over practices would be building for a roster that
 * does not exist yet and would quietly imply coverage the directory cannot honour.
 */
const LISTED_AT: SuburbPoint = SUBURBS.find((s) => s.suburb === "Beecroft")!;

/**
 * What to tell somebody who typed a place. Three outcomes, and the third is the one that matters:
 * an unresolved input is reported AS unresolved rather than fuzzy-matched to the nearest thing,
 * for the reason `resolvePlace` gives — a near-miss silently becoming a hit is the product
 * deciding what somebody meant, and here it would send them to the wrong side of Sydney.
 */
function answerFor(input: string): { state: "empty" | "unknown" | "found"; line: string; at: SuburbPoint | null } {
  const typed = input.trim();
  if (!typed) return { state: "empty", line: "", at: null };
  const point = resolvePlace(typed);
  if (!point) {
    return {
      state: "unknown",
      line: `We do not cover ${typed} yet. Today the listed GPs are in Beecroft, NSW.`,
      at: null,
    };
  }
  if (point.suburb === LISTED_AT.suburb) {
    return { state: "found", line: "The GPs listed today are in your suburb.", at: point };
  }
  const km = distanceKm(point, LISTED_AT);
  /* A COVERED SUBURB THE ROSTER CANNOT SERVE YET GETS SAID OUT LOUD.
     The coverage map names two focus areas and both listed GPs are at Beecroft, so somebody in
     the Gold Coast area is told, truthfully, that the nearest listed GP is 670km away. Rounding
     that off or hiding it behind "not covered" would be the product covering for itself: the
     suburb IS in the gazetteer, and the honest answer is that the directory has not caught up
     with the map. Phrased so it reads as a gap in the listing rather than a gap in the person. */
  if (km > 100) {
    return {
      state: "found",
      line: `${point.suburb} is a covered area, but every GP listed today is at Beecroft, NSW — about ${Math.round(km)} km away. More are being added.`,
      at: point,
    };
  }
  return {
    state: "found",
    line: `From ${point.suburb}, the GPs listed today are ${describeDistance(km)}.`,
    at: point,
  };
}

/** The page's one easing curve, shared with story-landing.tsx. */
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Entrance for a step's copy. TRANSFORM ONLY — no opacity, ever. This is the same shape as
 * `Reveal` in story-landing.tsx and it is duplicated rather than imported so the constraint is
 * visible at the point somebody would be tempted to add a fade.
 */
function Rise({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { y: 18 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.3, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

export function StorySequence() {
  const [scene, setScene] = useState(1);
  const [place, setPlace] = useState("");
  const answer = answerFor(place);
  const stepsRef = useRef<HTMLDivElement>(null);

  /**
   * WHY THE WINNER IS CHOSEN FROM A LIVE MAP RATHER THAN FROM `entries`.
   *
   * An IntersectionObserver callback reports only the steps whose intersection CHANGED. Scrolling
   * quickly past two steps can therefore deliver a batch in which the step the reader has landed
   * on is not the most-intersecting entry in that batch, and the stage sticks on a scene already
   * gone by. Holding every step's latest ratio and picking the maximum across all of them makes
   * the choice independent of which ones happened to fire.
   */
  useEffect(() => {
    const root = stepsRef.current;
    if (!root) return;

    const steps = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const ratios = new Map<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        let best: HTMLElement | null = null;
        let bestRatio = 0;
        for (const step of steps) {
          const ratio = ratios.get(step) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = step;
          }
        }
        if (best) setScene(Number(best.dataset.step));
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1], rootMargin: "-14% 0px -14% 0px" },
    );

    for (const step of steps) io.observe(step);
    return () => io.disconnect();
  }, []);

  return (
    <section className="seq" aria-labelledby="seq-title">
      <h2 className="seq-sr" id="seq-title">
        What finding ADHD care is like now, and what ADHD.ME changes
      </h2>

      <div className="seq-wrap">
        {/* The illustration. aria-hidden because every word inside it is also in the prose
            beside it — a screen reader that read both would hear the page twice. */}
        <div className="seq-stage" aria-hidden="true">
          <SequenceStage scene={scene} here={answer.at} />
        </div>

        <div className="seq-steps" ref={stepsRef}>
          {SCENES.map((s, i) => (
            <article className="seq-step" key={s.n} data-step={i + 1}>
              <div className="seq-step-in">
                <Rise>
                  <p className="seq-n">
                    <span>{s.n}</span> {s.eyebrow}
                  </p>
                </Rise>
                <Rise delay={0.04}>
                  <h3 className="seq-h">{s.heading}</h3>
                </Rise>
                <Rise delay={0.08}>
                  <p className="seq-body">{s.body}</p>
                </Rise>
                {s.detail ? (
                  <Rise delay={0.12}>
                    <ul className="seq-detail">
                      {s.detail.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </Rise>
                ) : null}
                {s.n === "04" ? (
                  <Rise delay={0.16}>
                    <div className="seq-ask">
                      <label className="seq-ask-label" htmlFor="seq-place">
                        So: how far is it for you?
                      </label>
                      <input
                        id="seq-place"
                        className="seq-ask-input"
                        type="text"
                        list="seq-places"
                        autoComplete="off"
                        placeholder="Your suburb or postcode"
                        value={place}
                        onChange={(event) => setPlace(event.target.value)}
                      />
                      <datalist id="seq-places">
                        {coveredSuburbs().map((name) => <option key={name} value={name} />)}
                      </datalist>
                      {/* The answer is announced here rather than drawn only on the stage: the
                          stage is aria-hidden, so a reader who cannot see it would otherwise type
                          into a control that appears to do nothing. */}
                      <p className={`seq-ask-out seq-ask-${answer.state}`} role="status" aria-live="polite">
                        {answer.state === "empty" ? "Straight-line distance, from the same list the finder uses." : answer.line}
                      </p>
                    </div>
                  </Rise>
                ) : null}
                {s.foot ? (
                  <Rise delay={0.16}>
                    <p className="seq-foot">{s.foot}</p>
                  </Rise>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════
   THE STAGE

   One SVG, eight scenes, every layer present in the markup from the first paint. `data-scene`
   selects which are on stage and where the camera sits; globals.css owns every transition. The
   camera is a CSS transform on a group rather than a tweened viewBox: same gesture, composites
   on the GPU, transitions declaratively, and renders scene one correctly with no JavaScript.
   ═══════════════════════════════════════════════════════════════════════════════════════════ */

/** Result rows for scene 01 — what the search actually returns, none of them a GP. */
const RESULTS: ReadonlyArray<{ tag: string; w: number }> = [
  { tag: "Directory", w: 300 },
  { tag: "Sponsored", w: 250 },
  { tag: "Telehealth", w: 280 },
  { tag: "Psychiatry", w: 232 },
  { tag: "Directory", w: 296 },
  { tag: "Sponsored", w: 244 },
];

/** The practice list for scene 02 — six doctors, one of whom is the answer and cannot be told apart. */
const DOCTORS = ["Dr A", "Dr B", "Dr C", "Dr D", "Dr E", "Dr F"];

/** Scene 03's questions, placed by hand so they read as a crowd rather than a list. */
const WORRIES: ReadonlyArray<{ t: string; x: number; y: number; w: number; d: number }> = [
  { t: "Will they take me seriously?", x: 120, y: 200, w: 300, d: 0 },
  { t: "Will they think I’m after something?", x: 488, y: 132, w: 372, d: 1 },
  { t: "Do they know how this looks in women?", x: 736, y: 288, w: 392, d: 2 },
  { t: "Will they understand my family?", x: 184, y: 360, w: 330, d: 3 },
  { t: "Do I need school reports?", x: 564, y: 448, w: 276, d: 4 },
  { t: "I don’t have any.", x: 892, y: 528, w: 202, d: 5 },
  { t: "Will I forget what I meant to say?", x: 232, y: 556, w: 340, d: 6 },
  { t: "Is fifteen minutes enough?", x: 610, y: 660, w: 288, d: 7 },
];

/** Scene 04's practical barriers, as a row of chips. */
const PRACTICAL = ["Can I get there?", "Another day off work", "Is there a gap fee?"];

function SequenceStage({ scene, here }: { scene: number; here: SuburbPoint | null }) {
  return (
    <svg className="seq-svg" viewBox="0 0 1200 1000" data-scene={scene} role="presentation" focusable="false">
      <rect width="1200" height="1000" fill="var(--s-paper)" />
      <g className="seq-cam">
        {/* ── 01 the search ─────────────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l1">
          <rect x="120" y="96" width="860" height="60" rx="30" fill="#fff" stroke="var(--s-line)" />
          <circle cx="162" cy="126" r="10" fill="none" stroke="var(--s-muted)" strokeWidth="2.2" />
          <line x1="169" y1="133" x2="178" y2="142" stroke="var(--s-muted)" strokeWidth="2.2" strokeLinecap="round" />
          <text x="194" y="133" className="seq-t-q">ADHD GP near me</text>
          {/* POSITION ON THE OUTER <g>, ANIMATION ON THE INNER ONE. A CSS `transform` property
              OVERRIDES an SVG `transform` attribute rather than composing with it, so putting
              both on one element collapses every placed row onto the origin — which is exactly
              what the first build of this scene did. The split is load-bearing everywhere a
              placed element also animates: results, doctors, questions, chips and the CTA. */}
          {RESULTS.map((r, i) => (
            <g key={i} transform={`translate(120 ${208 + i * 106})`}>
              <g className={`seq-res seq-res-${i}`}>
                <rect width="860" height="84" rx="6" fill="var(--s-paper-2)" stroke="var(--s-line)" />
                <rect x="24" y="26" width="96" height="32" rx="16" fill="var(--s-line)" />
                <text x="72" y="47" className="seq-t-tag">{r.tag}</text>
                <rect x="140" y="28" width={r.w} height="12" rx="6" fill="#c6c0b1" />
                <rect x="140" y="52" width={r.w * 0.72} height="10" rx="5" fill="#d3cdbe" />
              </g>
            </g>
          ))}
          <text x="120" y="900" className="seq-t-note">None of them assesses ADHD</text>
        </g>

        {/* ── 02 the practice list ──────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l2">
          <text x="120" y="118" className="seq-t-lbl">OUR DOCTORS</text>
          {DOCTORS.map((d, i) => (
            <g key={d} transform={`translate(120 ${164 + i * 116})`}>
              <g className={`seq-doc seq-doc-${i}`}>
                <rect width="720" height="92" rx="6" fill="var(--s-paper-2)" stroke="var(--s-line)" />
                <circle cx="48" cy="46" r="26" fill="#d8d3c6" />
                <text x="96" y="42" className="seq-t-doc">{d}</text>
                <text x="96" y="68" className="seq-t-sub">General practitioner</text>
                <text x="688" y="56" textAnchor="end" className="seq-t-scan">?</text>
              </g>
            </g>
          ))}
          {/* the magnifier that works down the list, finding nothing */}
          <g className="seq-glass">
            <circle cx="0" cy="0" r="34" fill="none" stroke="var(--s-accent)" strokeWidth="4" />
            <line x1="25" y1="25" x2="45" y2="45" stroke="var(--s-accent)" strokeWidth="4" strokeLinecap="round" />
          </g>
          <text x="908" y="470" className="seq-t-note">The word is<tspan x="908" dy="34">not on the page</tspan></text>
        </g>

        {/* ── 03 the questions ──────────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l3">
          {WORRIES.map((w) => (
            <g key={w.t} transform={`translate(${w.x} ${w.y})`}>
              <g className={`seq-worry seq-w-${w.d}`}>
                <rect width={w.w} height="60" rx="30" fill="#fff" stroke="var(--s-line)" />
                <text x={w.w / 2} y="37" textAnchor="middle" className="seq-t-worry">{w.t}</text>
              </g>
            </g>
          ))}
          <text x="120" y="836" className="seq-t-note">None of this is answered anywhere</text>
        </g>

        {/* ── 04 how far, how long, how much ────────────────────────────────────────── */}
        <g className="seq-layer seq-l4">
          <circle cx="352" cy="512" r="212" fill="none" stroke="var(--s-line)" strokeWidth="2" strokeDasharray="6 8" />
          <circle cx="352" cy="512" r="120" fill="none" stroke="var(--s-line)" strokeWidth="2" strokeDasharray="6 8" />
          <circle className="seq-you" cx="352" cy="512" r="13" fill="var(--s-ink)" />
          <text x="352" y="560" textAnchor="middle" className="seq-t-sub">{here ? here.suburb : "you"}</text>
          <circle className="seq-far" cx="528" cy="394" r="12" fill="var(--s-accent)" />
          <text x="554" y="389" className="seq-t-sub">the listed GPs</text>
          <path className="seq-route" d="M364 504 C410 470, 470 428, 518 400" fill="none" stroke="var(--s-accent)" strokeWidth="2" strokeDasharray="4 5" />
          <text x="120" y="856" className="seq-t-note">
            {here ? `${here.suburb} to Beecroft — ${describeDistance(distanceKm(here, LISTED_AT))}` : "Type a suburb to see how far"}
          </text>
          {PRACTICAL.map((p, i) => (
            <g key={p} transform={`translate(672 ${372 + i * 122})`}>
              <g className={`seq-prac seq-prac-${i}`}>
                <rect width="452" height="76" rx="38" fill="var(--s-paper-2)" stroke="var(--s-line)" />
                <text x="36" y="47" className="seq-t-prac">{p}</text>
              </g>
            </g>
          ))}
        </g>

        {/* ── 05 the wait and the bill ──────────────────────────────────────────────── */}
        <g className="seq-layer seq-l5">
          <line className="seq-axis" x1="120" y1="430" x2="1000" y2="430" stroke="var(--s-line)" strokeWidth="2" />
          <g stroke="#d8d3c6" strokeWidth="2">
            <line x1="216" y1="420" x2="216" y2="440" /><line x1="292" y1="420" x2="292" y2="440" />
            <line x1="368" y1="420" x2="368" y2="440" /><line x1="444" y1="420" x2="444" y2="440" />
            <line x1="520" y1="420" x2="520" y2="440" />
          </g>
          <g stroke="var(--s-accent)" strokeWidth="2">
            <line x1="596" y1="414" x2="596" y2="446" /><line x1="672" y1="414" x2="672" y2="446" />
            <line x1="748" y1="414" x2="748" y2="446" /><line x1="824" y1="414" x2="824" y2="446" />
            <line x1="900" y1="414" x2="900" y2="446" /><line x1="976" y1="414" x2="976" y2="446" />
          </g>
          <text x="216" y="472" textAnchor="middle" className="seq-t-tick">1</text>
          <text x="596" y="472" textAnchor="middle" className="seq-t-tick seq-hot">6</text>
          <text x="976" y="472" textAnchor="middle" className="seq-t-tick seq-hot">12</text>
          <rect x="1014" y="374" width="64" height="56" rx="5" fill="var(--s-accent-soft)" stroke="var(--s-accent)" strokeDasharray="4 4" />
          <text x="1046" y="414" textAnchor="middle" className="seq-t-qm">?</text>
          <text x="120" y="222" className="seq-t-fig">6–12 months</text>
          <text x="124" y="262" className="seq-t-sub">typical wait for an adult ADHD assessment appointment</text>
          <g className="seq-bar-wrap">
            <rect x="120" y="748" width="176" height="86" rx="3" fill="var(--s-accent-soft)" stroke="var(--s-line)" />
            <text x="208" y="802" textAnchor="middle" className="seq-t-cost seq-cost-q">$1k</text>
            <g className="seq-bar"><rect x="328" y="534" width="176" height="300" rx="3" fill="var(--s-accent)" /></g>
            <text x="416" y="802" textAnchor="middle" className="seq-t-cost seq-cost-p">$5k</text>
            <line x1="120" y1="834" x2="620" y2="834" stroke="var(--s-ink)" strokeWidth="2" />
          </g>
          <text x="120" y="874" className="seq-t-sub">common out-of-pocket cost of a private adult assessment</text>
        </g>

        {/* ── 06 the turn ───────────────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l6">
          {/* EXACTLY THE viewBox, NOT A BLEED PAST IT. This was `x=-100 width=1400` to guarantee
              full coverage under the camera. The svg clips it visually, so it looked right — but
              an SVG child's box is measured from its geometry regardless of clipping, and
              e2e/mobile-fit.spec.ts correctly reported it 14px past the right edge of a 390px
              phone. The camera never pans in this scene, so the bleed bought nothing. */}
          <rect x="0" y="0" width="1200" height="1000" fill="var(--s-dark)" />
          <g fill="#332f0a" opacity=".5">
            <rect x="90" y="120" width="112" height="34" rx="4" /><rect x="226" y="112" width="112" height="34" rx="4" />
            <rect x="362" y="126" width="112" height="34" rx="4" /><rect x="498" y="115" width="112" height="34" rx="4" />
            <rect x="634" y="123" width="112" height="34" rx="4" /><rect x="770" y="114" width="112" height="34" rx="4" />
            <rect x="906" y="122" width="112" height="34" rx="4" /><rect x="1042" y="118" width="112" height="34" rx="4" />
          </g>
          <path className="seq-turn-line" d="M120 214 C420 222, 760 224, 1000 218" fill="none" stroke="var(--s-accent-mid)" strokeWidth="2.6" strokeLinecap="round" />
          <circle className="seq-turn-dot" cx="1000" cy="218" r="8" fill="var(--s-accent-mid)" />
          <text x="120" y="430" className="seq-t-turn">The permission already</text>
          <text x="120" y="514" className="seq-t-turn">changed.</text>
          <text x="120" y="598" className="seq-t-turn seq-em">Now the appointment</text>
          <text x="120" y="682" className="seq-t-turn seq-em">has to be findable.</text>
        </g>

        {/* ── 07 the method ─────────────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l7">
          <g stroke="var(--s-line)" strokeWidth="2">
            <line className="seq-rule seq-rule-0" x1="120" y1="230" x2="760" y2="230" />
            <line className="seq-rule seq-rule-1" x1="120" y1="606" x2="760" y2="606" />
            <line className="seq-rule seq-rule-2" x1="120" y1="418" x2="760" y2="418" />
            <line className="seq-rule seq-rule-3" x1="120" y1="794" x2="760" y2="794" />
          </g>
          <text x="120" y="304" className="seq-t-step">Say what you need</text>
          <text x="120" y="344" className="seq-t-sub">In your words. Not a quiz, and not a score.</text>
          <text x="120" y="492" className="seq-t-step">See who is near you</text>
          <text x="120" y="532" className="seq-t-sub">By suburb, care area and language.</text>
          <text x="120" y="680" className="seq-t-step">Book the first appointment</text>
          <text x="120" y="720" className="seq-t-sub">With one GP who carries it through.</text>
          <g transform="translate(806 236) scale(3.7)">
            <path d={AUS} fill="var(--s-paper-2)" stroke="#cfc9ba" strokeWidth=".6" />
            <circle className="seq-pin seq-pin-0" cx="87.6" cy="71.8" r="2.6" fill="var(--s-accent)" />
            <circle className="seq-pin seq-pin-1" cx="92.6" cy="58" r="2.6" fill="var(--s-accent)" />
          </g>
          <text x="991" y="672" textAnchor="middle" className="seq-t-place">Beecroft, NSW &amp; the Gold Coast, QLD</text>
        </g>

        {/* ── 08 the booking ────────────────────────────────────────────────────────── */}
        <g className="seq-layer seq-l8">
          <g transform="translate(330 274)">
            <rect width="540" height="206" rx="9" fill="#fff" stroke="var(--s-line)" strokeWidth="2" />
            <circle cx="92" cy="103" r="48" fill="var(--s-paper-2)" />
            <text x="92" y="117" textAnchor="middle" className="seq-t-mono">AS</text>
            <text x="168" y="86" className="seq-t-name">Dr Anubhav Saxena</text>
            <text x="168" y="122" className="seq-t-sub">General practitioner · Beecroft</text>
            <g transform="translate(168 142)">
              <rect width="166" height="38" rx="19" fill="var(--s-accent-soft)" />
              <text x="22" y="25" className="seq-t-chip">ADHD assessment</text>
              <rect x="180" width="114" height="38" rx="19" fill="var(--s-accent-soft)" />
              <text x="202" y="25" className="seq-t-chip">Titration</text>
            </g>
          </g>
          <g transform="translate(390 538)">
            <g className="seq-cta">
              <rect width="420" height="72" rx="36" fill="var(--s-ink)" />
              <text x="210" y="46" textAnchor="middle" className="seq-t-cta">See available times</text>
            </g>
          </g>
          <path d="M600 638 L600 692" stroke="var(--s-muted)" strokeWidth="2" />
          <path d="M592 684 L600 696 L608 684" fill="none" stroke="var(--s-muted)" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(360 712)">
            <rect width="480" height="58" rx="8" fill="var(--s-paper-2)" stroke="var(--s-line)" />
            <text x="240" y="37" textAnchor="middle" className="seq-t-sub">Healthengine, where the live times are</text>
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * The coastline, generated by the same equirectangular projection `CoverageMap` uses, so the
 * illustration and the real diagram cannot disagree about where the coast is.
 */
const AUS =
  "M69.9 16.5 C71.0 17.2, 75.4 24.4, 76.3 26.8 C77.2 29.3, 76.5 34.2, 77.4 36.0 C78.3 37.8, 82.4 39.8, 83.6 41.2 C84.8 42.6, 86.0 45.8, 87.0 47.2 C88.1 48.7, 91.2 51.6, 91.9 53.0 C92.7 54.4, 93.1 57.0, 93.0 58.5 C92.9 60.1, 92.1 63.6, 91.5 65.2 C90.9 66.9, 88.8 69.6, 88.1 71.5 C87.4 73.4, 86.9 78.9, 85.7 80.4 C84.6 81.9, 80.4 83.2, 78.9 83.5 C77.4 83.8, 75.0 83.1, 73.5 83.0 C72.1 83.0, 68.5 83.4, 67.3 83.0 C66.1 82.6, 64.7 80.5, 63.9 79.7 C63.1 78.8, 61.5 76.8, 60.9 76.3 C60.3 75.8, 59.9 75.7, 59.4 75.6 C58.9 75.5, 57.8 75.5, 57.1 75.3 C56.3 75.2, 55.1 75.2, 53.6 74.1 C52.2 73.0, 48.2 67.2, 45.7 66.4 C43.3 65.7, 36.1 67.6, 34.0 68.4 C31.8 69.1, 30.7 71.6, 28.6 72.4 C26.5 73.3, 19.1 75.0, 16.8 75.1 C14.6 75.2, 11.5 74.9, 10.6 73.4 C9.8 71.9, 10.6 65.4, 10.2 62.8 C9.9 60.3, 8.3 55.6, 7.9 53.2 C7.5 50.8, 6.3 45.3, 7.0 43.6 C7.7 42.0, 11.6 41.0, 13.6 40.3 C15.7 39.6, 21.7 38.6, 23.3 37.9 C24.8 37.1, 24.4 36.0, 25.8 34.3 C27.3 32.6, 33.1 25.4, 35.0 24.4 C37.0 23.4, 40.3 26.6, 41.4 26.1 C42.5 25.6, 43.0 21.6, 43.8 20.6 C44.6 19.5, 46.7 17.0, 47.9 17.7 C49.0 18.4, 52.1 25.6, 53.2 25.9 C54.3 26.1, 55.9 19.5, 56.4 19.9 C57.0 20.3, 56.7 27.4, 57.5 29.0 C58.3 30.6, 62.0 32.6, 63.0 32.6 C64.1 32.6, 65.5 30.7, 66.0 29.2 C66.6 27.8, 66.6 22.7, 67.1 21.1 C67.6 19.5, 68.7 15.8, 69.9 16.5 Z";
