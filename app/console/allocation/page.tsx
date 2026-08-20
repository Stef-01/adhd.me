// W236 (O133): one synthetic patient's allocation breakdown, rendered.
//
// THE ALLOCATOR'S FIRST CONSUMER. `matchPatientsToPrescribers` has had a test suite and no
// surface since W236/O79 — the same zero-consumers shape W195 found across seven directory
// modules, where 3,215 lines and 133 tests had nowhere a person could see whether any of it
// said something sensible. A scorer nobody can read is a scorer nobody can check.
//
// EVERY NUMBER HERE IS READ FROM THE MODULE, never recomputed in the page. The weights, the
// normalised sub-scores, the weighted contributions, the total and every sentence come from
// `matchPatientsToPrescribers`, so this surface cannot drift into disagreeing with the thing it
// is displaying — the O1/F2 unity posture applied to a console rather than to a lexicon.
//
// WHY BOTH SIDES ARE SYNTHETIC, said on the page and not just here. The patient is synthetic by
// founder gate, which is absolute. The DOCTORS are synthetic by a second argument: the module
// scores an ASSIGNMENT of a patient to a prescriber, and the finder deliberately does not do
// that — it lists, and a person chooses. Rendering "this patient goes to Dr Saxena" would show
// the product doing something it has decided not to do, using a real doctor's name to do it.

import Link from "next/link";
import {
  CRITERION_WEIGHTS,
  matchPatientsToPrescribers,
  requestFromWords,
  type DoctorRecord,
} from "@/matching/allocation";
import { facetKey, readNeeds } from "@/matching/needs";
import { requireSession } from "../guard";

/** The words a synthetic patient wrote. Everything below is derived from these. */
const PATIENT_WORDS =
  "I want an unhurried GP who bulk bills, does adult ADHD assessment and can review my dose";

const PATIENT = requestFromWords(
  {
    patientRef: "synthetic-patient-1",
    location: "Beecroft",
    insuranceType: "bulk-billing",
    urgency: "this-month",
  },
  PATIENT_WORDS,
);

/**
 * Synthetic prescriber records. Invented people with invented declarations — the names are
 * deliberately not name-shaped, so nobody can mistake a row here for a listing.
 */
const DOCTORS: readonly DoctorRecord[] = [
  {
    doctorRef: "prescriber-A",
    specialty: "adhd-prescribing-gp",
    location: "Beecroft",
    capacity: { booked: 40, limit: 60 },
    waitDays: 14,
    insuranceAccepted: ["bulk-billing", "medicare-gap"],
    communicationStyle: ["unhurried", "sense_making"],
    careAreas: ["adhd-assessment", "titration"],
  },
  {
    doctorRef: "prescriber-B",
    specialty: "adhd-prescribing-gp",
    location: "Hornsby",
    capacity: { booked: 55, limit: 60 },
    waitDays: 40,
    insuranceAccepted: ["bulk-billing"],
    communicationStyle: ["structured"],
    careAreas: ["adhd-assessment"],
  },
  {
    doctorRef: "prescriber-C",
    specialty: "adhd-prescribing-gp",
    location: "Double Bay",
    capacity: { booked: 60, limit: 60 },
    waitDays: 7,
    insuranceAccepted: ["private"],
    communicationStyle: ["unhurried"],
    careAreas: ["adhd-assessment", "titration"],
  },
];

const REFUSAL_COPY: Record<string, string> = {
  insurance_not_accepted: "Does not accept the billing arrangement this patient asked for",
  at_capacity: "Declared list is full",
  specialty_mismatch: "Does not prescribe in the scope this run requires",
};

export default async function AllocationConsolePage() {
  await requireSession();
  const [result] = matchPatientsToPrescribers([PATIENT], DOCTORS);
  const derived = readNeeds(PATIENT_WORDS);

  return (
    <main className="mc">
      <header className="mc-head">
        <Link href="/console" className="mc-back">Console</Link>
        <h1>One allocation, worked through</h1>
        <p className="mc-lead">
          Both sides of this are invented. The patient is synthetic, and so are the prescribers —
          the finder lists GPs and a person chooses; it does not assign anybody to anybody, so
          nothing here is run against the real roster.
        </p>
      </header>

      <section className="mc-section" aria-labelledby="words-h">
        <h2 id="words-h">What the patient wrote</h2>
        <p className="mc-query">“{PATIENT_WORDS}”</p>
        {/* O132: the allocator reads this through the finder's own reader, so the vocabulary
            below is the same vocabulary the patient-facing product would derive. Shown rather
            than asserted — a wiring nobody can see is a wiring nobody checks. */}
        <h3 className="mc-sub">What those words reached, through the finder's reader</h3>
        <ul className="mc-asked">
          {derived.map((need) => (
            <li key={facetKey(need.facet)}>
              <span className="mc-tag">{need.label}</span>
              <span className="mc-asked-from">reached by &ldquo;{need.matched}&rdquo;</span>
            </li>
          ))}
        </ul>
        <p className="mc-note">
          Stated timing preference: {PATIENT.urgency.replace("-", " ")}. It is the patient&rsquo;s own
          statement and is never read out of their words — a priority inferred from what somebody
          wrote would be a clinical judgement this product does not make.
        </p>
      </section>

      <section className="mc-section" aria-labelledby="score-h">
        <h2 id="score-h">How each prescriber scored</h2>
        {result?.tieNote && <p className="mc-note">{result.tieNote}</p>}
        {result?.matches.map((match) => (
          <div key={match.doctorRef} className="mc-clinician" data-testid={`alloc-${match.doctorRef}`}>
            <h3 className="mc-sub">{match.doctorRef} · {match.total}</h3>
            <div className="mc-table-wrap">
              <table className="mc-table">
                <thead>
                  <tr><th>Criterion</th><th>Weight</th><th>Score</th><th>Contributes</th><th>Why</th></tr>
                </thead>
                <tbody>
                  {match.breakdown.map((row) => (
                    <tr key={row.criterion}>
                      <td>{row.criterion}</td>
                      <td className="mc-num">{Math.round(row.weight * 100)}%</td>
                      <td className="mc-num">{row.raw}</td>
                      <td className="mc-num">{row.weighted}</td>
                      <td>{row.sentence}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <p className="mc-note">
          The five weights are global and stated: {Object.entries(CRITERION_WEIGHTS)
            .map(([name, weight]) => `${name} ${Math.round(weight * 100)}%`)
            .join(", ")}. Every total is the sum of the contributions printed beside it.
        </p>
      </section>

      <section className="mc-section" aria-labelledby="excluded-h">
        <h2 id="excluded-h">Who was excluded, and why</h2>
        {/* A refusal is never silent (W236): every filtered pair carries every reason that
            applied, so a prescriber missing from the list above is always accounted for. */}
        {result && result.excluded.length === 0 ? (
          <p className="mc-empty">Nobody was filtered out of this run.</p>
        ) : (
          <ul className="mc-told">
            {result?.excluded.map((row) => (
              <li key={row.doctorRef}>
                <span className="mc-told-said">{row.doctorRef}</span>
                <span className="mc-told-from">
                  {row.reasons.map((reason) => REFUSAL_COPY[reason] ?? reason).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
