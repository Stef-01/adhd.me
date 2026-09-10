"use client";

// The drawn pieces (docs/design/games-to-leo-standard.md §3, "Pieces"): every thing a round throws
// at you, holds up, or asks you to sort is a small drawing, not a text chip. One glyph per kind of
// thing, 24 by 24, stroke only, in the simple-shape idiom of the beans; the kind is read off the
// round's own words (a "phone" is a phone, "the report" a sheet, "coffee" a mug), with the scene's
// prop as the fallback. Decorative throughout: the word beside it carries the meaning, so the
// glyph is `aria-hidden` and never changes an accessible name.

import type { Prop } from "@/learn/interactive";
import type { Layer } from "@/model/layers";

export type GlyphKind =
  | "phone" | "bubble" | "window" | "thought" | "people" | "clock" | "moon" | "play" | "sheet" | "mug" | "bowl"
  | "apple" | "egg" | "key" | "shoe" | "shirt" | "bin" | "coin" | "book" | "bottle" | "steps" | "flame" | "spark"
  | "bell" | "calendar" | "table" | "tag" | "sun";

const RULES: ReadonlyArray<readonly [RegExp, GlyphKind]> = [
  [/coffee|\bmug\b|\btea\b|kettle/, "mug"],
  [/\begg/, "egg"],
  [/apple/, "apple"],
  [/yoghurt|oats|beans|nuts|lunch|dinner|roast|toast|food|\beat|meal|snack|chips|loll|feed|plate/, "bowl"],
  [/water|bottle|milk/, "bottle"],
  [/\bkeys?\b|\block/, "key"],
  [/shoe|\bkit\b|\bgym\b|\brun\b|running/, "shoe"],
  [/wear|wash|fold|clothes/, "shirt"],
  [/\bbins?\b/, "bin"],
  [/parcel|package|remote/, "tag"],
  [/rent|fee|buy|\bsale\b|\bads?\b|storage|streaming|subscri|cash|price|\$/, "coin"],
  [/restaurant|book the|birthday|calendar|\bdue\b|by friday|date/, "calendar"],
  [/\bbook\b|chapter|\bread/, "book"],
  [/bill|rego|statement|form|report|brief|essay|slide|draft|script|source|note|title|sentence|file|list|card|chart|summary|intro|font|stamp|work|edit|delete|recipe|improve/, "sheet"],
  [/video|clip|screen|scroll|likes|\btv\b|feed|show|scrol/, "play"],
  [/phone|charger/, "phone"],
  [/message|ping|chat|text|email|call|quick one|reply|\bsure\b|\byes\b|landlord|plumber/, "bubble"],
  [/window/, "window"],
  [/thought|think|idea|song/, "thought"],
  [/crowd|colleague|people|person|friend|visit|mate|\bsam\b|\bnan\b|\bmum\b|manager|partner|someone|somebody|company/, "people"],
  [/alarm|snooze|ring/, "bell"],
  [/sleep|night|3am|tired|\bbed\b|dark|late/, "moon"],
  [/clock|time|hour|minute|\d+\s?[ap]m|tomorrow|\bnow\b|later|today/, "clock"],
  [/heat|\bhot\b|threshold|wall|argument|row\b/, "flame"],
  [/walk|foot|step|door|\bout\b/, "steps"],
  [/table/, "table"],
  [/sun|morning|light/, "sun"],
  [/electric|power|energy/, "spark"],
];

const BY_PROP: Readonly<Record<Prop, GlyphKind>> = {
  desk: "sheet", phone: "phone", bill: "sheet", ball: "spark", lecture: "sheet", bed: "moon", kitchen: "mug", calendar: "calendar",
  door: "key", living: "table", meeting: "sheet", crossing: "steps", shop: "coin", street: "steps", study: "clock", none: "spark",
};

export function glyphKind(text: string, prop: Prop = "none"): GlyphKind {
  const t = text.toLowerCase();
  for (const [re, kind] of RULES) if (re.test(t)) return kind;
  return BY_PROP[prop];
}

const ART: Readonly<Record<GlyphKind, React.ReactNode>> = {
  phone: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></>,
  bubble: <><path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M8 9h8M8 12h5" /></>,
  window: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 3v18M4 12h16" /></>,
  thought: <><path d="M8 15a3.5 3.5 0 0 1 .5-7 5 5 0 0 1 9.5 1 3 3 0 0 1 0 6z" /><circle cx="7" cy="18.5" r="1.5" /><circle cx="4.5" cy="21.5" r="1" /></>,
  people: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="9" r="3" /><path d="M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  moon: <path d="M20 14a8 8 0 1 1-10-10 6 6 0 0 0 10 10z" />,
  play: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></>,
  sheet: <><path d="M6 2h8l4 4v16H6z" /><path d="M9 11h6M9 15h6" /></>,
  mug: <><path d="M5 8h11v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M16 10h2a2 2 0 0 1 0 4h-2M8 5V3M11 5V3" /></>,
  bowl: <><path d="M4 11h16a8 8 0 0 1-16 0z" /><path d="M8 20h8" /></>,
  apple: <><path d="M12 7c-4-3-8 0-8 5s3 9 5 9 2-1 3-1 1 1 3 1 5-4 5-9-4-8-8-5z" /><path d="M12 7c0-2 1-4 3-4" /></>,
  egg: <path d="M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z" />,
  key: <><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></>,
  shoe: <path d="M3 16l3-6h4l3 3 6 2a2 2 0 0 1 2 2v1H3z" />,
  shirt: <path d="M8 3l4 2 4-2 5 4-3 3-1-1v12H7V9L6 10 3 7z" />,
  bin: <path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14" />,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></>,
  book: <path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" />,
  bottle: <path d="M10 2h4v4l2 3v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9l2-3z" />,
  steps: <path d="M7 20c-2-3-2-7 0-9s4 0 4 3-2 6-4 6zM15 14c-2-3-2-7 0-9s4 0 4 3-2 6-4 6z" />,
  flame: <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />,
  spark: <path d="M13 2L5 13h6l-1 9 9-12h-6z" />,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  table: <path d="M3 8h18M5 8v12M19 8v12M8 14h8" />,
  tag: <><path d="M3 12l9-9h9v9l-9 9z" /><circle cx="16" cy="8" r="1.5" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
};

export function Glyph({ text, prop, size = 22, className }: { text: string; prop?: Prop; size?: number; className?: string }) {
  const kind = glyphKind(text, prop);
  return (
    <svg className={className ? `play-glyph ${className}` : "play-glyph"} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" data-glyph={kind}>
      {ART[kind]}
    </svg>
  );
}

const LAYER_ART: Readonly<Record<Layer, React.ReactNode>> = {
  brain: <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h3V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h-3V4z" />,
  body: <path d="M12 21s-8-5-8-11a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 6-8 11-8 11z" />,
  environment: <path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z" />,
  people: ART.people,
};

/** The four layers as trays (PLAY-PLAN §3 sort): a head, a heart, a house, two people. */
export function LayerGlyph({ layer, size = 26 }: { layer: Layer; size?: number }) {
  return (
    <svg className="play-glyph play-layer-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {LAYER_ART[layer]}
    </svg>
  );
}
