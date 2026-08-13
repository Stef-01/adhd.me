"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CaretDown,
  Check,
  Clock,
  Target,
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

const womenHealthConditions = [
  { id: "pcos", label: "PMOS", detail: "Demo anchor", locked: true },
  { id: "gestational-diabetes", label: "Gestational diabetes", detail: "Pregnancy and follow-up" },
  { id: "endometriosis", label: "Endometriosis & pelvic pain", detail: "Recognition and continuity" },
  { id: "perinatal-mental-health", label: "Perinatal mental health", detail: "Depression, anxiety and shared care" },
  { id: "postpartum-recovery", label: "Post-birth metabolic recovery", detail: "Sustainable recovery after birth" },
  { id: "menopause", label: "Menopause & perimenopause", detail: "Whole-person midlife care" },
] as const;

const comingFocusAreas = ["Metabolic health", "Renal health", "Cardiac health", "Mental health", "Skin cancer"];

const cases = [
  { label: "New PMOS assessment", detail: "Cycles · metabolic screen", time: "8:40" },
  { label: "PMOS follow-up", detail: "COCP suitability · mood check", time: "10:20" },
  { label: "Metformin review", detail: "Titration · GI tolerance", time: "1:10" },
  { label: "Longer PMOS consult", detail: "Symptoms · shared plan", time: "3:40" },
];

const resources = [
  {
    id: "guideline",
    eyebrow: "Current PMOS guideline",
    title: "Metabolic management",
    detail: "The relevant section from the 2023 International Evidence-based Guideline.",
    duration: "3 min",
    href: "https://www.monash.edu/__data/assets/pdf_file/0003/3379521/Evidence-Based-Guidelines-2023.pdf",
  },
  {
    id: "diagnosis",
    eyebrow: "Diagnostic refresher",
    title: "Rotterdam criteria + the AMH update",
    detail: "A two-minute pattern check before your first consult.",
    duration: "2 min",
    href: "https://www.monash.edu/medicine/mchri/pcos/guideline",
  },
  {
    id: "cocp",
    eyebrow: "Safety checklist",
    title: "COCP contraindications",
    detail: "A focused check against WHO medical eligibility criteria.",
    duration: "2 min",
    href: "https://www.who.int/publications/i/item/9789240115583",
  },
  {
    id: "metformin",
    eyebrow: "Treatment guide",
    title: "Metformin: start, titrate, review",
    detail: "Tolerance, dose progression and follow-up prompts.",
    duration: "2 min",
    href: "https://www.monash.edu/__data/assets/pdf_file/0003/3379521/Evidence-Based-Guidelines-2023.pdf",
  },
  {
    id: "paper",
    eyebrow: "Recent evidence",
    title: "COMET-PCOS randomised trial",
    detail: "COCP and metformin for metabolic outcomes, published in 2025.",
    duration: "4 min",
    href: "https://pubmed.ncbi.nlm.nih.gov/41359669/",
  },
];

export function ClinicianWalkthrough() {
  const [stage, setStage] = useState<Stage>("goal");
  const [target, setTarget] = useState(30);
  const [isWomenHealthOpen, setIsWomenHealthOpen] = useState(true);
  const [selectedConditions, setSelectedConditions] = useState<string[]>(["pcos"]);
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
    if (id === "pcos") return;
    setSelectedConditions((current) => current.includes(id)
      ? current.filter((condition) => condition !== id)
      : [...current, id]);
  }

  function restart() {
    setStage("goal");
    setTarget(30);
    setIsWomenHealthOpen(true);
    setSelectedConditions(["pcos"]);
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

        {stage === "goal" && (
          <section className="cv2-stage cv2-goal">
            <div className="cv2-intro">
              <p className="cv2-eyebrow">Choose your direction</p>
              <h1>What kind of GP do you want to become?</h1>
              <p>Choose a focus. We’ll shape your case mix and learning around it.</p>
            </div>

            <button
              className="cv2-focus-card"
              type="button"
              aria-expanded={isWomenHealthOpen}
              aria-controls="women-health-conditions"
              onClick={() => setIsWomenHealthOpen((current) => !current)}
            >
              <span className="cv2-icon"><Target size={21} weight="bold" aria-hidden="true" /></span>
              <span>
                <small>Available now</small>
                <strong>Women’s health</strong>
                <em>{selectedConditions.length} condition{selectedConditions.length === 1 ? "" : "s"} selected · choose the care you want to deepen</em>
              </span>
              <span className={`cv2-focus-caret${isWomenHealthOpen ? " is-open" : ""}`}>
                <CaretDown size={17} weight="bold" aria-hidden="true" />
              </span>
            </button>

            {isWomenHealthOpen && (
              <fieldset id="women-health-conditions" className="cv2-condition-panel">
                <legend>Choose conditions</legend>
                <p>Select the areas you want progressively represented in your case mix and learning.</p>
                <div className="cv2-condition-list">
                  {womenHealthConditions.map((condition) => {
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
                        <span>
                          <strong>{condition.label}</strong>
                          <small>{condition.detail}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <div className="cv2-coming-section">
              <div><span>Other clinical focus areas</span><small>More pathways are being built</small></div>
              <div className="cv2-coming-grid">
                {comingFocusAreas.map((focus, index) => {
                  const tooltipId = `coming-focus-${index}`;
                  return (
                    <button key={focus} type="button" aria-disabled="true" aria-describedby={tooltipId}>
                      <span>{focus}</span>
                      <small>Soon</small>
                      <span id={tooltipId} role="tooltip" className="cv2-coming-tooltip">Coming soon</span>
                    </button>
                  );
                })}
              </div>
            </div>

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
              <div className="cv2-case-number"><strong>4</strong><span>PMOS<br />appointments</span></div>
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
                ["Learn", "Review only what tomorrow’s work makes useful."],
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
