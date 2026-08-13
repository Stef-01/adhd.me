// W151: the education console — the library, and the clinician's own reading record.
//
// W144's boundary document argued the lines a unit before anything was built. Two of them are
// decided ON THIS PAGE rather than in a pure module, because they are about what a reader sees
// next to what:
//
//   STEP 4 — ORDER, NEVER WITHHOLD. Every in-scope item is listed, its rank shown AS a rank
//   ("3 of 7") rather than as an answer. There is no default-collapsed view, no "top pick" and
//   no "show more", because a default view of one item is a product that shows one item. The
//   page cannot drop a row even by accident: W145 returns a permutation and this renders all of
//   it, and the items a practice does not see are NAMED as out of scope with the register that
//   put them there.
//
//   STEP 6 — THE EVALUATION AND THE MATERIAL ARE NOT RENDERED TOGETHER. W120 will happily say
//   whether a record meets a pathway's criteria, and that statement is honest where it lives.
//   Placed on this page beside material about the same pathway it becomes advice by adjacency,
//   which is how a product recommends something without writing a recommendation. So no verdict
//   is rendered here at all, and the page says why.
//
// The third position is W149's and this page is where it would be lost: a practice looking at an
// education surface wants the report of who has read what. There is no such view, the copy says
// so, and the read is scoped at the store (`cpdEntriesFor`) rather than filtered here.
//
// Every fixed sentence comes from `EDUCATION_CONSOLE_COPY`, which lives in `src/education/` so
// W150's linter reaches it. Copy written straight into this file would be copy no linter sees.

import { redirect } from "next/navigation";
import { clinicianForEmail } from "@/console/clinician-identity";
import { getConsole } from "@/console/store";
import { trailFor } from "@/education/cpd";
import { EDUCATION_CONSOLE_COPY as COPY } from "@/education/console-copy";
import { curate, describeCuration } from "@/education/curation";
import { PROVENANCE_REFUSAL_COPY, renderable } from "@/education/provenance";
import { cpdEntriesFor, getLibrary, getSignedOffSources, getTriggers } from "@/education/store";
import { describeTriggers, triggersFor } from "@/education/triggers";
import { registersFor } from "@/registers/store";
import { authorize } from "@/tenancy/tenancy";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Education — Meherr" };

export default async function EducationPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const practiceId = record.practice.id;
  const practiceConditionCodes = registersFor(practiceId)
    .filter((row) => row.enabled)
    .map((row) => row.condition.code as string);

  // No patient is in view on a library page, so no recorded facts are supplied — and W145 says
  // so in its own ordering basis rather than implying an order it did not use.
  const curation = curate(getLibrary(), { practiceConditionCodes, recordedFactCodes: [] });

  // W154: the curated order is then put through W152's provenance gate, which W151 shipped
  // without. Curation decides ORDER; this decides whether material may be shown at all, and the
  // two are separate questions — an item citing content nobody has signed off is not
  // low-priority, it is unshowable. Withholding here is not the suppression W145 forbids: that
  // rule protects against hiding material on a PATIENT-level judgement, and this is a content
  // governance fact, reported in full below rather than made to disappear.
  const sources = getSignedOffSources();
  const gated = curation.ordered.map((ranked) => ({ ranked, check: renderable(ranked.item, sources) }));
  const shown = gated.filter((g) => g.check.renderable);
  const withheld = gated
    .filter((g) => !g.check.renderable)
    .map((g) => ({
      itemId: g.ranked.item.itemId,
      reason: g.check.renderable ? "" : PROVENANCE_REFUSAL_COPY[g.check.reason],
    }));
  const triggers = triggersFor([], practiceConditionCodes, getTriggers());

  const identity = clinicianForEmail(record.clinicians, email);
  const trail = identity.linked
    ? trailFor(cpdEntriesFor(practiceId, identity.clinician.id), practiceId, identity.clinician.id)
    : null;
  const corrected = new Set(trail?.correctedEntryIds ?? []);

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Education</h1>
          <p className="text-stone-600">{COPY.intro}</p>
        </div>

        <section aria-labelledby="library-heading" className="flex flex-col gap-3">
          <h2 id="library-heading" className="text-lg font-medium">
            Material for this practice&rsquo;s registers
          </h2>

          {shown.length === 0 ? (
            <p
              data-testid="library-empty"
              className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
            >
              {COPY.libraryEmpty}
            </p>
          ) : (
            <ul data-testid="library-list" className="flex flex-col gap-3">
              {shown.map(({ ranked }) => (
                <li
                  key={ranked.item.itemId}
                  data-testid={`item-${ranked.item.itemId}`}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-medium">{ranked.item.title}</h3>
                    {/* The rank shown as a rank, never as an answer (W144 step 4). */}
                    <span className="rounded bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                      {ranked.position} of {curation.ordered.length}
                    </span>
                  </div>
                  <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-stone-600 sm:grid-cols-2">
                    <div className="flex gap-2">
                      <dt className="text-stone-500">Register</dt>
                      <dd>{ranked.item.conditionCode}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-stone-500">Source</dt>
                      <dd>{ranked.item.sourceRef}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {withheld.length > 0 && (
            <div
              data-testid="library-withheld"
              className="rounded-lg border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-700"
            >
              <p>{COPY.librarySourceWithheld}</p>
              <ul className="mt-2 flex flex-col gap-1">
                {withheld.map((w) => (
                  <li key={w.itemId} data-testid={`withheld-${w.itemId}`}>
                    <span className="font-medium">{w.itemId}</span> — {w.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div data-testid="library-basis" className="flex flex-col gap-1 text-sm text-stone-600">
            {describeCuration(curation).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {/* W154: only claimed when it is true. "Every item is above, in full" alongside a
              list of what was held back would be the page contradicting itself, and the
              withheld panel already carries the honest version. */}
          {withheld.length === 0 && (
            <p data-testid="library-all-shown" className="text-sm text-stone-500">
              {COPY.libraryAllShown}
            </p>
          )}
        </section>

        <section aria-labelledby="triggers-heading" className="flex flex-col gap-3">
          <h2 id="triggers-heading" className="text-lg font-medium">
            When material is surfaced
          </h2>
          {getTriggers().length === 0 ? (
            <p data-testid="triggers-none" className="text-sm text-stone-600">
              {COPY.triggersNone}
            </p>
          ) : (
            <div data-testid="triggers-summary" className="flex flex-col gap-1 text-sm text-stone-600">
              {describeTriggers(triggers).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="cpd-heading" className="flex flex-col gap-3">
          <h2 id="cpd-heading" className="text-lg font-medium">
            Your reading record
          </h2>
          <p className="text-sm text-stone-600">{COPY.cpdOwn}</p>

          {!identity.linked ? (
            <p
              data-testid="cpd-unlinked"
              className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
            >
              {COPY.cpdUnlinked}
            </p>
          ) : trail!.entries.length === 0 ? (
            <p
              data-testid="cpd-empty"
              className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
            >
              {COPY.cpdEmpty}
            </p>
          ) : (
            <ul data-testid="cpd-list" className="flex flex-col gap-2">
              {trail!.entries.map((entry) => (
                <li
                  key={entry.entryId}
                  data-testid={`cpd-${entry.entryId}`}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{entry.itemTitle}</span>
                    <span className="text-stone-500">{entry.at}</span>
                  </div>
                  <p className="mt-1 text-stone-600">
                    {entry.kind === "corrected"
                      ? `Correction of ${entry.correctsEntryId} — ${entry.note ?? ""}`
                      : entry.kind.replace(/_/g, " ")}
                    {" · "}
                    {entry.sourceRef}
                  </p>
                  {/* Marked, never removed: the reading really did get logged (W149). */}
                  {corrected.has(entry.entryId) && (
                    <p data-testid={`cpd-corrected-${entry.entryId}`} className="mt-1 text-stone-500">
                      {COPY.cpdCorrected}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p data-testid="cpd-meaning" className="text-sm text-stone-500">
            {COPY.cpdNotComprehension}
          </p>
        </section>

        <div className="flex flex-col gap-2 border-t border-stone-200 pt-6 text-sm text-stone-500">
          <p data-testid="education-evaluation-note">{COPY.evaluationSeparate}</p>
          <p data-testid="education-patient-note">{COPY.noPatientHere}</p>
        </div>
      </div>
    </ConsoleShell>
  );
}
