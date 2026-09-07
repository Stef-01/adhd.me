"use client";

import { useState } from "react";

type LearningReaction = "correct" | "reflect" | "complete";
type LearningSceneProps = { variant?: number; topic?: string; reaction?: LearningReaction };

const CAST = {
  orange: { body: "#FF873C", ink: "#743518", feet: "#C65828" },
  blue: { body: "#739DFF", ink: "#203D82", feet: "#4267BF" },
  lilac: { body: "#C2A3E0", ink: "#61407C", feet: "#8862A4" },
} as const;

/** The same three geometric companions can think, explain, work together, and finish. */
function Companion({ x, y, scale = 1, kind = "orange", reaction }: {
  x: number; y: number; scale?: number; kind?: keyof typeof CAST; reaction?: LearningReaction;
}) {
  const color = CAST[kind];
  const height = kind === "orange" ? 112 : 94;
  const celebrating = reaction === "complete";
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d={`M27 ${height - 3}v20m43-20v20`} stroke={color.feet} strokeWidth="5" strokeLinecap="round" />
    <path d={celebrating ? "M9 61-5 28m92 33 18-34" : "M7 63-7 76m94-13 15-11"} stroke={color.feet} strokeWidth="5" strokeLinecap="round" />
    {kind === "lilac"
      ? <path d="M0 48C0-17 96-17 96 48v46H0Z" fill={color.body} />
      : <rect width="96" height={height} rx={kind === "orange" ? 47 : 26} fill={color.body} />}
    {reaction === "reflect" ? <>
      <circle cx="31" cy="43" r="3.5" fill={color.ink} /><circle cx="65" cy="43" r="3.5" fill={color.ink} />
      <path d="M39 67q10-4 20 0m-35-39 12-3" stroke={color.ink} strokeWidth="3.5" strokeLinecap="round" />
    </> : <path d="M27 42q5 9 10 0m23 0q5 9 10 0m-33 21q12 14 24 0" stroke={color.ink} strokeWidth="4" strokeLinecap="round" />}
  </g>;
}

function Note({ x, y, color = "#FFD340", rotate = 0, checked = false }: {
  x: number; y: number; color?: string; rotate?: number; checked?: boolean;
}) {
  return <g transform={`translate(${x} ${y}) rotate(${rotate} 48 38)`}>
    <rect width="96" height="78" rx="12" fill={color} />
    <rect x="16" y="17" width="20" height="20" rx="5" fill="#fff" />
    {checked && <path d="m21 27 4 4 7-9" stroke="#157C50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    <path d="M46 25h31M17 51h60M17 62h40" stroke="#182230" strokeOpacity=".48" strokeWidth="5" strokeLinecap="round" />
  </g>;
}

function Ground() {
  return <path d="M32 246c87-18 147 14 219 0s104-13 160-1" stroke="#fff" strokeWidth="24" strokeLinecap="round" />;
}

function HeroArtwork({ variant = 0 }: { variant?: number }) {
  return <>
    <path d="M20 232c82-32 111 28 181 0s133-33 218 0" stroke="#fff" strokeWidth="32" strokeLinecap="round"/>
    <path d="M335 38h55m-43-11h27" stroke="#fff" strokeWidth="14" strokeLinecap="round"/>
    <circle cx="78" cy="63" r="27" fill="#FFD340"/>
    <g transform={`translate(90 ${variant % 2 ? 58 : 78}) rotate(-9 56 65)`}>
      <rect width="106" height="136" rx="52" fill="#FF873C"/>
      <path d="M36 60q5 9 10 0m17 0q5 9 10 0m-33 20q15 16 29 0" stroke="#743518" strokeWidth="4" strokeLinecap="round"/>
      <path d="M29 130v23m48-23v23" stroke="#C65828" strokeWidth="5" strokeLinecap="round"/>
    </g>
    <g transform="translate(213 121) rotate(8 50 48)">
      <rect width="103" height="102" rx="27" fill="#739DFF"/>
      <path d="M31 40q5 9 10 0m20 0q5 9 10 0m-35 23q15 13 30 0" stroke="#203D82" strokeWidth="4" strokeLinecap="round"/>
      <path d="M23 101v16m58-16v16" stroke="#4267BF" strokeWidth="5" strokeLinecap="round"/>
    </g>
    <g transform="translate(311 162) rotate(-8)">
      <path d="M0 38C0-15 75-12 75 38v24H0Z" fill="#C2A3E0"/>
      <path d="M22 32q4 7 8 0m17 0q4 7 8 0m-29 16q12 9 23 0" stroke="#61407C" strokeWidth="3" strokeLinecap="round"/>
    </g>
    <path d="m226 43 5 14 15 5-15 5-5 14-5-14-15-5 15-5Z" fill="#fff"/>
  </>;
}

/** A remembered action is moved onto a note beside an object, outside the character's head. */
function ReminderArtwork({ appointment = false }: { appointment?: boolean }) {
  return <>
    <Ground />
    <rect x="228" y="35" width="165" height="183" rx="20" fill="#fff" />
    <path d="M246 55h128" stroke="#DCE8F3" strokeWidth="6" strokeLinecap="round" />
    <Note x={246} y={73} rotate={-5} checked />
    <path d="M263 175h103m-103 16h71" stroke="#ABBED8" strokeWidth="6" strokeLinecap="round" />
    <Companion x={76} y={102} scale={1.05} />
    <path d="M177 157q23-27 61-39" stroke="#C65828" strokeWidth="5" strokeLinecap="round" />
    {appointment ? <>
      <rect x="45" y="49" width="91" height="58" rx="13" fill="#D8C6EB" />
      <path d="m105 103 10 16-33-12" fill="#D8C6EB" />
      <path d="M63 68h52M63 83h33" stroke="#61407C" strokeWidth="5" strokeLinecap="round" />
    </> : <>
      <circle cx="313" cy="224" r="15" stroke="#203D82" strokeWidth="6" />
      <path d="m327 224 42 0m-11 0v11m-12-11v11" stroke="#203D82" strokeWidth="6" strokeLinecap="round" />
      <path d="M175 77c10-26 40-31 57-14" stroke="#739DFF" strokeWidth="4" strokeDasharray="5 9" strokeLinecap="round" />
    </>}
  </>;
}

function SmallStepArtwork() {
  return <>
    <Ground />
    <rect x="185" y="193" width="66" height="53" rx="10" fill="#FFD340" />
    <rect x="261" y="141" width="66" height="105" rx="10" fill="#BDD0FF" />
    <rect x="337" y="89" width="66" height="157" rx="10" fill="#D8C6EB" />
    <g fill="#182230" fontSize="25" fontWeight="750" textAnchor="middle">
      <text x="218" y="228">1</text><text x="294" y="176">2</text><text x="370" y="124">3</text>
    </g>
    <Companion x={73} y={126} scale={.86} />
    <path d="M211 116v48m-11-11 11 12 11-12" stroke="#203D82" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <Note x={51} y={31} color="#fff" rotate={-8} />
    <path d="m279 109 23-18m38-24 21-14" stroke="#739DFF" strokeWidth="4" strokeDasharray="4 8" strokeLinecap="round" />
  </>;
}

function CompanyArtwork() {
  return <>
    <Ground />
    <Companion x={71} y={71} scale={1.07} />
    <Companion x={275} y={82} kind="blue" scale={1.1} />
    <path d="M88 203v43m267-43v43" stroke="#61407C" strokeWidth="12" strokeLinecap="round" />
    <rect x="53" y="183" width="335" height="21" rx="10" fill="#C2A3E0" />
    <g transform="translate(145 136) rotate(7 41 25)">
      <rect width="85" height="49" rx="8" fill="#fff" />
      <path d="M15 16h52M15 29h33" stroke="#739DFF" strokeWidth="5" strokeLinecap="round" />
    </g>
    <g transform="translate(245 143) rotate(-7 34 22)">
      <rect width="70" height="41" rx="8" fill="#FFD340" />
      <path d="m15 21 7 7 13-15m11 8h10" stroke="#743518" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <path d="M183 85q40-39 79 0" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
    <circle cx="223" cy="59" r="12" fill="#FFD340" />
  </>;
}

function TopicArtwork({ topic, variant = 0 }: { topic: string; variant?: number }) {
  switch (topic) {
    case "adhd":
      return <>
        <Ground />
        <path d="M151 101c44-72 147-70 207 13" stroke="#fff" strokeWidth="25" strokeLinecap="round" />
        <path d="M140 111c49-43 110-45 157-7" stroke="#A5B5D0" strokeWidth="3" strokeDasharray="4 9" strokeLinecap="round" />
        <Companion x={72} y={112} scale={1.03} />
        <circle cx="218" cy="65" r="29" fill="#FFD340" />
        <rect x="285" y="45" width="58" height="58" rx="17" fill="#739DFF" transform="rotate(12 314 74)" />
        <path d="m355 117 31 32-31 32-31-32Z" fill="#C2A3E0" />
        <g transform={`translate(208 ${variant % 2 ? 145 : 153}) rotate(-6 70 35)`}>
          <rect width="137" height="78" rx="18" fill="#fff" />
          <circle cx="30" cy="29" r="11" fill="#FFD340" />
          <rect x="58" y="18" width="23" height="23" rx="6" fill="#739DFF" />
          <path d="m107 18 12 12-12 12-12-12Z" fill="#C2A3E0" />
          <path d="M22 58h93" stroke="#C7D4E5" strokeWidth="6" strokeLinecap="round" />
        </g>
      </>;
    case "everyday":
      if (variant % 4 === 1) return <SmallStepArtwork />;
      if (variant % 4 === 2) return <CompanyArtwork />;
      return <ReminderArtwork appointment={variant % 4 === 3} />;
    case "myth-or-fact":
      return <>
        <Ground />
        <Companion x={57} y={119} kind="blue" scale={1.1} reaction="reflect" />
        <g transform="translate(206 37) rotate(-10 64 78)">
          <rect width="128" height="157" rx="22" fill="#FFD340" />
          <path d="M45 56c0-29 44-29 44 0 0 17-23 19-23 37" stroke="#743518" strokeWidth="7" strokeLinecap="round" />
          <circle cx="66" cy="115" r="5" fill="#743518" />
        </g>
        <g transform="translate(294 132) rotate(11 56 57)">
          <rect width="111" height="111" rx="19" fill="#fff" />
          <circle cx="50" cy="44" r="23" stroke="#203D82" strokeWidth="5" />
          <path d="m68 62 18 18M38 41h23M38 49h14" stroke="#203D82" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle cx="157" cy="92" r="9" fill="#C2A3E0" /><circle cx="180" cy="74" r="6" fill="#C2A3E0" />
      </>;
    case "words":
      return <>
        <Ground />
        <path d="M36 38h203a16 16 0 0 1 16 16v79a16 16 0 0 1-16 16h-57l-31 29v-29H36a16 16 0 0 1-16-16V54a16 16 0 0 1 16-16Z" fill="#fff" />
        <text x="50" y="113" fill="#61407C" fontSize="60" fontWeight="750" letterSpacing="-3">Aa</text>
        <path d="M153 79h70M153 98h49" stroke="#C2A3E0" strokeWidth="7" strokeLinecap="round" />
        <path d="M143 177h83a13 13 0 0 1 13 13v31a13 13 0 0 1-13 13h-49l-21 18v-18h-13a13 13 0 0 1-13-13v-31a13 13 0 0 1 13-13Z" fill="#FFD340" />
        <path d="M148 198h72M148 214h48" stroke="#743518" strokeWidth="5" strokeLinecap="round" />
        <Companion x={291} y={118} kind="lilac" scale={1.15} />
        <path d="M307 70h56m-56 15h33" stroke="#739DFF" strokeWidth="6" strokeLinecap="round" />
      </>;
    case "finding":
      return <>
        <Ground />
        <path d="M55 230h146c70 0 42-106 105-106h43" stroke="#fff" strokeWidth="31" strokeLinecap="round" />
        <path d="M55 230h146c70 0 42-106 105-106h43" stroke="#739DFF" strokeWidth="5" strokeDasharray="4 10" strokeLinecap="round" />
        <circle cx="193" cy="230" r="13" fill="#FFD340" stroke="#fff" strokeWidth="4" />
        <circle cx="258" cy="174" r="13" fill="#C2A3E0" stroke="#fff" strokeWidth="4" />
        <rect x="300" y="44" width="102" height="120" rx="20" fill="#fff" />
        <path d="M324 69h54m-54 14h31" stroke="#C7D4E5" strokeWidth="5" strokeLinecap="round" />
        <rect x="330" y="104" width="43" height="60" rx="10" fill="#739DFF" />
        <circle cx="360" cy="136" r="3" fill="#fff" />
        <Companion x={56} y={105} scale={.9} />
        <g transform="translate(178 47)">
          <circle cx="25" cy="25" r="23" fill="#fff" /><circle cx="25" cy="25" r="11" stroke="#203D82" strokeWidth="4" />
          <path d="m33 33 13 13" stroke="#203D82" strokeWidth="4" strokeLinecap="round" />
        </g>
      </>;
    case "cost":
      return <>
        <Ground />
        <circle cx="98" cy="104" r="61" fill="#fff" />
        <circle cx="98" cy="104" r="47" stroke="#739DFF" strokeWidth="6" />
        <path d="M98 76v29l22 15M98 59v5m45 40h-5M98 149v-5m-45-40h5" stroke="#203D82" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <g transform="translate(299 49)">
          <path d="M0 53v33c0 23 83 23 83 0V53" fill="#E9AF37" />
          <ellipse cx="42" cy="53" rx="42" ry="17" fill="#FFD340" />
          <path d="M5 73c20 14 53 14 73 0m-73 14c20 14 53 14 73 0" stroke="#B4771F" strokeWidth="3" />
          <circle cx="42" cy="30" r="30" fill="#FFE9A0" stroke="#fff" strokeWidth="4" />
          <text x="42" y="40" fill="#743518" fontSize="30" fontWeight="750" textAnchor="middle">$</text>
        </g>
        <path d="M57 220h75q26 0 26-23t26-23h66q23 0 23 22t23 22h73" stroke="#C2A3E0" strokeWidth="7" strokeDasharray="4 12" strokeLinecap="round" />
        <Companion x={193} y={118} scale={.88} />
        <path d="M359 170c-31 0-31 38 0 65 31-27 31-65 0-65Z" fill="#739DFF" /><circle cx="359" cy="193" r="9" fill="#fff" />
      </>;
    case "changed":
      return <>
        <Ground />
        <path d="M128 82h45q42 0 42 57m-87 53h45q42 0 42-53h93" stroke="#fff" strokeWidth="27" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M128 82h45q42 0 42 57" stroke="#739DFF" strokeWidth="6" strokeLinecap="round" />
        <path d="M128 192h45q42 0 42-53" stroke="#C2A3E0" strokeWidth="6" strokeLinecap="round" />
        <path d="M215 139h87m-13-11 13 11-13 11" stroke="#203D82" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="29" y="55" width="104" height="55" rx="16" fill="#BDD0FF" />
        <rect x="29" y="164" width="104" height="55" rx="16" fill="#D8C6EB" />
        <g fill="#182230" fontSize="23" fontWeight="750" textAnchor="middle"><text x="81" y="91">NSW</text><text x="81" y="200">QLD</text></g>
        <Companion x={302} y={86} scale={.98} />
        <path d="M305 53c49-27 112 9 112 62m-9-10 9 12 9-12M394 222c-21 24-65 30-93 10" stroke="#739DFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </>;
    default:
      return <HeroArtwork variant={variant} />;
  }
}

function ReactionArtwork({ reaction }: { reaction: LearningReaction }) {
  if (reaction === "complete") return <>
    <Ground />
    <Companion x={69} y={105} scale={1.03} reaction="complete" />
    <Companion x={287} y={137} kind="blue" scale={.97} reaction="complete" />
    <circle cx="236" cy="90" r="60" fill="#fff" />
    <circle cx="236" cy="90" r="45" fill="#157C50" />
    <path d="m213 90 16 16 30-33" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m56 61 8 12m311-21-9 13M184 214l-5 14m94 3 6 9" stroke="#FFD340" strokeWidth="7" strokeLinecap="round" />
  </>;
  if (reaction === "correct") return <>
    <Ground />
    <Companion x={73} y={97} scale={1.1} reaction="correct" />
    <g transform="translate(231 48) rotate(7 75 88)">
      <rect width="151" height="177" rx="25" fill="#fff" />
      <circle cx="76" cy="75" r="46" fill="#157C50" />
      <path d="m54 76 14 15 29-32" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39 140h75" stroke="#BDD9CA" strokeWidth="8" strokeLinecap="round" />
    </g>
    <circle cx="191" cy="56" r="17" fill="#FFD340" />
  </>;
  return <>
    <Ground />
    <Companion x={77} y={118} kind="blue" scale={1.1} reaction="reflect" />
    <Note x={235} y={56} color="#FFD340" rotate={-7} />
    <Note x={273} y={138} color="#fff" rotate={6} />
    <circle cx="304" cy="177" r="35" fill="#DCE8F3" fillOpacity=".4" stroke="#203D82" strokeWidth="6" />
    <path d="m330 203 30 33" stroke="#203D82" strokeWidth="8" strokeLinecap="round" />
    <circle cx="173" cy="88" r="8" fill="#C2A3E0" /><circle cx="198" cy="71" r="5" fill="#C2A3E0" />
  </>;
}

/** Text and controls carry the meaning; these original scenes supply a consistent visual explanation. */
export function LearningScene({ variant = 0, topic, reaction }: LearningSceneProps) {
  return <svg viewBox="0 0 440 280" fill="none" aria-hidden="true" className="learning-scene">
    {reaction ? <ReactionArtwork reaction={reaction} /> : topic ? <TopicArtwork topic={topic} variant={variant} /> : <HeroArtwork variant={variant} />}
  </svg>;
}

/** A tighter crop lets the companion and the module's central object fill the cover's art region. */
export function LearningCoverArt({ id }: { id: string }) {
  return <svg viewBox="20 20 410 250" fill="none" aria-hidden="true" className="learning-scene learning-cover-art">
    <TopicArtwork topic={id} />
  </svg>;
}

const EXAMPLES = [
  { label: "A reminder", text: "A visible note can hold a next step outside your head.", scene: "A character points to a reminder note placed beside a set of keys.", color: "#FFD340" },
  { label: "One small step", text: "A large task can be broken into a first action that is easier to see.", scene: "A character faces three small steps. An arrow highlights the first step.", color: "#BBD0FF" },
  { label: "Some company", text: "Doing a task alongside another person is sometimes called body doubling.", scene: "Two characters work on their own notes beside one another at a shared table.", color: "#D8C6EB" },
] as const;

/** An example explorer, never a personal assessment or a saved response. */
export function LearningExplorer() {
  const [selected, setSelected] = useState(0);
  const example = EXAMPLES[selected] ?? EXAMPLES[0];
  return <aside className="learning-explorer" aria-label="Explore everyday strategies">
    <p className="learning-overline">TRY AN EXAMPLE</p>
    <h3>Small things, made visible.</h3>
    <div className="learning-example-choices">
      {EXAMPLES.map((example, index) => <button key={example.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} style={{ background: example.color }}>
        <span aria-hidden="true">{index + 1}</span>{example.label}
      </button>)}
    </div>
    <div className="learning-example-visual" role="img" aria-label={example.scene} style={{ maxWidth: 520, margin: "24px auto 0" }}>
      <LearningScene topic="everyday" variant={selected} />
    </div>
    <p className="learning-example-response" role="status">{example.text}</p>
    <small>An illustration of the ideas in this module. Nothing you select is saved.</small>
  </aside>;
}

const CARE_LAYERS = [
  { title: "Before you book", detail: "Ask the practice about its fees, appointment length and whether it is taking new patients." },
  { title: "At the appointment", detail: "The clinician explains what the assessment involves and what information they need." },
  { title: "The next step", detail: "Ask who will hold the plan, when the next review happens and who to contact with questions." },
] as const;

export function CarePathExplorer() {
  const [layer, setLayer] = useState(0);
  const selected = CARE_LAYERS[layer] ?? CARE_LAYERS[0];
  return <aside className="learning-explorer learning-care-explorer" aria-label="Explore the route to care">
    <div>
      <p className="learning-overline">EXPLORE THE ROUTE</p>
      <h3>A conversation, then a next step.</h3>
      <p>Choose a part of the route to see a question worth asking.</p>
      <div className="learning-care-answer" role="status"><strong>{selected.title}</strong><p>{selected.detail}</p></div>
    </div>
    <div className="learning-care-rings">
      {CARE_LAYERS.map((item, index) => <button key={item.title} className={`learning-care-ring ring-${index}`} type="button" aria-pressed={layer === index} onClick={() => setLayer(index)}><span>{item.title}</span></button>)}
    </div>
  </aside>;
}
