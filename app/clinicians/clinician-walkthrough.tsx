"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock,
  TrendUp,
} from "@phosphor-icons/react";
import { useState } from "react";
import { DemoNavigator } from "../demo-navigator";

type Stage = "goal" | "feed" | "briefing" | "practice";

const stages: Array<{ id: Stage; label: string }> = [
  { id: "goal", label: "Direction" },
  { id: "feed", label: "Case mix" },
  { id: "briefing", label: "Briefing" },
  { id: "practice", label: "Practice" },
];

/**
 * The sub-areas inside an ADHD focus. `adhd-assessment` is locked because every archetype in
 * src/demo/care-archetypes.ts requires it: a GP who deselected it would have a focus the finder
 * can never route to, which is a worse state than having no focus at all.
 */
const adhdConditions = [
  { id: "adhd-assessment", label: "Diagnostic assessment", locked: true },
  { id: "child-adolescent-adhd", label: "Children & adolescents" },
  { id: "titration", label: "Titration & follow-up" },
  { id: "autism-adhd", label: "Co-occurring autism" },
  { id: "comorbid-mood", label: "Anxiety & mood differential" },
  { id: "student-academic", label: "Study & workplace adjustments" },
] as const;

const cases = [
  { label: "New ADHD assessment", detail: "Developmental history, rating scales", time: "8:40" },
  { label: "Assessment part two", detail: "Collateral history, differential", time: "10:20" },
  { label: "Titration follow-up", detail: "Effect, appetite, blood pressure", time: "1:10" },
  { label: "Longer adult consult", detail: "Late presentation, shared plan", time: "3:40" },
];

/**
 * Learning that points OUTWARD, which is the whole design of this list.
 *
 * Every `href` leaves for a guideline body — AADPA, NICE, the TGA. Nothing here is clinical content
 * ADHD.ME wrote, summarised or paraphrased, because a summary is a new clinical assertion with this
 * product's name on it, and founder gate G5 exists to stop exactly that. The `title` and `detail`
 * fields name WHAT A CLINICIAN WOULD GO AND READ; they do not tell them what it says.
 *
 * FOUNDER ACTION: every URL below needs confirming against the live source before launch. They are
 * written from the stable landing pages of each body rather than deep links, because a deep link
 * that has moved sends a clinician to a 404 in the middle of a consult.
 */
const resources = [
  {
    id: "guideline",
    eyebrow: "Australian guideline",
    title: "AADPA evidence-based clinical practice guideline",
    detail: "The Australian guideline for ADHD identification, assessment and support.",
    duration: "4 min",
    href: "https://adhdguideline.aadpa.com.au/",
  },
  {
    id: "diagnosis",
    eyebrow: "Diagnostic refresher",
    title: "Assessment and diagnosis in adults",
    detail: "What a defensible assessment has to establish, and what it cannot rest on.",
    duration: "3 min",
    href: "https://www.nice.org.uk/guidance/ng87",
  },
  {
    id: "differential",
    eyebrow: "Before you conclude",
    title: "Differential and co-occurring conditions",
    detail: "Anxiety, mood, trauma, sleep and substance use: what each one imitates.",
    duration: "3 min",
    href: "https://adhdguideline.aadpa.com.au/",
  },
  {
    id: "cardiac",
    eyebrow: "Safety checklist",
    title: "Baseline checks before a stimulant",
    detail: "Cardiovascular history, blood pressure and heart rate, and when to refer first.",
    duration: "2 min",
    href: "https://www.nice.org.uk/guidance/ng87",
  },
  {
    id: "prescribing",
    eyebrow: "Prescribing and the law",
    title: "Stimulant authority and shared care",
    detail: "What a GP may initiate and continue, which differs by state and changes.",
    duration: "3 min",
    href: "https://www.tga.gov.au/products/medicines/prescription-medicines",
  },
];

export function ClinicianWalkthrough() {
  const [stage, setStage] = useState<Stage>("goal");
  const [target, setTarget] = useState(30);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["adhd-assessment"]);
  const [resourceIndex, setResourceIndex] = useState(0);
  const [reviewed, setReviewed] = useState<string[]>([]);

  const stageIndex = stages.findIndex((item) => item.id === stage);
  const resource = resources[resourceIndex]!;

  function goToStage(next: Stage) {
    setStage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function move(direction: 1 | -1) {
    const next = Math.min(stages.length - 1, Math.max(0, stageIndex + direction));
    goToStage(stages[next]!.id);
  }

  function reviewResource() {
    setReviewed((current) => current.includes(resource.id) ? current : [...current, resource.id]);

    if (resourceIndex === resources.length - 1) {
      goToStage("practice");
      return;
    }

    setResourceIndex((current) => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleCondition(id: string) {
    if (id === "adhd-assessment") return;
    setSelectedConditions((current) => current.includes(id)
      ? current.filter((condition) => condition !== id)
      : [...current, id]);
  }

  function restart() {
    setStage("goal");
    setTarget(30);
    setSelectedConditions(["adhd-assessment"]);
    setResourceIndex(0);
    setReviewed([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="clinician-app clinician-v2">
      <div className="cv2-shell">
        <header className="cv2-header">
          <div className="cv2-brand">
            <DemoNavigator />
            <span>for clinicians</span>
          </div>
          <Link href="/finder" className="cv2-exit">
            Patient view <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </Link>
        </header>

        <nav className="cv2-progress" aria-label="Clinician pathway progress">
          <span>{stageIndex + 1} of {stages.length}</span>
          <div>
            {stages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`${index < stageIndex ? "is-complete " : ""}${item.id === stage ? "is-current" : ""}`}
                aria-label={`Step ${index + 1}: ${item.label}`}
                aria-current={item.id === stage ? "step" : undefined}
                onClick={() => goToStage(item.id)}
              />
            ))}
          </div>
        </nav>

        {/* ROUND 3. This screen carried five blocks: an intro, a collapsible focus CARD wrapping a
            single option, the conditions inside it, a grid of five greyed-out "coming soon"
            pathways, and a percentage slider. Three are gone.
            The focus card was a disclosure control around ONE choice, which is ceremony rather
            than a choice. The coming-soon grid was a roadmap teaser: five things a GP cannot pick,
            taking more room than the one they can. The per-condition sub-labels went with them,
            because a checkbox list where every row explains itself is a list nobody reads. */}
        {stage === "goal" && (
          <section className="cv2-stage cv2-goal">
            <div className="cv2-intro">
              <p className="cv2-eyebrow">Choose your direction</p>
              <h1>What kind of GP do you want to become?</h1>
              <p>ADHD is the pathway available now. Pick the parts you want more of.</p>
            </div>

            <fieldset id="adhd-focus-conditions" className="cv2-condition-panel">
              <legend className="sr-only">Choose conditions</legend>
              <div className="cv2-condition-list">
                {adhdConditions.map((condition) => {
                  const checked = selectedConditions.includes(condition.id);
                  return (
                    <label key={condition.id} className={checked ? "is-checked" : ""}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={"locked" in condition && condition.locked}
                        onChange={() => toggleCondition(condition.id)}
                      />
                      <span className="cv2-checkbox" aria-hidden="true">
                        {checked && <Check size={13} weight="bold" />}
                      </span>
                      <span><strong>{condition.label}</strong></span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="cv2-mix-card">
              <div>
                <span>How much of your clinical week?</span>
                <strong>{target}%</strong>
              </div>
              <input
                id="focus-target"
                aria-label="Target practice mix"
                type="range"
                min="10"
                max="100"
                step="5"
                value={target}
                onChange={(event) => setTarget(Number(event.target.value))}
              />
              <div className="cv2-range-labels" aria-hidden="true"><span>10%</span><span>100%</span></div>
            </div>

            <div className="cv2-action">
              <button type="button" onClick={() => move(1)}>
                Build my pathway <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
              <a className="cv2-join-link" href="/clinicians/join">Or apply to join the directory</a>
              <p>Demo pathway only. Scope and credentialing remain practice-led.</p>
            </div>
          </section>
        )}

        {stage === "feed" && (
          <section className="cv2-stage cv2-feed">
            <button className="cv2-back" type="button" onClick={() => move(-1)}>
              <ArrowLeft size={17} weight="bold" aria-hidden="true" /> Direction
            </button>
            <div className="cv2-intro">
              <p className="cv2-eyebrow">Your pathway is live</p>
              <h1>Tomorrow already looks different.</h1>
              <p>Your case mix is moving toward the work you chose.</p>
            </div>

            <div className="cv2-case-hero">
              <div className="cv2-case-hero-top">
                <span>Tomorrow · Blacktown</span>
                <Clock size={20} weight="bold" aria-hidden="true" />
              </div>
              <div className="cv2-case-number"><strong>4</strong><span>ADHD<br />appointments</span></div>
              <p>{target}% target mix · 9 matched cases this week</p>
            </div>

            <div className="cv2-case-list" aria-label="Tomorrow’s concentrated case mix">
              {cases.map((item) => (
                <article key={item.time}>
                  <time>{item.time}</time>
                  <div><strong>{item.label}</strong><span>{item.detail}</span></div>
                  <Check size={16} weight="bold" aria-hidden="true" />
                </article>
              ))}
            </div>

            <div className="cv2-action">
              <button type="button" onClick={() => move(1)}>
                Prepare for tomorrow <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
              <p>Synthetic cases. No identifying patient details.</p>
            </div>
          </section>
        )}

        {stage === "briefing" && (
          <section className="cv2-stage cv2-briefing">
            <button className="cv2-back" type="button" onClick={() => move(-1)}>
              <ArrowLeft size={17} weight="bold" aria-hidden="true" /> Case mix
            </button>
            <div className="cv2-intro">
              <p className="cv2-eyebrow">13 minutes for tomorrow</p>
              <h1>Learn for the cases in front of you.</h1>
              <p>One useful prompt at a time. Nothing generic.</p>
            </div>

            <article className="cv2-learning-card" key={resource.id}>
              <div className="cv2-learning-meta">
                <span>{resourceIndex + 1} of {resources.length}</span>
                <span>{resource.duration}</span>
              </div>
              <div className="cv2-learning-body">
                <p>{resource.eyebrow}</p>
                <h2>{resource.title}</h2>
                <span>{resource.detail}</span>
                <a href={resource.href} target="_blank" rel="noreferrer">
                  Open source <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                </a>
              </div>
              <button type="button" onClick={reviewResource}>
                {resourceIndex === resources.length - 1 ? "Finish briefing" : "Mark ready"}
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </button>
            </article>

            <div className="cv2-resource-progress">
              <div>
                {resources.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${reviewed.includes(item.id) ? "is-reviewed " : ""}${index === resourceIndex ? "is-current" : ""}`}
                    aria-label={`Open briefing item ${index + 1}: ${item.title}`}
                    onClick={() => setResourceIndex(index)}
                  >
                    {reviewed.includes(item.id) && <Check size={11} weight="bold" aria-hidden="true" />}
                  </button>
                ))}
              </div>
              <span>{reviewed.length} ready</span>
            </div>
          </section>
        )}

        {stage === "practice" && (
          <section className="cv2-stage cv2-practice">
            <button className="cv2-back" type="button" onClick={() => move(-1)}>
              <ArrowLeft size={17} weight="bold" aria-hidden="true" /> Briefing
            </button>
            <div className="cv2-intro">
              <p className="cv2-eyebrow">The longer arc</p>
              <h1>This is how focus compounds.</h1>
              <p>Relevant cases and deliberate learning, repeated over time.</p>
            </div>

            <div className="cv2-practice-hero">
              <div><span>Focused cases</span><strong>184</strong><small>across 18 months</small></div>
              <TrendUp size={28} weight="bold" aria-hidden="true" />
              <div className="cv2-practice-mini">
                <span><strong>46</strong> briefings</span>
                <span><strong>31%</strong> focus mix</span>
              </div>
            </div>

            <div className="cv2-loop">
              {[
                ["Choose", "Make the clinical direction explicit."],
                ["Concentrate", "See enough similar cases to recognise patterns."],
                ["Learn", "Read only what tomorrow’s work makes useful."],
                ["Repeat", "Let exposure and reflection compound."],
              ].map(([title, detail], index) => (
                <div key={title}>
                  <span>{index + 1}</span>
                  <div><strong>{title}</strong><p>{detail}</p></div>
                </div>
              ))}
            </div>

            <div className="cv2-note">
              <p>Focused skin-cancer GPs improved through the same operating idea: concentrated exposure, pattern recognition and deliberate learning.</p>
            </div>

            <div className="cv2-action">
              <button type="button" onClick={restart}>Restart pathway</button>
              <p>Exposure and learning activity are not a competence score.</p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
