// W221: the matching console — what the finder did, and why.
//
// STAFF-ONLY AND SYNTHETIC, LIKE EVERY OTHER CONSOLE ROUTE. It re-runs the finder's own functions
// over a worked example. It reads no patient data and PERSISTS nothing: the audit is computed
// from the same `matchAudit` the tests pin against the ranker, so this page cannot show a number
// the product does not act on.
//
// WHY IT EXISTS. The finder tells a patient one sentence about why a GP was shown. When somebody
// asks "why was he first" a month later, the honest answer today would mean reading the lexicon
// and doing the arithmetic by hand. This is that arithmetic, laid out: what the words reached,
// what each clinician declared, what overlapped, and what every facet was worth.
//
// THE MOST USEFUL COLUMN IS THE ONE ON THE RIGHT. "Matched" tells you why somebody was first;
// "missed" tells you why somebody was not, which is the question that actually gets asked.
//
// CONSOLE SPINE (docs/console-spine-brief.md): this screen keeps the three sections a practice
// manager reads to trust the order. The roster tags, booking handoffs, capacity freshness, the
// interview reader and the reach-gap feed moved to /console/matching/audit, unchanged.

import Link from "next/link";
import { requireSession } from "../guard";
import { CAPACITY_ORDER, clinicians } from "@/demo/clinicians";
import { tieQualityReport } from "@/matching/tie-quality";
import { matchAudit } from "@/onboarding/background";
import { notDeclaredFrames, reasonsPatientsCanSee, sentencesPatientsSee } from "@/matching/provenance";
import { serverNow } from "@/lib/server-clock";
import { ConsoleShell } from "../ui";

export const metadata = { title: "Matching console — ADHD.ME" };
export const dynamic = "force-dynamic";

/** The worked example. Synthetic, and labelled as such on the page. */
const EXAMPLE_QUERY = "she rushes me and my family think it is an excuse, and my dose wears off";

export default async function MatchingConsolePage() {
  /* O117: THIS PAGE'S OWN HEADER SAYS "STAFF-ONLY … LIKE EVERY OTHER CONSOLE ROUTE" AND IT WAS
     THE ONLY CONSOLE ROUTE WITHOUT A GUARD. Twenty-three sibling pages call `requireSession`;
     this one never did, so it answered 200 to anybody, and the comment at the top of the file
     had been asserting a property the file did not have. A page that enumerates what patients
     are told about three NAMED REAL DOCTORS should not be the one route that skipped the door. */
  const email = await requireSession();
  // One clock per render (O56). AR15: serverNow() pins under capture, real everywhere else.
  const today = serverNow();
  const audit = matchAudit(EXAMPLE_QUERY, clinicians, today);

  return (
    <ConsoleShell email={email}>
    <div className="mc">
      <header className="mc-head">
        <Link href="/console" className="mc-back">Console</Link>
        <h1>Matching</h1>
        <p className="mc-lead">
          What the finder did and why. Every number here is read back out of the functions the
          finder itself uses, so this page cannot show a score the product does not act on.
          Synthetic roster.
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

      <p className="mc-note">
        <Link href="/console/matching/audit" className="underline">Matching audit</Link>: the roster
        tags, capacity freshness, the interview reader and the reach-gap feed.
      </p>

    </div>
    </ConsoleShell>
  );
}
