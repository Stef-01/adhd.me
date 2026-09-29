// Simulated patients (docs/matching/RCA-NIGHT-2026-09-29.md, stage 6; the founder, 2026-09-29: "simulating
// patients and then testing how the matching algorithm matches people together"). Each persona is a
// sentence a person would type or say, and the clinicians who must be in the first five, or first,
// for it, read off the roster's own declarations (qa/matching/life-domains.md). The pipeline is the
// finder's: the sentence's kind narrows the roster (src/finder/pipeline.ts), the needs order it.
import { describe, expect, it } from "vitest";
import { clinicians, needsFor, rankClinicians } from "@/demo/clinicians";
import { professionOf } from "@/demo/roster";
import { emptyFilters } from "@/finder/filters";
import { searchRoster } from "@/finder/pipeline";

const COACHES = ["fiona-alexander", "debbie-hirte", "romney-taylor", "erin-lysle", "donna-italiano", "kate-dallimore", "alex-lawson"];
const declares = (id: string, area: string) => {
  const c = clinicians.find((x) => x.id === id)!;
  return c.careAreas.includes(area as never) || (c.careAreasSometimes ?? []).includes(area as never);
};

function firstFive(text: string): string[] {
  const roster = searchRoster(clinicians, emptyFilters(), text, null);
  return rankClinicians(text, roster, new Date("2026-09-30T00:00:00Z"), needsFor(text, roster)).slice(0, 5).map((c) => c.id);
}

type Persona = { said: string; first?: string; within?: { ids: string[]; atLeast: number; of?: number }; all?: (id: string) => boolean; why: string };

const PERSONAS: Persona[] = [
  { said: "help at work with focus and getting things done", within: { ids: COACHES, atLeast: 3 }, first: "alex-lawson", why: "the founder's case: the coaches declare executive function; Alex declares work as well" },
  { said: "I think I have ADHD and want an assessment, telehealth", all: (id) => declares(id, "adhd-assessment"), why: "six declare assessment; nobody else belongs in the first five" },
  { said: "my psychiatrist retired and I need a GP to take over prescribing my Vyvanse", within: { ids: ["yogesh-kalra", "anubhav-saxena"], atLeast: 2, of: 2 }, why: "the two GPs who declare shared care, and the sentence names a GP" },
  { said: "an assessment for my 9 year old, in person in Brisbane", within: { ids: ["lachlan-avent", "meera-lakhani"], atLeast: 2, of: 3 }, why: "assessment and children, both declared, both in Fortitude Valley" },
  { said: "a psychologist who has ADHD herself, telehealth", first: "chantelle-pin", why: "the one psychologist who says she has ADHD" },
  { said: "couples counselling, my marriage is suffering because of my ADHD", all: (id) => declares(id, "relationships"), why: "eight declare relationships" },
  { said: "perimenopause has made my ADHD unmanageable, I want a woman who understands hormones", within: { ids: ["anusha-saxena", "samantha-courtney", "lana-hiscock"], atLeast: 3, of: 4 }, why: "the three women who declare women's health" },
  { said: "binge eating in the evenings once my medication wears off", within: { ids: ["samantha-courtney", "sarah-bibo"], atLeast: 2, of: 3 }, why: "the two who declare eating" },
  { said: "my sleep is a mess and I want a psychologist", first: "lana-hiscock", why: "the one psychologist who declares sleep" },
  { said: "I am on an NDIS plan and need a psychologist in Brisbane", within: { ids: ["kate-row", "jessica-katsamatsas"], atLeast: 2, of: 2 }, why: "the two psychologists who say they see NDIS participants" },
  { said: "someone who understands Indian families, an ADHD assessment", first: "anusha-saxena", why: "assessment and a named background, both declared (with telehealth asked too, the telehealth clinicians who declare a background rightly come first: she sees people in person)" },
  { said: "I was diagnosed at 45 and I'm rethinking everything, a psychologist", within: { ids: ["chantelle-pin", "jessica-katsamatsas", "gisele-fortkamp"], atLeast: 3, of: 3 }, why: "the three psychologists who declare a late diagnosis as their work" },
  { said: "my teenager is falling apart at school, we need help", all: (id) => declares(id, "study-school") || declares(id, "child-adolescent-adhd"), why: "school or children, declared" },
  { said: "grief, my dad passed away and I cannot function", within: { ids: ["valeria-urrutia", "bart-traynor", "samantha-courtney"], atLeast: 3, of: 3 }, why: "the three who declare grief and life changes" },
  { said: "I want to use exercise to manage my ADHD", within: { ids: ["sarah-savage", "yuri-lima", "tom-hissey", "lester-rafanan"], atLeast: 4, of: 4 }, why: "the exercise physiologist and the physios" },
  { said: "help making friends, I mask all day", within: { ids: ["kate-row", "lauren-poulos", "erin-lysle", "flynn-simonis"], atLeast: 4, of: 4 }, why: "the four who declare friendships and social skills" },
  { said: "parenting strategies for my seven year old who melts down", all: (id) => declares(id, "parenting") || declares(id, "child-adolescent-adhd"), why: "parenting or children, declared" },
  { said: "a woman GP for an ADHD assessment who speaks Hindi", first: "anusha-saxena", why: "the woman GP who assesses and speaks Hindi" },
  { said: "I need bulk billing and my scripts continued", first: "yogesh-kalra", why: "bulk billed, continues medication" },
  { said: "trauma and ADHD, someone trauma-informed by telehealth", all: (id) => declares(id, "trauma-informed"), why: "nine declare trauma-informed care" },
  { said: "autism and ADHD assessment for an adult", within: { ids: ["lachlan-avent", "meera-lakhani"], atLeast: 2, of: 2 }, why: "autism and assessment, both declared" },
  { said: "help with burnout at work, a psychologist", within: { ids: ["bart-traynor", "jeff-leech", "jessica-katsamatsas"], atLeast: 3, of: 3 }, why: "the three psychologists who declare work and career" },
  { said: "an exercise physiologist", first: "sarah-savage", why: "the kind" },
  { said: "help getting organised, the bills and paperwork are out of control", all: (id) => declares(id, "executive-function"), why: "ten declare executive function" },
  { said: "Spanish speaking psychologist", first: "valeria-urrutia", why: "the one who speaks Spanish" },
  { said: "I have anxiety and think I might have ADHD, telehealth, someone who has ADHD themselves", first: "chantelle-pin", within: { ids: ["chantelle-pin", "alex-lawson", "trisha-harris"], atLeast: 3, of: 3 }, why: "R17: the three with ADHD themselves, whom a mention of anxiety used to remove" },
  { said: "a physio for chronic pain who gets ADHD", within: { ids: ["lester-rafanan", "tom-hissey", "yuri-lima"], atLeast: 3, of: 3 }, why: "the physios" },
  { said: "my daughter needs an OT, she cannot cope at school", first: "flynn-simonis", why: "the occupational therapist, who declares school" },
  { said: "postpartum, I think I have ADHD, a woman", within: { ids: ["samantha-courtney", "lana-hiscock"], atLeast: 2, of: 3 }, why: "the two women who declare perinatal care" },
  { said: "help with study skills at uni, I keep failing exams", all: (id) => declares(id, "study-school"), why: "twelve declare school and study" },
];

describe("simulated patients: who is in the first five", () => {
  it.each(PERSONAS.map((p) => [p.said, p] as const))("%s", (_said, persona) => {
    const five = firstFive(persona.said);
    const note = `${persona.why}; first five: ${five.join(", ")}`;
    if (persona.first) expect(five[0], note).toBe(persona.first);
    if (persona.within) {
      const top = five.slice(0, persona.within.of ?? 5);
      expect(top.filter((id) => persona.within!.ids.includes(id)).length, note).toBeGreaterThanOrEqual(persona.within.atLeast);
    }
    if (persona.all) for (const id of five) expect(persona.all(id), `${id}: ${note}`).toBe(true);
  });

  it("covers every life domain at least once", () => {
    const areas = ["executive-function", "work-career", "study-school", "parenting", "relationships", "social-connection", "late-diagnosis", "grief-life-change", "sleep", "eating-body", "womens-health", "movement-exercise", "cultural-background"];
    const said = PERSONAS.map((p) => p.said).join(" | ");
    for (const area of areas) {
      const anyDeclarer = clinicians.some((c) => declares(c.id, area));
      expect(anyDeclarer, `${area} has no declarer on the roster`).toBe(true);
    }
    expect(said.length).toBeGreaterThan(0);
    expect(new Set(clinicians.map((c) => professionOf(c))).size).toBeGreaterThan(5);
  });
});
