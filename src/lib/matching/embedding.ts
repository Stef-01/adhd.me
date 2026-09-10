// The embedding layer of the bidirectional matcher (Phase M1). A narrative and a bio become
// vectors; the cosine between them is the "semantic fit" the candidate generator ranks on.
//
// WHY THIS IS LEXICAL AND NOT A MODEL. `src/matching/read.ts` refused a sentence-embedding model
// for the finder because it costs a 20MB+ download and puts a similarity threshold where a
// sentence should be. That argument still holds for the finder. This module is the seam the
// brief asks for (cosine between `narrative_embedding` and `bio_embedding`), built so that the
// vector is a real vector with a real cosine, and so a dense model can replace it behind the same
// `Embedder` interface (Phase M5) without any caller changing. The lexical embedder is:
//
//   * a CONCEPT LAYER, the first `CONCEPTS.length` dimensions, one per closed-vocabulary concept
//     (adult assessment, titration, autism alongside, telehealth, cost, stigma, ...). A concept
//     fires when one of its cues appears in the stemmed text. These dimensions are what the
//     rationale reads back (`sharedConcepts`), which is how "why this GP" is generated from the
//     embedding overlap without ever quoting the patient: a concept has a label, a patient's
//     sentence does not reach the page.
//   * a HASHED STEM LAYER for the rest: every content stem and adjacent stem pair is feature-
//     hashed (FNV-1a, signed) into the remaining dimensions, IDF-weighted when the embedder has
//     been fitted on a corpus (the roster's bios). This is what lets two texts that share no
//     concept still sit closer than two that share nothing.
//
// Deterministic, total, dependency-free: the same text always yields the same vector, garbage
// yields the zero vector rather than a throw, and no randomness exists anywhere in it.

import { CLAUSE_BOUNDARY, stem, tokenise } from "@/matching/read";
import type { Embedding } from "./types";

export interface Embedder {
  readonly dim: number;
  embed(text: string): Embedding;
  /** The concepts the text reaches, best-weighted first. Closed vocabulary. */
  concepts(text: string): ConceptId[];
}

export type ConceptId =
  | "adult-assessment"
  | "child-assessment"
  | "adolescent"
  | "titration"
  | "shared-care"
  | "stimulant-medication"
  | "non-stimulant"
  | "non-medication"
  | "anxiety"
  | "depression"
  | "autism"
  | "trauma"
  | "substance"
  | "emotional-regulation"
  | "telehealth"
  | "in-person"
  | "bulk-billing"
  | "cost"
  | "stigma"
  | "unhurried"
  | "non-judgmental"
  | "collaborative"
  | "sense-making"
  | "steadying"
  | "attuned"
  | "motivating"
  | "culturally-attuned"
  | "prior-assessment"
  | "medication-history"
  | "sleep"
  | "work-study"
  | "family"
  | "women"
  | "long-standing"
  | "school";

export interface Concept {
  id: ConceptId;
  /** The patient-safe phrase a rationale may say. */
  label: string;
  /** Cue phrases, matched as contiguous stems after `tokenise`. */
  cues: readonly string[];
  /** How much a hit is worth in the vector; clinical concepts outrank manner ones. */
  weight: number;
}

export const CONCEPTS: readonly Concept[] = [
  { id: "adult-assessment", label: "adult ADHD assessment", weight: 2, cues: ["adult adhd", "adult assessment", "assessment as an adult", "diagnosed as an adult", "assess adults", "adults with adhd", "adhd assessment", "get assessed", "an assessment", "diagnosis"] },
  { id: "child-assessment", label: "assessing children", weight: 2, cues: ["my son", "my daughter", "my child", "my kid", "children", "child", "paediatric", "kids", "year old"] },
  { id: "adolescent", label: "teenagers", weight: 1.5, cues: ["teenager", "teen", "adolescent", "high school", "year 10", "year 11", "year 12"] },
  { id: "titration", label: "medication titration and review", weight: 2, cues: ["titration", "titrate", "dose", "dosage", "adjust my medication", "medication review", "review my medication"] },
  { id: "shared-care", label: "shared care with a psychiatrist or paediatrician", weight: 1.5, cues: ["shared care", "psychiatrist plan", "my psychiatrist", "paediatrician plan", "care plan"] },
  { id: "stimulant-medication", label: "stimulant medication", weight: 1.5, cues: ["stimulant", "vyvanse", "ritalin", "concerta", "dexamfetamine", "dex", "lisdexamfetamine", "methylphenidate"] },
  { id: "non-stimulant", label: "non-stimulant options", weight: 1.5, cues: ["non stimulant", "atomoxetine", "strattera", "guanfacine", "intuniv", "clonidine"] },
  { id: "non-medication", label: "support beyond medication", weight: 1.5, cues: ["without medication", "not just medication", "alternatives to medication", "no medication", "avoid medication", "beyond medication", "coaching", "strategies"] },
  { id: "anxiety", label: "anxiety alongside ADHD", weight: 1.5, cues: ["anxiety", "anxious", "panic"] },
  { id: "depression", label: "low mood alongside ADHD", weight: 1.5, cues: ["depression", "depressed", "low mood"] },
  { id: "autism", label: "autism alongside ADHD", weight: 1.5, cues: ["autism", "autistic", "audhd", "asd", "neurodivergent", "neurodiversity"] },
  { id: "trauma", label: "a trauma history", weight: 1.5, cues: ["trauma", "ptsd", "abuse"] },
  { id: "substance", label: "a history with alcohol or drugs", weight: 1.5, cues: ["drinking", "alcohol", "substance", "drugs", "cannabis", "weed"] },
  { id: "emotional-regulation", label: "emotional regulation", weight: 1.5, cues: ["emotional regulation", "rejection sensitivity", "rsd", "meltdown", "overwhelm", "big emotions", "emotional dysregulation"] },
  { id: "telehealth", label: "telehealth appointments", weight: 1.2, cues: ["telehealth", "video call", "video appointment", "online appointment", "over the phone", "phone appointment", "remote"] },
  { id: "in-person", label: "in-person appointments", weight: 1.2, cues: ["in person", "face to face", "in the room", "come in"] },
  { id: "bulk-billing", label: "bulk-billing", weight: 1.2, cues: ["bulk bill", "bulk billing", "bulk billed", "no gap"] },
  { id: "cost", label: "keeping cost down", weight: 1.2, cues: ["afford", "cost", "expensive", "money", "cheap", "budget", "concession", "health care card", "pension"] },
  { id: "stigma", label: "feeling safe to be honest", weight: 1.2, cues: ["embarrass", "ashamed", "shame", "judged", "judge me", "stigma", "taken seriously", "dismissed", "believe me", "not believed"] },
  { id: "unhurried", label: "not being rushed", weight: 1, cues: ["rushed", "unhurried", "take their time", "takes time", "time to listen", "listen"] },
  { id: "non-judgmental", label: "no judgement", weight: 1, cues: ["non judgmental", "non judgemental", "without judgement", "no judgement", "safe to be honest"] },
  { id: "collaborative", label: "deciding together", weight: 1, cues: ["collaborative", "decide together", "work with me", "involved in decisions", "my say", "explains the options"] },
  { id: "sense-making", label: "helping it make sense", weight: 1, cues: ["make sense", "understand myself", "understand what is going on", "explain", "sense making"] },
  { id: "steadying", label: "a steadying manner", weight: 1, cues: ["calm", "steady", "settled", "reassuring", "steadying"] },
  { id: "attuned", label: "feeling heard", weight: 1, cues: ["feel heard", "feeling heard", "understood", "attuned", "notices"] },
  { id: "motivating", label: "leaving with a plan", weight: 1, cues: ["plan i can act", "practical", "strengths", "motivating", "next steps"] },
  { id: "culturally-attuned", label: "understanding your background", weight: 1, cues: ["culture", "cultural", "my background", "my community", "my family understands", "same language"] },
  { id: "prior-assessment", label: "an assessment that already exists", weight: 1.2, cues: ["already diagnosed", "was diagnosed", "diagnosed with adhd", "previous assessment", "prior assessment", "assessed before", "report from", "have a diagnosis"] },
  { id: "medication-history", label: "medication history", weight: 1.2, cues: ["on medication", "currently taking", "was on", "used to take", "prescribed", "my script", "prescription"] },
  { id: "sleep", label: "sleep", weight: 1, cues: ["sleep", "insomnia", "can not sleep", "cant sleep"] },
  { id: "work-study", label: "work or study", weight: 1, cues: ["work", "job", "career", "uni", "university", "study", "studying", "exams", "deadlines"] },
  { id: "family", label: "family and parenting", weight: 1, cues: ["parenting", "family", "partner", "marriage", "relationship"] },
  { id: "women", label: "ADHD in women", weight: 1.2, cues: ["women", "woman", "perimenopause", "menopause", "hormones", "pregnancy", "postnatal"] },
  { id: "long-standing", label: "something long-standing", weight: 1, cues: ["since i was", "my whole life", "for years", "since childhood", "since school", "always been", "as a kid", "as a child"] },
  { id: "school", label: "school", weight: 1, cues: ["school", "teacher", "classroom", "school report"] },
];

export const CONCEPT_BY_ID: ReadonlyMap<ConceptId, Concept> = new Map(CONCEPTS.map((c) => [c.id, c]));

export function conceptLabel(id: ConceptId): string {
  return CONCEPT_BY_ID.get(id)!.label;
}

/** Dimensions: one per concept, then the hashed stem space. */
export const HASH_DIM = 224;
export const EMBEDDING_DIM = CONCEPTS.length + HASH_DIM;

const PAIR_WEIGHT = 0.5;

type CompiledCue = { concept: Concept; stems: readonly string[] };

const COMPILED: readonly CompiledCue[] = CONCEPTS.flatMap((concept) =>
  concept.cues.map((cue) => ({ concept, stems: contentStems(cue) })).filter((c) => c.stems.length > 0),
);

/** The content stems of a text, boundary markers removed. */
function contentStems(text: string): string[] {
  return tokenise(text).filter((token) => token !== CLAUSE_BOUNDARY);
}

/** True when `needle` appears as a contiguous run in `haystack`. */
function containsRun(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  outer: for (let i = 0; i + needle.length <= haystack.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

/** FNV-1a over a string, 32-bit. Deterministic, dependency-free. */
function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** The concepts a stemmed token list reaches, in declaration order. */
function detectConcepts(stems: readonly string[]): Concept[] {
  const hit = new Set<Concept>();
  for (const cue of COMPILED) {
    if (hit.has(cue.concept)) continue;
    if (containsRun(stems, cue.stems)) hit.add(cue.concept);
  }
  return CONCEPTS.filter((c) => hit.has(c));
}

export class LexicalEmbedder implements Embedder {
  readonly dim = EMBEDDING_DIM;
  private idf: ReadonlyMap<string, number> = new Map();
  private fittedOn = 0;

  /**
   * Learn inverse document frequencies from a corpus (the roster's bios). Optional: unfitted,
   * every stem weighs 1. Fitting is deterministic and idempotent for the same corpus.
   */
  fit(corpus: readonly string[]): this {
    const df = new Map<string, number>();
    for (const text of corpus) {
      for (const s of new Set(contentStems(text))) df.set(s, (df.get(s) ?? 0) + 1);
    }
    const n = corpus.length;
    const idf = new Map<string, number>();
    for (const [s, count] of df) idf.set(s, Math.log((n + 1) / (count + 1)) + 1);
    this.idf = idf;
    this.fittedOn = n;
    return this;
  }

  /** How many documents the embedder was fitted on; 0 when unfitted. */
  get corpusSize(): number {
    return this.fittedOn;
  }

  private weightOf(s: string): number {
    return this.idf.get(s) ?? 1;
  }

  concepts(text: string): ConceptId[] {
    return detectConcepts(contentStems(text))
      .slice()
      .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
      .map((c) => c.id);
  }

  embed(text: string): Embedding {
    const stems = contentStems(text);
    const vector = new Array<number>(this.dim).fill(0);
    for (const concept of detectConcepts(stems)) {
      vector[CONCEPTS.indexOf(concept)] = concept.weight;
    }
    for (let i = 0; i < stems.length; i++) {
      const s = stems[i]!;
      add(vector, s, this.weightOf(s));
      const next = stems[i + 1];
      if (next !== undefined) add(vector, `${s} ${next}`, PAIR_WEIGHT);
    }
    return normalise(vector);
  }
}

function add(vector: number[], feature: string, weight: number): void {
  const h = fnv1a(feature);
  const slot = CONCEPTS.length + (h % HASH_DIM);
  const sign = (h >>> 31) === 1 ? -1 : 1;
  vector[slot] = (vector[slot] ?? 0) + sign * weight;
}

function normalise(vector: number[]): Embedding {
  let sum = 0;
  for (const v of vector) sum += v * v;
  if (sum === 0) return vector;
  const norm = Math.sqrt(sum);
  return vector.map((v) => v / norm);
}

/**
 * Cosine similarity, clamped to 0 to 1. Both vectors are unit length so this is the dot
 * product; a negative dot (possible from signed hashing) reads as "nothing in common".
 */
export function cosine(a: Embedding, b: Embedding): number {
  if (a.length !== b.length) throw new Error(`cosine: dimension mismatch ${a.length} vs ${b.length}`);
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return Math.max(0, Math.min(1, dot));
}

/** The concepts both texts reach, best-weighted first. What the rationale is allowed to say. */
export function sharedConcepts(embedder: Embedder, a: string, b: string): ConceptId[] {
  const inB = new Set(embedder.concepts(b));
  return embedder.concepts(a).filter((id) => inB.has(id));
}

/** Stem a word the way the embedder does, for callers that need to compare a cue. */
export const stemWord = stem;
