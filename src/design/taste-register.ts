// AR1: the taste law becomes a register.
//
// `.claude/skills/adhdme-taste/SKILL.md` is prose, and prose cannot be asserted against — a rule
// can be written there and never checked, or a check can drift from the rule it was written for,
// and no build failure occurs in either case (the premise `docs/AESTHETIC-REVIEW-PLAN.md` opens
// with). This module is the law's machine-readable twin: one entry per rule, carrying the section
// it lives in, a one-line statement, and the incident that produced it.
//
// Every rule in the skill file carries a stable id in `{#id}` at the end of its bullet. The test
// (`taste-register.test.ts`) parses that file and pins agreement in BOTH directions against the
// list below — a rule in the file and not the register fails the build, and so does the reverse.
// Neither this list nor the prose is the sole source; drift between them is a build error.

export type TasteSection =
  | "layout"
  | "type-colour"
  | "interaction"
  | "motion"
  | "honesty"
  | "review-procedure";

export interface TasteRule {
  /** Stable id, matching the `{#id}` marker on the rule's bullet in SKILL.md. */
  id: string;
  section: TasteSection;
  /** One-line statement of the rule. */
  statement: string;
  /**
   * The incident that produced this rule — a ledger unit (`O14`, `W167`, …) where the tree's own
   * record shows the violation being found and fixed, per `git log`/`docs/DESIGN-QA.md` archaeology
   * done for AR1. Where no single fix-incident could be traced (the rule predates this tree's
   * per-unit design record, or names a process rather than a fix), that is stated rather than
   * invented — a wrong citation is worse than an honest gap (see this tree's "report the
   * disagreement" law, `docs/AESTHETIC-REVIEW-PLAN.md` §Standing constraints).
   */
  incident: string;
}

export const TASTE_RULES: readonly TasteRule[] = [
  {
    id: "layout.one-idea",
    section: "layout",
    statement:
      "A screen states one thing; controls live inside the statement (the mix hero pattern), never beside it competing.",
    incident: "O24 — GP join landing (patient-mix hero) + whole-surface declutter audit",
  },
  {
    id: "layout.fold-governed",
    section: "layout",
    statement:
      "Nothing above the fold that is not the idea; a fold may never cut a tied band or separate a claim from its qualifier.",
    incident: "W167 — the order-independence fold register (cited directly in the rule)",
  },
  {
    id: "layout.shared-row",
    section: "layout",
    statement:
      "Related facts share a row — a label and its evidence, a name and its distance — rather than requiring the reader to scan two regions to join one fact.",
    incident: "O24 — GP join landing (patient-mix hero) + whole-surface declutter audit",
  },
  {
    id: "layout.five-then-rest",
    section: "layout",
    statement:
      "Long lists show a chooseable few with the remainder one tap away; never render an unbounded list as the default state.",
    incident:
      "predates this tree's per-unit design record — no single fix traced; carried from the initial design baseline",
  },
  {
    id: "type.serif-display",
    section: "type-colour",
    statement: "Serif (Newsreader) at display scale for statements; the sans carries controls and body.",
    incident:
      "predates this tree's per-unit design record — the original typographic choice (CLAUDE.md: this tree chose Newsreader on paper deliberately)",
  },
  {
    id: "type.accent-live-tokens",
    section: "type-colour",
    statement: "Accent colour is reserved for live tokens — the value that changes, the word that matters.",
    incident: "O130 — the accent pointed at the wrong thing, and it was a fossil; generalised by O176",
  },
  {
    id: "type.numeric-typography",
    section: "type-colour",
    statement:
      "tabular-nums wherever numbers change or align; curly quotes, real ellipses, non-breaking spaces inside names and units.",
    incident: "W42 — practice-facing results page (first 'numbers use tabular-nums so columns align' record)",
  },
  {
    id: "type.palette-tokens",
    section: "type-colour",
    statement: "Palette tokens only; no raw hex in components.",
    incident: "O96 — globals.css sectioned, with a machine-checked proof",
  },
  {
    id: "interaction.touch-44",
    section: "interaction",
    statement:
      "44px minimum touch target; decorative smaller visuals may render smaller but the hit area meets the floor.",
    incident: "O14 (cited directly in the rule); enforcement generalised by O145 and O170",
  },
  {
    id: "interaction.hover-focus",
    section: "interaction",
    statement:
      "Hover styles gated behind @media (hover: hover); touch-action: manipulation on controls; visible :focus-visible ring, never outline: none without a replacement.",
    incident: "O147 — the focus law, made executable",
  },
  {
    id: "interaction.errors-plain",
    section: "interaction",
    statement: "Errors are plain sentences with a way out, never error-code language on a patient surface.",
    incident: "O46 — the unearned headline and the mic that stops on its own",
  },
  {
    id: "motion.carries-meaning",
    section: "motion",
    statement:
      "Motion must carry meaning: a value resolving, an order re-sorting, an object staying itself across screens. Nothing that merely draws the eye.",
    incident: "O127 — the motion queue, closed honestly",
  },
  {
    id: "motion.reduced-motion",
    section: "motion",
    statement:
      "prefers-reduced-motion is fully honoured — every effect has a static equal, checked at the hook, not just in CSS.",
    incident: "O127 — the motion queue, closed honestly; gaps found later by O141",
  },
  {
    id: "motion.autoplay-stop",
    section: "motion",
    statement: "Indefinite autoplay needs a stop: pause on hover, stop on engagement.",
    incident: "O29 — web-guidelines audit + micro-polish",
  },
  {
    id: "motion.consult-view-transitions",
    section: "motion",
    statement:
      "Consult react-view-transitions for shared-element and route transitions before reaching for bespoke animation.",
    incident: "process recommendation, not a fix — points at the vendored react-view-transitions skill",
  },
  {
    id: "honesty.claim-earned",
    section: "honesty",
    statement: "A claim renders only when it is earned; counts stand alone otherwise.",
    incident: "O46 — the unearned headline and the mic that stops on its own",
  },
  {
    id: "honesty.no-testimonials",
    section: "honesty",
    statement: 'No testimonials, ratings, or "specialist/specialise" anywhere a patient reads.',
    incident: "W11 — the first design-QA checklist pass (2026-08-08); CLAUDE.md law 6",
  },
  {
    id: "honesty.clinician-declaration",
    section: "honesty",
    statement: "Copy about a clinician is their declaration, never our characterisation.",
    incident: "O58 — Dr Anusha Saxena's background, in her own supply",
  },
  {
    id: "honesty.qa-capture",
    section: "honesty",
    statement: "Every new/changed screen ships with a qa/ capture and a docs/DESIGN-QA.md entry.",
    incident: "O143 — the design record had been silently falsified",
  },
  {
    id: "review.screenshot-both-viewports",
    section: "review-procedure",
    statement: "Screenshot the surface at 390x844 and desktop (Playwright against the prod build).",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
  },
  {
    id: "review.walk-fix-smallest",
    section: "review-procedure",
    statement: "Walk the checklists above; fix in place, smallest diff.",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
  },
  {
    id: "review.recapture-record",
    section: "review-procedure",
    statement: "Re-capture, record the before/after in docs/DESIGN-QA.md, keep captures in qa/.",
    incident: "W11 — the first design-QA checklist pass (2026-08-08)",
  },
];

const SECTION_HEADINGS: Readonly<Record<string, TasteSection>> = {
  Layout: "layout",
  "Type & colour": "type-colour",
  Interaction: "interaction",
  Motion: "motion",
  "Honesty gates": "honesty",
  "Review procedure": "review-procedure",
};

export interface SkillRule {
  id: string;
  section: TasteSection;
}

/**
 * Parse `SKILL.md`'s rule bullets — one entry per `{#id}`-marked list item, grouped by the `## `
 * heading it falls under. A bullet's text may wrap across several lines (the file is prose), so a
 * line starting a new bullet or heading, or a blank line, closes the previous item before its
 * marker is searched for.
 *
 * Returns `unmarked` separately: real content lines under a rule heading that never resolved into
 * a marked bullet (dropped `{#id}`, or a genuinely new rule nobody gave an id) — those are a
 * failure in the file, not the register, and the test reports them by name rather than silently
 * excluding them from the count.
 */
export function parseSkillRules(markdown: string): { rules: SkillRule[]; unmarked: string[] } {
  const rules: SkillRule[] = [];
  const unmarked: string[] = [];
  let section: TasteSection | null = null;
  let item: string[] | null = null;

  const flush = () => {
    if (!item || !section) {
      item = null;
      return;
    }
    const text = item.join(" ").trim();
    const match = /\{#([a-z0-9.-]+)\}\s*$/.exec(text);
    if (match) rules.push({ id: match[1]!, section });
    else unmarked.push(text);
    item = null;
  };

  for (const rawLine of markdown.split("\n")) {
    const heading = /^##\s+(.+?)\s*(?:\(.*)?$/.exec(rawLine);
    if (heading) {
      flush();
      const key = heading[1]!.trim();
      section = SECTION_HEADINGS[key] ?? null;
      continue;
    }
    if (!section) continue;
    if (/^\s*(?:-|\d+\.)\s/.test(rawLine)) {
      flush();
      item = [rawLine.trim()];
    } else if (rawLine.trim() === "") {
      flush();
    } else if (item) {
      item.push(rawLine.trim());
    }
  }
  flush();

  return { rules, unmarked };
}

export interface TasteRegisterDiff {
  /** Rule ids marked in SKILL.md with no register entry. */
  missingFromRegister: string[];
  /** Register entries whose id is not marked on any bullet in SKILL.md. */
  staleInRegister: string[];
  /** Ids marked more than once in SKILL.md. */
  duplicateInSkillFile: string[];
  /** Content bullets under a rule heading that never resolved to a `{#id}` marker. */
  unmarkedInSkillFile: string[];
  /** Ids whose SKILL.md section disagrees with the register's `section` field. */
  sectionMismatch: string[];
}

export function diffTasteRegister(skillMarkdown: string, register: readonly TasteRule[] = TASTE_RULES): TasteRegisterDiff {
  const { rules: skillRules, unmarked } = parseSkillRules(skillMarkdown);

  const seen = new Set<string>();
  const duplicateInSkillFile: string[] = [];
  for (const r of skillRules) {
    if (seen.has(r.id)) duplicateInSkillFile.push(r.id);
    seen.add(r.id);
  }

  const skillIds = new Set(skillRules.map((r) => r.id));
  const registerIds = new Set(register.map((r) => r.id));
  const skillSectionById = new Map(skillRules.map((r) => [r.id, r.section]));

  return {
    missingFromRegister: [...skillIds].filter((id) => !registerIds.has(id)).sort(),
    staleInRegister: [...registerIds].filter((id) => !skillIds.has(id)).sort(),
    duplicateInSkillFile: [...new Set(duplicateInSkillFile)].sort(),
    unmarkedInSkillFile: unmarked,
    sectionMismatch: register
      .filter((r) => skillSectionById.has(r.id) && skillSectionById.get(r.id) !== r.section)
      .map((r) => r.id)
      .sort(),
  };
}
