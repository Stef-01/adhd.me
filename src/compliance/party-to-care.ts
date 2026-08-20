// W138: ADHD.ME is not a party to anyone's clinical care, and no surface may suggest otherwise.
//
// W89 drew this line for specialists and W134 drew it between practices. Neither covers the
// case this unit does: whether the PRODUCT reads as a participant in care. That is a different
// question with a different failure mode, and it fails by wording rather than by architecture.
//
// Why it matters concretely, rather than as a compliance formality:
//
//   1. A PATIENT WHO BELIEVES ADHD.ME IS INVOLVED IN THEIR CARE WILL BRING IT PROBLEMS. "ADHD.ME
//      will review your results" invites somebody to wait on us for something we will never do,
//      and the waiting is the harm — they are not chasing their practice because they think it
//      is handled. This is the same shape as W134's blur, one layer out.
//   2. IT CHANGES WHAT WE ARE. A service that holds itself out as providing or directing care
//      is a different regulated thing from software a practice operates, with different Ahpra
//      advertising exposure (s 133) and a different answer to whose duty of care is engaged.
//      Nobody decides to become that; you become it one sentence at a time.
//   3. IT IS THE FOUNDER'S EXPOSURE, NOT OURS. The practice is the treating entity and the
//      sender of every message. Copy implying we share that role misdescribes who is
//      accountable when something goes wrong.
//
// So: the statement is written ONCE, here, and the surfaces render it rather than paraphrasing
// it (the W23 `LANDING_COPY` pattern — a claim restated in four places is four claims).
//
// The linter is the harder half. It looks for ADHD.ME AS THE SUBJECT OF A CARE VERB, which is
// the actual failure — not for clinical words, which appear legitimately all over a healthcare
// product. "Your GP will review the results" is correct and must pass; "we will review your
// results" must not. That distinction is the whole design, and the tests assert both halves,
// because a linter that fires on correct copy gets switched off within a month (the W23
// `no-ratings` rule has already blocked correct wording three times — see the dossier).
//
// THIS RULE CARRIES MORE WEIGHT HERE THAN IT DID FOR THE PRODUCT IT WAS WRITTEN FOR, and the
// reason is worth stating so nobody relaxes it later. `assess` and `diagnos` are already in
// CARE_VERBS, and an ADHD ASSESSMENT product says both words constantly and legitimately —
// "your GP completes the assessment", "the psychiatrist confirms the diagnosis". The rule only
// fires when WE are the grammatical subject, which is exactly the sentence this product is most
// tempted to write ("we assess your ADHD") and least entitled to. Diagnosing ADHD is a clinical
// act performed by a clinician; software that claims it is making a claim about itself that is
// both false and regulated. So the narrowness is load-bearing, not incidental.
//
// A NOTE ON THE BRAND TOKEN. The product is written "ADHD.ME", with a dot. An unescaped dot in
// a regex matches any character, so the token is escaped, and both the dotted brand and the
// hyphenated package/slug form are matched — copy is written either way in practice and a
// linter that only knows one spelling protects only half the surfaces.

/** The canonical statement. Rendered, never paraphrased. */
export const RESPONSIBILITY_STATEMENT =
  "Your practice provides your care. ADHD.ME is software your practice uses to offer you " +
  "appointment times. It does not provide treatment, does not give clinical advice, and is " +
  "not part of your care team. Anything about your health goes to your practice, not to us.";

/** The same point for the practice-facing side, where the reader is the treating entity. */
export const PRACTICE_RESPONSIBILITY_STATEMENT =
  "Your practice remains the treating entity and the sender of every message. ADHD.ME schedules " +
  "and reports; it makes no clinical decision and holds no clinical responsibility for any " +
  "patient.";

export interface PartyToCareFinding {
  rule: string;
  match: string;
  explanation: string;
}

/**
 * How the product refers to itself in prose. Both spellings, dot escaped — see the header note.
 */
const BRAND = String.raw`adhd(?:\.|-)me`;

/**
 * The first-person subjects a surface might speak as. The brand catches third-person copy about
 * ourselves; the pronouns catch the more common first-person voice.
 */
const SUBJECT = String.raw`(?:${BRAND}|we|our)`;

/**
 * Verbs only a treating clinician uses, whatever follows them. Subject plus verb is enough.
 *
 * This list used to hold `assess`, `treat` and `monitor` too, under the assumption written here
 * at the time: "each is a thing only a treating clinician does, so a false positive means the
 * copy really did say we do it." O97 found that assumption false, on our own privacy policy. The
 * Notifiable Data Breaches paragraph says "if we suspect information we hold has been lost … we
 * will assess it promptly" — a statutory obligation, whose object is a breach — and the rule read
 * it as ADHD.ME offering clinical assessment. The three ordinary-English verbs moved to the list
 * below rather than being deleted, and the copy was NOT reworded: a compliance linter that makes
 * a legal duty get vaguer to please a regex is doing the opposite of its job.
 */
const CARE_VERBS = [
  "diagnos",
  "prescrib",
  "examine",
  "manage your care",
  "manage your condition",
  "review your results",
  "review your symptoms",
  "look after",
  "care for you",
];

/**
 * Verbs that are clinical ONLY when their object is a person or a person's health. A product
 * that publishes a privacy policy and a security page will write "assess a breach", "treat data
 * carefully" and "monitor uptime", and none of those says anything about care.
 */
const AMBIGUOUS_CARE_VERBS = ["treat", "assess", "monitor"];

/**
 * What makes one of those verbs clinical. An ALLOWLIST of clinical objects, never a denylist of
 * innocent ones: the clinical side is the enumerable side, and a denylist would have to imagine
 * every non-clinical noun the product might ever assess.
 *
 * KNOWN LIMIT, pinned in the tests as today's truth: `your` is here because "we monitor your
 * blood pressure" must keep failing and the roster of health nouns after `your` is not
 * enumerable either — so "we treat your data with care" would still be flagged. That sentence
 * is not in this tree, and if it is ever written it earns its own narrowing with a real
 * sentence attached, the way this rule earned its split.
 */
const CLINICAL_OBJECT = String.raw`(?:you|your|patients?|adhd|symptoms?|conditions?|diagnos(?:is|es)|dose|dosage|medications?|health|anyone|someone|anybody|somebody)`;

interface Rule {
  name: string;
  pattern: RegExp;
  explanation: string;
}

const RULES: Rule[] = [
  {
    name: "adhd-me-as-care-provider",
    // "ADHD.ME can diagnose", "our team will prescribe" — the subject is us and the verb is
    // care whatever follows it. Up to four words between them absorbs "will", "can", "may also".
    pattern: new RegExp(
      String.raw`\b${SUBJECT}\b(?:\s+\w+){0,4}\s+\b(?:${CARE_VERBS.join("|")})`,
      "i",
    ),
    explanation:
      "This says ADHD.ME provides or directs care. The practice is the treating entity — describe what the practice does, not what we do.",
  },
  {
    // Same finding, same name — a reader of the output should not have to know the rule was
    // split — but the object has to be a person or their health before it counts. "we treat
    // patients", "ADHD.ME will assess whether you need to be seen" and "we monitor your blood
    // pressure" all fail here; "we will assess it promptly" (a data breach) does not. The
    // object window is the same four words of slack, so an adverb or a determiner between the
    // verb and its object does not let a real claim through.
    name: "adhd-me-as-care-provider",
    pattern: new RegExp(
      String.raw`\b${SUBJECT}\b(?:\s+\w+){0,4}\s+\b(?:${AMBIGUOUS_CARE_VERBS.join("|")})\w*\b(?:\s+\w+){0,4}\s+\b${CLINICAL_OBJECT}\b`,
      "i",
    ),
    explanation:
      "This says ADHD.ME provides or directs care. The practice is the treating entity — describe what the practice does, not what we do.",
  },
  {
    name: "adhd-me-owns-clinicians",
    // "our doctors", "ADHD.ME's GPs", "your ADHD.ME clinician". Clinicians belong to practices.
    // Especially tempting on an assessment product, where the directory makes the clinicians feel
    // like ours — they are the practices', and a patient's complaint has to land somewhere real.
    pattern: new RegExp(
      String.raw`\b(?:our|${BRAND}(?:'s|’s)?)\s+(?:gps?|doctors?|clinicians?|nurses?|practitioners?|specialists?|psychiatrists?|paediatricians?|psychologists?|assessors?|care team|clinical team|medical team|assessment team)\b`,
      "i",
    ),
    explanation:
      "Clinicians are the practice's, not ADHD.ME's. Naming them as ours implies we employ or direct them.",
  },
  {
    name: "adhd-me-as-care-team",
    pattern: new RegExp(
      String.raw`\b(?:${BRAND}|we)\s+(?:are|is|am)\s+(?:part of|a member of|on)\s+(?:your|the)\s+care team\b`,
      "i",
    ),
    explanation: "ADHD.ME is not part of anyone's care team, and must not say it is.",
  },
  {
    name: "send-us-clinical",
    // "tell us your symptoms", "send us your results" — invites a patient to route clinical
    // matters to software, which is exactly the waiting-on-us harm. `screener` and `questionnaire`
    // are in the object list because this product's whole front door is a self-check: "send us
    // your screener score" is the single most likely way it would invite that mistake.
    pattern: new RegExp(
      String.raw`\b(?:tell|send|report(?:\s+\w+){0,2}|give|share)\s+(?:us|${BRAND})\b(?:\s+\w+){0,3}\s+\b(?:symptom|result|condition|diagnos|medication|health concern|screener|questionnaire)`,
      "i",
    ),
    explanation:
      "This routes a clinical matter to ADHD.ME. Anything about a patient's health goes to their practice.",
  },
];

/**
 * Lint one surface's text.
 *
 * Returns every rule that fired, with what matched, so a failure names the sentence rather than
 * the page. A linter whose output is "this page is non-compliant" gets ignored.
 */
export function lintPartyToCare(text: string): PartyToCareFinding[] {
  const findings: PartyToCareFinding[] = [];
  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (match) {
      findings.push({ rule: rule.name, match: match[0], explanation: rule.explanation });
    }
  }
  return findings;
}

/**
 * Rule names, for tests that assert the rule set has not silently shrunk.
 *
 * Deduplicated since O97: one name can now be carried by more than one pattern (the
 * care-provider rule has an unconditional arm and an object-conditional one), and a reader of
 * a finding should not have to know which arm caught them. The census still does its job — it
 * is the NAMES that must not disappear — and it caught this change on the way through, which
 * is the tripwire working rather than complaining.
 */
export const PARTY_TO_CARE_RULES: readonly string[] = [...new Set(RULES.map((r) => r.name))];
