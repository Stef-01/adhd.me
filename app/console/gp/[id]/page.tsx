// Phase M (ADR 0007): the GP-facing dashboard. Four things a GP does here, each its own form
// and its own server action: say how they work (the profile the matcher embeds), say what they
// want proposed (the bidirectional half), say how many places are open (the capacity slider),
// and answer the requests the model proposed to them, accept or decline, then record how the
// consult went from their side. Credential evidence is offered here by name; the check itself is
// somebody else's act and is recorded with a date when it happens.
import Link from "next/link";
import { notFound } from "next/navigation";
import { EI_QUALITY_KEYS } from "@/demo/emotional-fit";
import { AGE_GROUP_LABELS, BILLING_LABELS, COMORBIDITY_LABELS, CONSULT_STYLE_LABELS, DECLINE_REASON_LABELS, MANNER_LABELS, PACE_LABELS, PHILOSOPHY_LABELS, VERIFICATION_LABELS } from "@/lib/matching/labels";
import { allFeedback, allMatches, gpById, matchesForGP, patientById } from "@/lib/matching/store";
import { AGE_GROUPS, COMORBIDITIES, type DeclineReason, type PrescribingPhilosophy, type TitrationPace } from "@/lib/matching/types";
import { incomingRequestView } from "@/lib/matching/views";
import { requireSession } from "../../guard";
import { ConsoleShell, Field, inputClass, primaryButtonClass } from "../../ui";
import { answerMatch, completeMatch, gpFeedback, saveCapacity, savePreferences, saveProfile, uploadEvidence } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "GP profile — ADHD.ME" };

const SAVED_COPY: Record<string, string> = {
  profile: "Profile saved. The matcher reads it from the next request on.",
  preferences: "Preferences saved. They shape which requests are proposed to you.",
  capacity: "Capacity saved.",
  evidence: "Document offered for checking. The check is recorded here when somebody does it.",
  answered: "Answered. The person can see your answer on their side.",
  completed: "Marked as done. The person can now say how it went, and so can you.",
  feedback: "Recorded against the match.",
};

const ERROR_COPY: Record<string, string> = {
  bio_short: "Say a little more in the bio: at least twenty characters.",
  years: "Years must be a whole number between 0 and 60, or left blank.",
  age_groups: "Pick at least one age group you see.",
  video: "A video link must start with https://.",
  minimum: "The minimum fit is a number between 0 and 1.",
  preferences_empty: "Pick at least one age group, one appointment style and one billing arrangement.",
  capacity: "Places open must be a whole number no greater than the maximum.",
  evidence_missing: "Choose a file.",
  evidence_size: "Files are capped at 8 MB.",
  evidence_type: "PDF, PNG or JPEG only.",
  not_yours: "That request was not proposed to this profile.",
  already_answered: "That request has already been answered.",
  reason_missing: "Say why you are declining.",
  not_consulted: "Feedback opens once the request is accepted.",
  rating: "Each answer is a whole number from 1 to 5.",
  failed: "That change could not be saved.",
};

const PHILOSOPHIES: readonly PrescribingPhilosophy[] = ["stimulant-first", "non-stimulant-first", "case-by-case", "non-prescribing"];
const PACES: readonly TitrationPace[] = ["gradual", "standard", "brisk"];
const DECLINE: readonly DeclineReason[] = ["no_capacity", "outside_scope", "age_group", "needs_specialist", "other"];

function Declared({ name, value, label }: { name: string; value: boolean | null; label: string }) {
  return (
    <Field label={label}>
      <select name={name} defaultValue={value === null ? "" : value ? "yes" : "no"} className={inputClass}>
        <option value="">Not declared</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </Field>
  );
}

function Checks<T extends string>({ name, options, labels, chosen }: { name: string; options: readonly T[]; labels: Readonly<Record<T, string>>; chosen: readonly T[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((option) => (
        <label key={option} className="inline-flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name={name} value={option} defaultChecked={chosen.includes(option)} className="h-5 w-5" />
          {labels[option]}
        </label>
      ))}
    </div>
  );
}

export default async function GPDashboardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const email = await requireSession();
  const { id } = await params;
  const gp = gpById(id);
  if (!gp) notFound();
  const { saved, error } = await searchParams;

  const matches = matchesForGP(gp.id);
  const requests = matches.flatMap((m) => {
    const patient = patientById(m.patientId);
    return patient ? [incomingRequestView(m, patient)] : [];
  });
  const waiting = requests.filter((r) => r.status === "proposed");
  const accepted = requests.filter((r) => r.status === "accepted" || r.status === "completed");
  const answered = requests.filter((r) => r.status === "declined" || r.status === "withdrawn");
  const feedbackByMatch = new Map(allFeedback().filter((f) => f.from === "gp").map((f) => [f.matchId, f]));
  const patientFeedbackCount = allFeedback().filter((f) => f.from === "patient" && allMatches().some((m) => m.id === f.matchId && m.gpId === gp.id)).length;
  const aggregate = gp.ratingAggregate;

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-stone-500">
            <Link className="underline underline-offset-2" href="/console/gp">
              GP profiles
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{gp.name}</h1>
          <p className="max-w-2xl text-stone-600">
            {gp.practice}, {gp.practiceLocation.suburb}. {VERIFICATION_LABELS[gp.verificationStatus]}
            {gp.verifiedOn ? ` on ${gp.verifiedOn}` : ""}. {gp.realPerson ? "A real person: nothing below was invented, and blank means not declared." : "An invented example: the declarations below were generated for the demonstration."}
          </p>
          <p className="max-w-2xl text-sm text-stone-500">
            <Link className="underline underline-offset-2" href={`/gp/${encodeURIComponent(gp.id)}`}>
              See the public profile
            </Link>
          </p>
        </div>

        {saved && (
          <p role="status" data-testid="gp-saved" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {SAVED_COPY[saved] ?? "Saved."}
          </p>
        )}
        {error && (
          <p role="alert" data-testid="gp-error" className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
            {ERROR_COPY[error] ?? ERROR_COPY.failed}
          </p>
        )}

        <section aria-labelledby="requests-heading" className="flex flex-col gap-4">
          <h2 id="requests-heading" className="text-lg font-medium">
            Requests waiting on you ({waiting.length})
          </h2>
          {waiting.length === 0 ? (
            <p data-testid="requests-empty" className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">
              Nothing waiting. A request appears here when the matcher proposes somebody to you; nothing is booked until you accept.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {waiting.map((r) => (
                <li key={r.matchId} data-testid="incoming-request" data-match={r.matchId} className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
                  <p className="text-sm text-stone-500">
                    Their {r.position === 1 ? "first" : r.position === 2 ? "second" : "third"} choice · from {r.suburb} · fit to your declaration {Math.round(r.gpRankScore * 100)} of 100 · their side {Math.round(r.patientRankScore * 100)} of 100
                  </p>
                  <blockquote className="border-l-2 border-stone-300 pl-3 text-stone-800">{r.narrative}</blockquote>
                  <p className="text-sm text-stone-700">
                    {AGE_GROUP_LABELS[r.signals.ageGroup]} · {CONSULT_STYLE_LABELS[r.signals.preferredConsultStyle]} · {BILLING_LABELS[r.signals.billingPreference]}
                    {r.signals.comorbidities.length > 0 ? ` · alongside: ${r.signals.comorbidities.map((c) => COMORBIDITY_LABELS[c]).join(", ")}` : ""}
                    {r.signals.priorAssessment ? " · has an earlier assessment" : ""}
                    {r.signals.medicationHistory !== "none" ? ` · medication: ${r.signals.medicationHistory}` : ""}
                  </p>
                  <p className="text-sm text-stone-600">
                    <span className="font-medium text-stone-800">Why the model proposed them:</span> {r.rationale.headline} {r.rationale.points.slice(0, 2).join(" ")}
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <form action={answerMatch} className="flex items-center">
                      <input type="hidden" name="gpId" value={gp.id} />
                      <input type="hidden" name="matchId" value={r.matchId} />
                      <input type="hidden" name="answer" value="accept" />
                      <button type="submit" className={primaryButtonClass} data-testid="accept-request">
                        Accept
                      </button>
                    </form>
                    <form action={answerMatch} className="gp-answer flex flex-wrap items-end gap-2">
                      <input type="hidden" name="gpId" value={gp.id} />
                      <input type="hidden" name="matchId" value={r.matchId} />
                      <input type="hidden" name="answer" value="decline" />
                      <Field label="Decline, because">
                        <select name="reason" defaultValue="" className={inputClass} required>
                          <option value="" disabled>
                            Choose a reason
                          </option>
                          {DECLINE.map((d) => (
                            <option key={d} value={d}>
                              {DECLINE_REASON_LABELS[d]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <button type="submit" className="console-button min-h-11" data-testid="decline-request">
                        Decline
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="accepted-heading" className="flex flex-col gap-4">
          <h2 id="accepted-heading" className="text-lg font-medium">
            Accepted ({accepted.length})
          </h2>
          {accepted.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600">Nobody accepted yet.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {accepted.map((r) => {
                const mine = feedbackByMatch.get(r.matchId);
                return (
                  <li key={r.matchId} data-testid="accepted-request" className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-4">
                    <p className="text-sm text-stone-500">
                      {r.status === "completed" ? "First appointment done" : "Accepted, first appointment ahead"} · from {r.suburb} · {AGE_GROUP_LABELS[r.signals.ageGroup]}
                    </p>
                    <blockquote className="border-l-2 border-stone-300 pl-3 text-sm text-stone-700">{r.narrative}</blockquote>
                    {r.status === "accepted" && (
                      <form action={completeMatch}>
                        <input type="hidden" name="gpId" value={gp.id} />
                        <input type="hidden" name="matchId" value={r.matchId} />
                        <button type="submit" className="console-button min-h-11" data-testid="complete-request">
                          Mark the first appointment done
                        </button>
                      </form>
                    )}
                    {mine ? (
                      <p className="text-sm text-stone-600" data-testid="gp-feedback-recorded">
                        Your feedback is recorded: appropriate {mine.gpRating?.clinicalAppropriateness} of 5, capacity fit {mine.gpRating?.capacityFit} of 5.
                      </p>
                    ) : (
                      <form action={gpFeedback} className="flex flex-wrap items-end gap-3">
                        <input type="hidden" name="gpId" value={gp.id} />
                        <input type="hidden" name="matchId" value={r.matchId} />
                        <Field label="Was the referral clinically appropriate? (1 to 5)">
                          <input name="clinicalAppropriateness" type="number" min={1} max={5} step={1} defaultValue={4} className={inputClass} />
                        </Field>
                        <Field label="Did it fit the capacity you declared? (1 to 5)">
                          <input name="capacityFit" type="number" min={1} max={5} step={1} defaultValue={4} className={inputClass} />
                        </Field>
                        <Field label="Anything else">
                          <input name="text" type="text" maxLength={1000} className={inputClass} />
                        </Field>
                        <button type="submit" className={primaryButtonClass} data-testid="gp-feedback-submit">
                          Record
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {answered.length > 0 && (
            <p className="text-sm text-stone-500">
              {answered.length} declined or withdrawn.
            </p>
          )}
          {aggregate && (
            <p className="text-sm text-stone-600" data-testid="gp-aggregate">
              From {aggregate.patientCount} patient records: {Math.round(aggregate.feltUnderstoodShare * 100)}% felt understood; communication {aggregate.communicationMean} of 5. From your
              {" "}{aggregate.gpCount} records: {Math.round(aggregate.gpAppropriateShare * 100)}% appropriate. {patientFeedbackCount} patient records in all.
            </p>
          )}
        </section>

        <section aria-labelledby="capacity-heading" className="flex flex-col gap-4">
          <h2 id="capacity-heading" className="text-lg font-medium">
            Capacity
          </h2>
          <form action={saveCapacity} className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white p-4">
            <input type="hidden" name="gpId" value={gp.id} />
            <Field label={`Places open now: ${gp.credentials.caseloadCapacityCurrent}`} hint="The matcher proposes only up to this many people at once, and accepting one takes a place.">
              <input
                name="current"
                type="range"
                min={0}
                max={gp.credentials.caseloadCapacityMax}
                step={1}
                defaultValue={gp.credentials.caseloadCapacityCurrent}
                className="min-h-11 w-full"
                data-testid="capacity-slider"
                aria-valuemin={0}
                aria-valuemax={gp.credentials.caseloadCapacityMax}
              />
            </Field>
            <Field label="Most places you would hold at once">
              <input name="max" type="number" min={0} max={60} step={1} defaultValue={gp.credentials.caseloadCapacityMax} className={inputClass} />
            </Field>
            <div>
              <button type="submit" className={primaryButtonClass} data-testid="capacity-save">
                Save capacity
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="prefs-heading" className="flex flex-col gap-4">
          <h2 id="prefs-heading" className="text-lg font-medium">
            What you want proposed
          </h2>
          <p className="max-w-2xl text-sm text-stone-600">
            The other half of the match. The model ranks incoming requests against these, and a request below your minimum fit is never proposed to you at all.
          </p>
          <form action={savePreferences} className="flex flex-col gap-5 rounded-lg border border-stone-200 bg-white p-4">
            <input type="hidden" name="gpId" value={gp.id} />
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Age groups you want</legend>
              <Checks name="prefAgeGroups" options={AGE_GROUPS} labels={AGE_GROUP_LABELS} chosen={gp.preferences.ageGroups} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Appointment styles</legend>
              <Checks name="consultStyles" options={["telehealth", "in-person"] as const} labels={CONSULT_STYLE_LABELS} chosen={gp.preferences.consultStyles} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Billing you accept</legend>
              <Checks name="billing" options={["bulk-billing", "medicare-gap", "private"] as const} labels={BILLING_LABELS} chosen={gp.preferences.billingAccepted} />
            </fieldset>
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="complex" defaultChecked={gp.preferences.acceptsComplexComorbidity} className="h-5 w-5" />
              Willing to take complex comorbidity (two or more presentations named alongside)
            </label>
            <Field label={`Minimum fit before a request is proposed: ${gp.preferences.minimumFit}`} hint="0 proposes anybody who passes the hard filters; 1 proposes nobody.">
              <input name="minimumFit" type="range" min={0} max={1} step={0.05} defaultValue={gp.preferences.minimumFit} className="min-h-11 w-full" data-testid="minimum-fit" />
            </Field>
            <div>
              <button type="submit" className={primaryButtonClass} data-testid="preferences-save">
                Save preferences
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="profile-heading" className="flex flex-col gap-4">
          <h2 id="profile-heading" className="text-lg font-medium">
            How you work
          </h2>
          <p className="max-w-2xl text-sm text-stone-600">
            This is what the matcher embeds and compares with what people write. Say it plainly: who you see, how you approach medication, what a first appointment is like.
          </p>
          <form action={saveProfile} className="flex flex-col gap-5 rounded-lg border border-stone-200 bg-white p-4">
            <input type="hidden" name="gpId" value={gp.id} />
            <Field label="Bio">
              <textarea name="bio" rows={6} maxLength={3000} defaultValue={gp.credentials.bioLongText} className={inputClass} data-testid="bio" />
            </Field>
            <Field label="How you approach medication, in your words">
              <textarea name="philosophyText" rows={3} maxLength={800} defaultValue={gp.credentials.prescribingPhilosophyText} className={inputClass} />
            </Field>
            <div className="gp-fields grid gap-4 sm:grid-cols-2">
              <Field label="Medication, in one phrase">
                <select name="philosophy" defaultValue={gp.credentials.prescribingPhilosophy ?? ""} className={inputClass}>
                  <option value="">Not declared</option>
                  {PHILOSOPHIES.map((p) => (
                    <option key={p} value={p}>
                      {PHILOSOPHY_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Dose changes">
                <select name="pace" defaultValue={gp.credentials.titrationPace ?? ""} className={inputClass}>
                  <option value="">Not declared</option>
                  {PACES.map((p) => (
                    <option key={p} value={p}>
                      {PACE_LABELS[p]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Years with ADHD" hint="Blank means not declared.">
                <input name="years" type="number" min={0} max={60} step={1} defaultValue={gp.credentials.yearsTreatingAdhd ?? ""} className={inputClass} />
              </Field>
              <Field label="Short video introduction (https link)">
                <input name="videoIntroUrl" type="url" defaultValue={gp.credentials.videoIntroUrl ?? ""} className={inputClass} />
              </Field>
              <Declared name="aadpa" value={gp.credentials.aadpaTrained} label="AADPA training completed" />
              <Declared name="racgp" value={gp.credentials.racgpSpecificInterestsMember} label="RACGP Specific Interests member (ADHD, ASD or Neurodiversity)" />
              <Declared name="stateTrained" value={gp.credentials.stateAdhdTrained} label="NSW ADHD training completed" />
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Age groups you see</legend>
              <Checks name="ageGroups" options={AGE_GROUPS} labels={AGE_GROUP_LABELS} chosen={gp.credentials.ageGroupsTreated} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">What you see alongside ADHD</legend>
              <Checks name="caseloadMix" options={COMORBIDITIES} labels={COMORBIDITY_LABELS} chosen={gp.credentials.caseloadMix} />
            </fieldset>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium">Ways of working you declare</legend>
              <Checks name="manner" options={EI_QUALITY_KEYS} labels={MANNER_LABELS} chosen={gp.credentials.communicationStyle} />
            </fieldset>
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="telehealth" defaultChecked={gp.telehealthAvailable} className="h-5 w-5" />
                Telehealth, including the first appointment
              </label>
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="accepting" defaultChecked={gp.acceptingNewPatients} className="h-5 w-5" />
                Taking new matches
              </label>
            </div>
            <div>
              <button type="submit" className={primaryButtonClass} data-testid="profile-save">
                Save profile
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="evidence-heading" className="flex flex-col gap-4">
          <h2 id="evidence-heading" className="text-lg font-medium">
            Credential evidence
          </h2>
          <p className="max-w-2xl text-sm text-stone-600">
            Offer a certificate or letter for checking. This build keeps the name and the date it was offered, not the file; the check itself is a named person&rsquo;s act and is recorded with its date.
          </p>
          {gp.credentials.evidence.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-stone-700" data-testid="evidence-list">
              {gp.credentials.evidence.map((e) => (
                <li key={e.id}>
                  {e.name} · offered {e.uploadedAt.slice(0, 10)}
                </li>
              ))}
            </ul>
          )}
          <form action={uploadEvidence} className="gp-evidence flex flex-wrap items-end gap-3 rounded-lg border border-stone-200 bg-white p-4">
            <input type="hidden" name="gpId" value={gp.id} />
            <Field label="Document (PDF, PNG or JPEG, up to 8 MB)">
              <input name="evidence" type="file" accept=".pdf,.png,.jpg,.jpeg" className="min-h-11 text-sm" data-testid="evidence-file" />
            </Field>
            <button type="submit" className={primaryButtonClass} data-testid="evidence-submit">
              Offer for checking
            </button>
          </form>
        </section>
      </div>
    </ConsoleShell>
  );
}
