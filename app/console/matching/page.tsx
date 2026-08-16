// W223: the matching console — what the finder did, and why.
//
// STAFF-ONLY AND SYNTHETIC, LIKE EVERY OTHER CONSOLE ROUTE. It renders the roster's declared tags
// and re-runs the finder's own functions over a query typed here. It reads no patient data, holds
// no state and writes nothing: the audit is computed from the same `matchAudit` the tests pin
// against the ranker, so this page cannot show a number the product does not act on.
//
// WHY IT EXISTS. The finder tells a patient one sentence about why a GP was shown. When somebody
// asks "why was he first" a month later, the honest answer today would mean reading the lexicon
// and doing the arithmetic by hand. This is that arithmetic, laid out: what the words reached,
// what each clinician declared, what overlapped, and what every facet was worth.
//
// THE MOST USEFUL COLUMN IS THE ONE ON THE RIGHT. "Matched" tells you why somebody was first;
// "missed" tells you why somebody was not, which is the question that actually gets asked.

import Link from "next/link";
import { clinicians } from "@/demo/clinicians";
import { clinicianTags, matchAudit } from "@/onboarding/background";
import { professionalBio } from "@/onboarding/background";
import { backgroundFromProposals } from "@/onboarding/background";
import { readTranscript } from "@/onboarding/transcript";

export const metadata = { title: "Matching console — ADHD.ME" };

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

export default function MatchingConsolePage() {
  const audit = matchAudit(EXAMPLE_QUERY, clinicians);
  const read = readTranscript(EXAMPLE_TRANSCRIPT);
  const background = backgroundFromProposals("example", "Dr Example", read.proposed, read.unread);
  // Accept everything for the preview, so the page can show what an assembled bio looks like.
  const accepted = { ...background, facets: background.facets.map((f) => ({ ...f, status: "accepted" as const })) };

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
          <ul className="mc-tags">
            {audit.asked.map((entry) => (
              <li key={entry.key} className="mc-tag">
                {entry.label}<span className="mc-weight">{entry.weight}</span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mc-sub">How each clinician answered them</h3>
        <div className="mc-table-wrap">
          <table className="mc-table">
            <thead>
              <tr><th>Clinician</th><th>Score</th><th>Matched</th><th>Missed — why they are not first</th></tr>
            </thead>
            <tbody>
              {[...audit.rows].sort((a, b) => b.total - a.total).map((row) => (
                <tr key={row.clinicianId}>
                  <td>{row.name}</td>
                  <td className="mc-num">{row.total}</td>
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

      <section className="mc-section" aria-labelledby="tx-h">
        <h2 id="tx-h">A 30-minute interview, read into facets</h2>
        <p className="mc-note">
          Only the clinician’s own turns are read — the interviewer names every facet by asking
          about it. Each proposal carries the sentence it came from, and a person accepts or
          rejects it. Nothing here writes a profile.
        </p>

        <ul className="mc-proposals">
          {background.facets.map((facet) => (
            <li key={facet.key} className="mc-proposal">
              <div className="mc-proposal-head">
                <span className={`mc-tag mc-tag-${facet.kind}`}>{facet.label}</span>
                <span className="mc-status">{facet.status}</span>
              </div>
              <blockquote className="mc-quote">“{facet.quote}”</blockquote>
              <p className="mc-cue">reached by “{facet.cue}”</p>
            </li>
          ))}
        </ul>

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
      </section>

      <section className="mc-section" aria-labelledby="bio-h">
        <h2 id="bio-h">The professional bio, assembled</h2>
        <p className="mc-note">
          <strong>The bio is not a text field and must not become one.</strong>{" "}
          <code>src/directory/profile.ts</code> refuses a free-text biography because it is where
          ratings, comparisons and specialty claims reappear as prose. The editable surface is the
          facets above — tick, untick, correct. The sentence follows from them, the clinician
          confirms it, and nobody types into it.
        </p>
        <p className="mc-bio">{professionalBio(accepted) || "Nothing accepted yet."}</p>
      </section>
    </main>
  );
}
