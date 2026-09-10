// Matching audit (docs/console-spine-brief.md): the sections of /console/matching that the
// staff who maintain the lexicon read. Moved here unchanged; the engine did not change.
//
// STAFF-ONLY AND SYNTHETIC, LIKE EVERY OTHER CONSOLE ROUTE. It renders the roster's declared tags
// and reads the saved-onboarding store for the reach-gap feed. It reads no patient data. The
// review editor below holds state in the browser for the length of a visit and writes only to
// the drafts file its action names; see the note at the foot of it for why a save button would
// be a lie while G6 is closed.

import Link from "next/link";
import { requireSession } from "../../guard";
import { CAPACITY_FRESH_DAYS, capacityGrade, clinicians } from "@/demo/clinicians";
import { tallyOutbound } from "@/attribution/outbound-store";
import { clinicianTags } from "@/onboarding/background";
import { backgroundFromProposals } from "@/onboarding/background";
import { proposeDeclarations, reachGaps } from "@/onboarding/expertise";
import { readTranscript } from "@/onboarding/transcript";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { EI_QUALITIES, EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { reachReport } from "@/onboarding/reach-report";
import { BackgroundEditor, type VocabularyEntry } from "../background-editor";
import { serverNow } from "@/lib/server-clock";
import { ConsoleShell } from "../../ui";

export const metadata = { title: "Matching audit" };
// O38: the page reads the saved-onboarding store for the reach-gap feed, so it renders per
// request rather than from the build.
export const dynamic = "force-dynamic";

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

export default async function MatchingAuditPage() {
  const email = await requireSession();
  // One clock per render, so the freshness panel cannot disagree with itself about "today" (O56).
  const today = serverNow();
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
    <ConsoleShell email={email}>
    <div className="mc">
      <header className="mc-head">
        <Link href="/console/matching" className="mc-back">Matching</Link>
        <h1>Matching audit</h1>
        <p className="mc-lead">
          The roster’s tags, what each capacity declaration is worth today, a transcript read into
          facets, and what the readers could not hear. Synthetic roster, synthetic transcript.
        </p>
      </header>

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

      <section className="mc-section" aria-labelledby="handoff-h">
        <h2 id="handoff-h">Booking handoffs</h2>
        <p className="mc-note">
          Outbound intent this store has seen: every tap of a booking link routes through
          /go and lands one row, clinician, surface, day, nothing about the person (W235).
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
          Capacity is the one declared fact that goes wrong by itself, books close without
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

      <section className="mc-section" aria-labelledby="tx-h">
        <h2 id="tx-h">A 30-minute interview, read into facets</h2>
        <p className="mc-note">
          Only the clinician’s own turns are read, the interviewer names every facet by asking
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
          one patients genuinely ask for in their own words, confirm those first. A sentence
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
          the proposer’s cue list and the finder’s patient lexicon, which is why they are kept
          apart. Most gaps are correctly unreadable (logistics, small talk); the ones that are
          genuine expertise become cues, which is the O13 review moved to onboarding time.
        </p>
        {!reach.hasOnboardings ? (
          <p className="mc-empty">No onboardings saved yet, the feed starts with the first saved interview.</p>
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
                  <p className="mc-note">Silent to a patient’s search, candidate lexicon cues:</p>
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

    </div>
    </ConsoleShell>
  );
}
