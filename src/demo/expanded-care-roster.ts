import type { Clinician } from "./roster";
import { CARE_NEEDS, type CareNeed } from "@/support/care-preferences";
import { profession, type Profession } from "@/support/professions";

type Scenario = { profession: Profession; needs: CareNeed[]; title: string; cultural?: boolean };
const SCENARIOS: Scenario[] = [
  { profession: "occupational-therapist", needs: ["university-adjustments", "sensory-needs", "autism", "daily-routines"], title: "Study, sensory access and routines" },
  { profession: "exercise-physiologist", needs: ["university-adjustments", "movement", "fatigue", "chronic-pain"], title: "Movement and pacing around university" },
  { profession: "psychologist", needs: ["spiritual-wellbeing", "social-emotional-wellbeing", "family-community", "connection-country", "whole-person", "anxiety", "trauma"], title: "Social, emotional and spiritual wellbeing", cultural: true },
  { profession: "gp", needs: ["whole-person", "spiritual-wellbeing", "family-community", "connection-country", "sleep"], title: "Whole-person ADHD care", cultural: true },
  { profession: "psychologist", needs: ["autism", "anxiety", "depression", "sensory-needs"], title: "ADHD, autism and emotional health" },
  { profession: "psychiatrist", needs: ["bipolar", "ocd", "tics", "substance-use"], title: "Co-occurring mental health needs" },
  { profession: "dietitian", needs: ["eating-concerns", "sensory-needs", "autism", "daily-routines"], title: "Eating and sensory needs" },
  { profession: "sleep-clinician", needs: ["sleep", "fatigue", "whole-person"], title: "Sleep and daytime function" },
  { profession: "occupational-therapist", needs: ["workplace-adjustments", "chronic-pain", "fatigue", "sensory-needs"], title: "Access at work and pacing" },
  { profession: "university-support", needs: ["university-adjustments", "learning-differences", "autism", "sensory-needs"], title: "Study access and learning differences" },
  { profession: "counsellor", needs: ["spiritual-wellbeing", "family-community", "relationships", "trauma"], title: "Relationships, values and belonging" },
  { profession: "relationship-counsellor", needs: ["relationships", "family-community", "whole-person"], title: "Shared routines and relationships" },
  { profession: "adhd-coach", needs: ["university-adjustments", "workplace-adjustments", "daily-routines"], title: "Putting an agreed access plan into practice" },
  { profession: "exercise-physiologist", needs: ["movement", "sleep", "whole-person", "chronic-pain"], title: "Adapted movement and physical health" },
  { profession: "psychologist", needs: ["ocd", "trauma", "anxiety", "depression"], title: "Overlapping psychological needs" },
  { profession: "occupational-therapist", needs: ["spiritual-wellbeing", "social-emotional-wellbeing", "connection-country", "family-community", "university-adjustments", "daily-routines"], title: "Cultural connection and study participation", cultural: true },
];

/**
 * Names for the invented profiles. "Example Psychologist 047" was a placeholder standing where a
 * person's name goes, on the one screen the finder exists to show; a list of them read as a
 * broken directory. These are ordinary Australian names, drawn deterministically so every build
 * lists the same people, and every profile still says it is an example on the row, on the
 * profile and in its practice name. No real person is named: the pairs are generated, and the
 * two real clinicians' surname is excluded.
 */
const GIVEN = [
  "Amelia", "Noah", "Priya", "Lachlan", "Grace", "Kai", "Mei", "Harper", "Aiden", "Zara",
  "Oscar", "Chloe", "Tane", "Isla", "Jasper", "Aroha", "Ethan", "Layla", "Hugo", "Nadia",
  "Riley", "Sienna", "Arjun", "Evie", "Cooper", "Leilani", "Samir", "Ruby", "Felix", "Amara",
  "Theo", "Willow", "Rohan", "Matilda", "Kobe", "Ines", "Angus", "Hana", "Marcus", "Aliyah",
];
const FAMILY = [
  "Nguyen", "Walker", "Papadopoulos", "Singh", "Andersen", "Malouf", "Kaur", "Brennan", "Okoro", "Tanaka",
  "Whitlam", "Rahman", "Costa", "Mitchell", "Jovanovic", "Dawson", "Abebe", "Fraser", "Reyes", "Hartigan",
  "Lim", "Byrne", "Moana", "Petrova", "Halloran", "Ng", "Sullivan", "Farah", "Kelly", "Ibrahim",
  "Marsh", "Chen", "Doyle", "Yilmaz", "Barlow", "Tui", "Hassan", "Pearce", "Vella", "Larkin",
];
const TITLED: ReadonlySet<Profession> = new Set(["gp", "psychiatrist"]);

function exampleName(index: number, kind: Profession): { name: string; shortName: string } {
  const given = GIVEN[(index * 7) % GIVEN.length]!;
  const family = FAMILY[(index * 11 + Math.floor(index / GIVEN.length)) % FAMILY.length]!;
  const name = `${TITLED.has(kind) ? "Dr " : ""}${given} ${family}`;
  return { name, shortName: TITLED.has(kind) ? `Dr ${family}` : given };
}

/** Fourfold example coverage. No new real people, bookings, portraits or availability are invented. */
export function expandedCareExamples(base: readonly Clinician[]): Clinician[] {
  return Array.from({ length: base.length * 3 }, (_, index) => {
    const scenario = SCENARIOS[index % SCENARIOS.length]!;
    const template = base.find(p => (p.profession ?? "gp") === scenario.profession)!;
    const number = String(index + 1).padStart(3, "0");
    const identity = index % 3 === 0 ? ["aboriginal", "torres-strait-islander"] as const : index % 3 === 1 ? ["aboriginal"] as const : ["torres-strait-islander"] as const;
    const { name, shortName } = exampleName(index, scenario.profession);
    return {
      ...template, id: `example-care-${number}`, name,
      shortName, title: profession(scenario.profession).label, profession: scenario.profession,
      practice: "Holistic Care Example Service", image: null, realPerson: undefined, synthetic: true,
      booking: { via: "synthetic-none", note: "Fictional example; there is no appointment to book. Return to the list or find a community-controlled service." },
      acceptingNewPatients: false, capacityDeclaredAt: undefined, disclosedInterest: undefined, disclosedInterestLabel: undefined,
      focus: scenario.title, matchLine: `Example care profile: ${scenario.title.toLowerCase()}.`,
      fitSignals: scenario.needs.map(need => CARE_NEEDS[need]), practicalSignals: [],
      summary: `Fictional example showing support for ${scenario.needs.map(need => CARE_NEEDS[need].toLowerCase()).join(", ")}.`,
      about: "This is a fictional example profile used for trying the finder. It describes nobody.",
      experience: [], expertise: scenario.needs.includes("university-adjustments") ? ["university-adhd"] : [],
      careAreas: ["non-medication"], careAreasSometimes: [], manner: [], approach: scenario.needs.includes("whole-person") ? ["holistic"] : [],
      languages: [...base[index % base.length]!.languages],
      careProfile: { needs: scenario.needs, source: "fictional-example", declaredAt: "2026-09-14",
        ...(scenario.cultural ? { identity: { identities: identity, country: "Demonstration Country (fictional)", publish: true } } : {}) },
    };
  });
}
