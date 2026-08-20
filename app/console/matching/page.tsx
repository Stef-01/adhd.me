// W221: the matching console — what the finder did, and why.
//
// STAFF-ONLY AND SYNTHETIC, LIKE EVERY OTHER CONSOLE ROUTE. It renders the roster's declared tags
// and re-runs the finder's own functions over a worked example. It reads no patient data and
// PERSISTS nothing: the audit is computed from the same `matchAudit` the tests pin against the
// ranker, so this page cannot show a number the product does not act on. The review editor below
// holds state in the browser for the length of a visit and writes nowhere — see the note at the
// foot of it for why a save button would be a lie while G6 is closed.
//
// WHY IT EXISTS. The finder tells a patient one sentence about why a GP was shown. When somebody
// asks "why was he first" a month later, the honest answer today would mean reading the lexicon
// and doing the arithmetic by hand. This is that arithmetic, laid out: what the words reached,
// what each clinician declared, what overlapped, and what every facet was worth.
//
// THE MOST USEFUL COLUMN IS THE ONE ON THE RIGHT. "Matched" tells you why somebody was first;
// "missed" tells you why somebody was not, which is the question that actually gets asked.

import Link from "next/link";
import { requireSession } from "../guard";
import { CAPACITY_FRESH_DAYS, CAPACITY_ORDER, capacityGrade, clinicians } from "@/demo/clinicians";
import { tieQualityReport } from "@/matching/tie-quality";
import { tallyOutbound } from "@/attribution/outbound-store";
import { clinicianTags, matchAudit } from "@/onboarding/background";
import { backgroundFromProposals } from "@/onboarding/background";
import { proposeDeclarations, reachGaps } from "@/onboarding/expertise";
import { readTranscript } from "@/onboarding/transcript";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { EI_QUALITIES, EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { reachReport } from "@/onboarding/reach-report";
import { notDeclaredFrames, reasonsPatientsCanSee, sentencesPatientsSee } from "@/matching/provenance";
import { BackgroundEditor, type VocabularyEntry } from "./background-editor";

export const metadata = { title: "Matching console — ADHD.ME" };
// O38: the page now reads the saved-onboarding store for the reach-gap feed, so it renders
// per request rather than from the build.
export const dynamic = "force-dynamic";

/** The worked example. Synthetic, and labelled as such on the page. */
const EXAMPLE_QUERY = "she rushes me and my family think it is an excuse, and my dose wears off";

const EXAMPLE_TRANSCRIPT = [
  { speaker: "interviewer" as const, text: "Tell me how a first appointment usually goes for you." },
  { speaker: "clinician" as const, text: "I book a longer first appointment, because you cannot take a proper history in fifteen minutes." },
  { speaker: "clinician" as const, text: "I do the cardiovascular baseline and the blood pressure before anyone starts a stimulant." },
  { speaker: "clinician" as const, text: "Titration is mine, I do not hand that back to the psychiatrist." },
  { speaker: "clinician" as const, text: "No, I don't see children for this. I refer them on." },
  { speaker: "clinician" as const, text: "Family usually comes into the room and I think that matters, especially with language." },
  { speaker: "clinician" as const, text: "I run a walking group on Thursdays for my older patients." },
];

/** Every facet that exists, so correction works in both directions. */
const VOCABULARY: VocabularyEntry[] = [
  ...CARE_AREA_LABELS.map((area) => ({ key: `care:${area.id}`, kind: "care" as const, label: area.label })),
  ...EI_QUALITY_KEYS.map((trait) => ({ key: `manner:${trait}`, kind: "manner" as const, label: EI_QUALITIES[trait].label })),
];

export default async function MatchingConsolePage() {
  /* O117: THIS PAGE'S OWN HEADER SAYS "STAFF-ONLY … LIKE EVERY OTHER CONSOLE ROUTE" AND IT WAS
     THE ONLY CONSOLE ROUTE WITHOUT A GUARD. Twenty-three sibling pages call `requireSession`;
     this one never did, so it answered 200 to anybody, and the comment at the top of the file
     had been asserting a property the file did not have. Found while adding the provenance
     panel below — which is what raised the stakes enough to check: a page that enumerates what
     patients are told about three NAMED REAL DOCTORS should not be the one route that skipped
     the door. Nothing here was patient data and nothing was secret, but the handoff tallies
     and the reach report are the practice's business rather than the public's, and a file
     whose first line is a claim about access should be right about it. */
  await requireSession();
  // One clock per render, threaded everywhere a grade is computed, so the audit table and the
  // freshness panel cannot disagree about what "today" is (O56).
  const today = new Date();
  const audit = matchAudit(EXAMPLE_QUERY, clinicians, today);
  // O38: the reach-gap feed — real saved onboardings, not the worked example below.
  const reach = reachReport();
  const read = readTranscript(EXAMPLE_TRANSCRIPT);
  const background = backgroundFromProposals("example", "Dr Example", read.proposed, read.unread);
  // O22: the cross-check — only the clinician's own turns, re-read by the patient lexicon.
  const clinicianSpeech = EXAMPLE_TRANSCRIPT.filter((turn) => turn.speaker === "clinician")
    .map((turn) => turn.text)
    .join(" ");
  const crossCheck = proposeDeclarations(clinicianSpeech);
  const patientUnheard = reachGaps(clinicianSpeech);

  return (
    <main className="mc">
      <header className="mc-head">
        <Link href="/console" className="mc-back">Console</Link>
        <h1>Matching</h1>
        <p className="mc-lead">
          What the finder did and why. Every number here is read back out of the functions the
          finder itself uses, so this page cannot show a score the product does not act on.
          Synthetic roster, synthetic transcript.
        </p>
      </header>

      <section className="mc-section" aria-labelledby="audit-h">
        <h2 id="audit-h">One match, worked through</h2>
        <p className="mc-query">“{audit.query}”</p>

        <h3 className="mc-sub">What those words reached</h3>
        {audit.asked.length === 0 ? (
          <p className="mc-empty">Nothing. The finder says so rather than presenting an order.</p>
        ) : (
          /* O126: the label, the weight, AND the phrase from the reader's own words that
             reached it — the same `matched` the patient profile renders as "from your words".
             It is a cue the lexicon matched (every token stem-matched, in order) rather than a
             verbatim quote, which is why the patient side says "from your words" and this says
             "reached by", both true and neither claiming to quote somebody exactly. */
          <ul className="mc-asked">
            {audit.asked.map((entry) => (
              <li key={entry.key}>
                <span className="mc-tag">
                  {entry.label}<span className="mc-weight">{entry.weight}</span>
                </span>
                <span className="mc-asked-from">reached by &ldquo;{entry.matched}&rdquo;</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mc-sub">How each clinician answered them</h3>
        <div className="mc-table-wrap">
          <table className="mc-table">
            <thead>
              <tr><th>Clinician</th><th>Score</th><th>Declares</th><th>Matched</th><th>Missed — why they are not first</th></tr>
            </thead>
            <tbody>
              {/* Sorted the way the finder actually ranks: score, then capacity grade (O4,
                  three grades since O56) — a console that sorted by total alone would show
                  the opposite of the product on a capacity-broken tie. */}
              {[...audit.rows]
                .sort((a, b) => b.total - a.total || CAPACITY_ORDER[a.capacity] - CAPACITY_ORDER[b.capacity])
                .map((row) => (
                <tr key={row.clinicianId}>
                  <td>{row.name}{row.capacity === "closed" ? " · books closed" : row.capacity === "stale-open" ? " · books open, unconfirmed" : ""}</td>
                  <td className="mc-num">{row.total}</td>
                  {/* Breadth beside score: a row that declares nearly everything is visible
                      exactly where its declarations are earning rank (O2/F1). */}
                  <td className="mc-num">
                    {row.declares.often + row.declares.sometimes} of {row.declares.of}
                    {row.declares.sometimes > 0 ? ` (${row.declares.sometimes} sometimes)` : ""}
                  </td>
                  <td>{row.matched.map((m) => `${m.label} (+${m.weight})`).join(", ") || "—"}</td>
                  <td className="mc-missed">{row.missed.map((m) => m.label).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mc-section" aria-labelledby="tags-h">
        <h2 id="tags-h">Every tag on the roster</h2>
        <p className="mc-note">
          Declared by the clinician, never inferred. A tag here is the only thing that can put
          somebody in front of a patient.
        </p>
        {clinicians.map((clinician) => (
          <div key={clinician.id} className="mc-clinician">
            <h3 className="mc-sub">{clinician.name}</h3>
            <ul className="mc-tags">
              {clinicianTags(clinician).map((tag) => (
                <li key={tag.key} className={`mc-tag mc-tag-${tag.kind}`}>{tag.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* O117 (explaining the fit, Q4): the lane's only clinician-facing increment. Every other
          view here is QUERY-driven — pick a sentence, watch the roster score against it — which
          answers the staff question and not the doctor's. This one is built from DECLARATIONS,
          which is what makes it complete: what the finder can say about a GP is fixed by what
          they declared, so this enumerates all of it rather than sampling a typed query.

          W190 gives a clinician a path to correct a profile that is wrong about them, and that
          path is only real if the thing to be corrected is legible. A doctor cannot object to a
          sentence they have never been shown. */}
      <section className="mc-section" aria-labelledby="told-h">
        <h2 id="told-h">What patients are told about each GP</h2>
        <p className="mc-note">
          Composed by the same functions the finder calls, never authored here — if the wording
          on the patient side changes, this changes with it. Read it as the doctor: every line
          below is something a patient can see, and the field beside it is the declaration that
          produced it. Nothing is inferred and nothing is a judgement about them.
        </p>
        {clinicians.map((clinician) => (
          <div key={clinician.id} className="mc-clinician" data-testid={`told-${clinician.id}`}>
            <h3 className="mc-sub">{clinician.name}</h3>

            <p className="mc-note">Reasons their declarations can put in front of a patient</p>
            <ul className="mc-told">
              {reasonsPatientsCanSee(clinician).map((line) => (
                <li key={line.key ?? line.said}>
                  <span className="mc-told-said">{line.said}</span>
                  <span className="mc-told-from">{line.from}</span>
                </li>
              ))}
            </ul>

            <p className="mc-note">The sentences those labels sit inside</p>
            <ul className="mc-told">
              {sentencesPatientsSee(clinician).map((line) => (
                <li key={line.said}>
                  <span className="mc-told-said">{line.said}</span>
                  <span className="mc-told-from">{line.from}</span>
                </li>
              ))}
            </ul>

            {/* The half a doctor is most likely to want to check. Both lines are facts about a
                DECLARATION and never claims about ability (W193) — which is exactly the
                distinction somebody reading their own listing will be looking for. */}
            <p className="mc-note">What a patient is told when they ask for something not declared</p>
            <ul className="mc-told">
              {notDeclaredFrames(clinician).map((line) => (
                <li key={line.said}>
                  <span className="mc-told-said">{line.said}</span>
                  <span className="mc-told-from">{line.from}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="mc-section" aria-labelledby="handoff-h">
        <h2 id="handoff-h">Booking handoffs</h2>
        <p className="mc-note">
          Outbound intent this store has seen: every tap of a booking link routes through
          /go and lands one row — clinician, surface, day, nothing about the person (W235).
          Completed bookings stay invisible by design: Healthengine has no conversion
          endpoint for a third party, so the handoff is the honest end of what this product
          can count. On the hosted demo this store resets with the serverless filesystem;
          the durable copy rides the platform logs until stores get a real backend.
        </p>
        {tallyOutbound().map((tally) => {
          const clinician = clinicians.find((c) => c.id === tally.clinicianId)!;
          return (
            <div key={tally.clinicianId} className="mc-clinician">
              <h3 className="mc-sub">{clinician.name}</h3>
              <ul className="mc-tags" data-testid={`handoffs-${tally.clinicianId}`}>
                <li className="mc-tag">handoffs<span className="mc-weight">{tally.total}</span></li>
                {Object.entries(tally.bySurface).map(([surface, count]) => (
                  <li key={surface} className="mc-tag">{surface}<span className="mc-weight">{count}</span></li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="mc-section" aria-labelledby="capacity-h">
        <h2 id="capacity-h">Capacity freshness</h2>
        <p className="mc-note">
          Capacity is the one declared fact that goes wrong by itself — books close without
          anybody editing a profile. A declaration stays fresh for {CAPACITY_FRESH_DAYS} days;
          after that the finder stops vouching for it at a tie (it sorts behind a confirmed one,
          never off the page). Each date below is when the declaration went on the record;
          reconfirming is the only thing that moves it.
        </p>
        {clinicians.map((clinician) => {
          const grade = capacityGrade(clinician, today);
          const declared = clinician.capacityDeclaredAt;
          const reconfirmBy = declared
            ? new Date(new Date(declared).getTime() + CAPACITY_FRESH_DAYS * 86_400_000).toISOString().slice(0, 10)
            : null;
          return (
            <div key={clinician.id} className="mc-clinician">
              <h3 className="mc-sub">{clinician.name}</h3>
              <ul className="mc-tags">
                <li className="mc-tag">
                  {grade === "closed"
                    ? "books closed"
                    : grade === "fresh-open"
                      ? "open, confirmed"
                      : "open, unconfirmed"}
                  {declared && <span className="mc-weight">declared {declared}</span>}
                </li>
              </ul>
              {grade === "closed" ? (
                <p className="mc-note">Shown to readers with the closed-books sentence; nothing to reconfirm.</p>
              ) : grade === "stale-open" ? (
                <p className="mc-note mc-missed">
                  Reconfirm needed: {declared
                    ? `this declaration passed its ${CAPACITY_FRESH_DAYS}-day window on ${reconfirmBy}.`
                    : "this declaration was never dated, so it cannot claim freshness."}{" "}
                  Ask the practice whether the books are still open and move the date.
                </p>
              ) : (
                <p className="mc-note">Reconfirm by {reconfirmBy} to keep this declaration fresh.</p>
              )}
            </div>
          );
        })}
      </section>

      <section className="mc-section" aria-labelledby="tie-h">
        <h2 id="tie-h">Tie quality</h2>
        {(() => {
          // The same function the verify gate pins (W234) — a panel computing its own number
          // would eventually disagree with the KPI it claims to report.
          const tie = tieQualityReport();
          return (
            <>
              <p className="mc-note">
                Over the reach corpus’s {tie.total} heard requests: how often the words actually
                separated the top of the list. The unseparated count is the clarifier’s work
                queue — requests the reader heard but the roster’s declarations could not order.
                Synthetic sentences, real pipeline; the gate pins these numbers in both
                directions, so this panel and CI cannot drift apart.
              </p>
              <ul className="mc-tags" data-testid="tie-quality">
                <li className="mc-tag">separated<span className="mc-weight">{tie.separated}</span></li>
                <li className="mc-tag">partial tie<span className="mc-weight">{tie.partialTie}</span></li>
                <li className="mc-tag">unseparated<span className="mc-weight">{tie.unseparated}</span></li>
                <li className="mc-tag">separation rate<span className="mc-weight">{Math.round(tie.separationRate * 100)}%</span></li>
              </ul>
            </>
          );
        })()}
      </section>

      <section className="mc-section" aria-labelledby="tx-h">
        <h2 id="tx-h">A 30-minute interview, read into facets</h2>
        <p className="mc-note">
          Only the clinician’s own turns are read — the interviewer names every facet by asking
          about it. Each proposal carries the sentence it came from, and a person accepts or
          rejects it. Nothing here writes a profile.
        </p>

        <BackgroundEditor initial={background} vocabulary={VOCABULARY} reviewer="Console reviewer" />

        <h3 className="mc-sub">Not proposed, and why that is the important part</h3>
        <p className="mc-note">
          The transcript says “No, I don’t see children for this.” The word <em>children</em> is
          right there, and proposing from its presence would attribute the opposite of what was
          said, with the clinician’s own sentence attached as evidence. It is not in the list above.
        </p>

        <h3 className="mc-sub">Sentences the vocabulary could not read</h3>
        <p className="mc-note">
          Kept rather than discarded. This is the lexicon’s to-do list, written by the people it is
          about.
        </p>
        <ul className="mc-unread">
          {read.unread.map((line) => <li key={line}>“{line}”</li>)}
        </ul>

        <h3 className="mc-sub">The same words, heard by the patient’s reader (W227)</h3>
        <p className="mc-note">
          The finder’s own lexicon re-reads the clinician’s turns. A facet both readers reach is
          one patients genuinely ask for in their own words — confirm those first. A sentence
          neither reader hears is a candidate patient-side reach gap, caught at onboarding
          instead of in production.
        </p>
        <ul className="mc-tags">
          {crossCheck.length === 0 ? (
            <li className="mc-empty">Nothing the patient lexicon can reach yet.</li>
          ) : (
            crossCheck.map((proposal) => (
              <li key={proposal.label} className="mc-tag">
                {proposal.label}
                <span className="mc-weight">“{proposal.heard}”</span>
              </li>
            ))
          )}
        </ul>
        {patientUnheard.length > 0 && (
          <>
            <p className="mc-note">Said by the clinician, silent to a patient’s search:</p>
            <ul className="mc-unread">
              {patientUnheard.map((line) => <li key={line}>“{line}”</li>)}
            </ul>
          </>
        )}
      </section>

      <section className="mc-section" aria-labelledby="reach-h">
        <h2 id="reach-h">The reach-gap feed</h2>
        <p className="mc-note">
          From real saved onboardings (the interview screen), not the worked example above: for
          each doctor, what the machine could not hear. The two lists grow different things —
          the proposer’s cue list and the finder’s patient lexicon — which is why they are kept
          apart. Most gaps are correctly unreadable (logistics, small talk); the ones that are
          genuine expertise become cues, which is the O13 review moved to onboarding time.
        </p>
        {!reach.hasOnboardings ? (
          <p className="mc-empty">No onboardings saved yet — the feed starts with the first saved interview.</p>
        ) : reach.entries.length === 0 ? (
          <p className="mc-empty">Every saved onboarding was fully heard. Nothing is waiting for lexicon review.</p>
        ) : (
          reach.entries.map((entry) => (
            <div key={entry.clinicianId} className="mc-clinician">
              <h3 className="mc-sub">
                {entry.displayName} · saved {entry.savedAt.slice(0, 10)} by {entry.savedBy}
              </h3>
              {entry.patientSilent.length > 0 && (
                <>
                  <p className="mc-note">Silent to a patient’s search — candidate lexicon cues:</p>
                  <ul className="mc-unread">
                    {entry.patientSilent.map((line) => <li key={line}>“{line}”</li>)}
                  </ul>
                </>
              )}
              {entry.unread.length > 0 && (
                <>
                  <p className="mc-note">Unread by the proposer’s vocabulary:</p>
                  <ul className="mc-unread">
                    {entry.unread.map((line) => <li key={line}>“{line}”</li>)}
                  </ul>
                </>
              )}
            </div>
          ))
        )}
      </section>

    </main>
  );
}
