// Phase M (ADR 0007): the GP profiles this build lets a signed-in console account manage. One
// row per GP in the matching store, with what a manager needs at a glance: checked or not,
// places open, requests waiting.
import Link from "next/link";
import { MIN_SAMPLES, learnWeights, learningSamples } from "@/lib/matching/feedback";
import { PATIENT_WEIGHTS, type PatientCriterion } from "@/lib/matching/ranking";
import { allFeedback, allMatches, getMatching, listGPs, matchesForGP } from "@/lib/matching/store";
import { VERIFICATION_LABELS } from "@/lib/matching/labels";
import { requireSession } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "GP profiles, ADHD.ME" };

const ERROR_COPY: Record<string, string> = {
  not_found: "That profile does not exist.",
  failed: "That change could not be saved.",
};

export default async function GPListPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const email = await requireSession();
  const { error } = await searchParams;
  const rows = listGPs()
    .map((gp) => ({ gp, waiting: matchesForGP(gp.id).filter((m) => m.matchStatus === "proposed").length }))
    .sort((a, b) => a.gp.name.localeCompare(b.gp.name));
  const state = getMatching();
  const learned = learnWeights(learningSamples(allMatches(state), allFeedback(state)));
  const criteria = Object.keys(PATIENT_WEIGHTS) as PatientCriterion[];
  const CRITERION_COPY: Record<PatientCriterion, string> = {
    similarity: "What they wrote against what the GP declares",
    capacity: "Declared places open",
    communication: "Ways of working asked for",
    consultStyle: "Appointment style asked for",
    proximity: "Distance",
  };

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">GP profiles</h1>
          <p className="max-w-2xl text-stone-600">
            What each GP declares to the matcher, the capacity they have open, and the requests waiting on an answer. A request is
            proposed to a GP by the matching model and goes nowhere until the GP accepts or declines it here.
          </p>
          <p data-testid="gp-list-posture" className="max-w-2xl text-sm text-stone-500">
            Synthetic build: any signed-in console account may manage any listed profile. Practice membership scopes this in the wiring unit.
          </p>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? ERROR_COPY.failed}
          </p>
        )}

        <section aria-labelledby="learning-heading" className="flex flex-col gap-3">
          <h2 id="learning-heading" className="text-lg font-medium">
            What the feedback has taught the ranking
          </h2>
          <p className="max-w-2xl text-sm text-stone-600">
            The patient side ranks a shortlist on five global weights. After every first appointment both sides say how it went, and from {MIN_SAMPLES} patient
            records up each weight moves toward the criterion that predicted &ldquo;I felt understood&rdquo;, by at most half of itself, then the five are
            renormalised. No weight is ever keyed to a named GP.
          </p>
          <p data-testid="learning-note" className="text-sm text-stone-700">
            {learned.note}
          </p>
          <div className="overflow-x-auto">
            <table data-testid="learning-weights" className="w-full max-w-2xl text-left text-sm">
              <caption className="sr-only">The five patient-side weights, declared and as learned</caption>
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Criterion
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Declared
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    In use
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Correlation with fit
                  </th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c} className="border-b border-stone-100">
                    <td className="py-2 pr-4">{CRITERION_COPY[c]}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{PATIENT_WEIGHTS[c].toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{(state.weights ?? PATIENT_WEIGHTS)[c].toFixed(2)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{learned.evidence[c] === undefined ? "\u2014" : learned.evidence[c]!.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table data-testid="gp-list" className="w-full text-left text-sm">
            <caption className="sr-only">GP profiles, with verification, places open and requests waiting</caption>
            <thead>
              <tr className="border-b border-stone-200 text-stone-500">
                <th scope="col" className="py-2 pr-4 font-medium">
                  GP
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Credentials
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Places open
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Waiting
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ gp, waiting }) => (
                <tr key={gp.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4">
                    <Link className="inline-flex min-h-11 items-center font-medium text-stone-900 underline-offset-2 hover:underline" href={`/console/gp/${encodeURIComponent(gp.id)}`}>
                      {gp.name}
                    </Link>
                    <span className="block text-xs text-stone-500">
                      {gp.practice}, {gp.practiceLocation.suburb}
                      {gp.realPerson ? "" : " · example"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-stone-700">{VERIFICATION_LABELS[gp.verificationStatus]}</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {gp.credentials.caseloadCapacityCurrent} of {gp.credentials.caseloadCapacityMax}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums" data-testid={`waiting-${gp.id}`}>
                    {waiting}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ConsoleShell>
  );
}
