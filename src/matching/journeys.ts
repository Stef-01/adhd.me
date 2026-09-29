// Sentences a person would really type, with the asks the finder must hear in each: the matching
// promise in its plainest form. src/matching/journeys.test.ts checks the right clinician comes first
// for each; e2e/matching-journeys.spec.ts checks each takes one Enter and under a second to a list.
// The situations are docs/matching/NEEDS-GAPS.md §2's.

export const JOURNEYS: readonly { says: string; hears: readonly string[] }[] = [
  { says: "an adult ADHD assessment by telehealth", hears: ["care:adhd-assessment", "pref:telehealth-first"] },
  { says: "an assessment for my 9 year old son", hears: ["care:adhd-assessment", "care:child-adolescent-adhd"] },
  { says: "someone to keep prescribing my ADHD medication", hears: ["care:shared-care"] },
  { says: "my medication wears off by lunchtime", hears: ["care:titration"] },
  { says: "a woman GP who bulk bills near Hornsby", hears: ["pref:woman-gp", "pref:bulk-billing"] },
  { says: "a clinician who speaks Mandarin", hears: ["language:mandarin"] },
  { says: "no medication, I want coaching and strategies", hears: ["care:non-medication"] },
  { says: "I need longer appointments, I don't want to be rushed", hears: ["pref:longer-appointment", "manner:unhurried"] },
  { says: "someone who understands autism and ADHD", hears: ["care:autism-adhd"] },
];
