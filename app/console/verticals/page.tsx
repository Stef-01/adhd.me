// W164: the vertical console — which verticals exist, and what each still needs.
//
// The unit's gate has W127's second half attached: the zero state SAYS WHY it is empty rather
// than rendering a blank grid. That matters more here than it did there, because this page has
// TWO different empty states and they mean opposite things:
//
//   NO VERTICALS ARE DECLARED — nobody has said which pathways and material belong together yet.
//   That is a piece of work, and it is work the loop can do.
//
//   VERTICALS ARE DECLARED AND NOTHING IN THEM IS READY — every member is waiting on a gate. The
//   assembly is done; what is missing is a specialist, a founder signature, and the G5 ruling on
//   guideline values. No amount of building changes it.
//
// A blank grid reads as neither. Worse, the two lead to opposite next actions — one says "keep
// going", the other says "the ruling is now the only thing left" — so the page names which it is.
//
// Everything shown is asked of a module that owns the answer. W157 says whether a vertical is
// usable, W158 says what stands between here and shippable and who has to act, W159 says which
// members disagree. This page renders; it does not decide. In particular it does NOT render the
// criteria of any pathway — W127's rule, for W127's reason: unreviewed clinical content in a
// console with the product's name on it is the thing G5 exists to prevent.

import { redirect } from "next/navigation";
import { getConsole } from "@/console/store";
import { authorize } from "@/tenancy/tenancy";
import { CONTRADICTION_COPY } from "@/verticals/consistency";
import { assessCompleteness } from "@/verticals/completeness";
import { VERTICAL_REFUSAL_COPY, usableVertical } from "@/verticals/model";
import { assembleEvidence, getVerticalSpecs, knownMembers } from "@/verticals/store";
import { requirePractice } from "../guard";
import { ConsoleShell } from "../ui";

export const dynamic = "force-dynamic";

export const metadata = { title: "Verticals — Meherr" };

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  awaiting_gate: "Written, not yet through its gate",
  not_authored: "Nothing exists under this reference",
  indeterminate: "Cannot tell",
};

export default async function VerticalsPage() {
  const { email, record } = await requirePractice();
  const console_ = getConsole();
  if (!authorize(console_.memberships, email, record.practice.id, "view_dashboard").allowed) {
    redirect("/console");
  }

  const specs = getVerticalSpecs();
  const evidence = assembleEvidence();
  const pool = knownMembers();
  const rows = specs.map((spec) => ({
    spec,
    result: usableVertical(spec, evidence),
    report: assessCompleteness(spec, evidence, pool),
  }));
  const shippable = rows.filter((r) => r.result.usable).length;
  const nothingReady = rows.length > 0 && rows.every((r) => r.report.readyMembers === 0);

  return (
    <ConsoleShell email={email}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Verticals</h1>
          <p className="text-stone-600">
            A vertical is a set of care pathways, material and monitoring intervals that belong
            together. Nothing in one can be used until every part of it has been reviewed and
            signed off.
          </p>
        </div>

        <p
          data-testid="verticals-count"
          className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
        >
          <strong>{shippable}</strong> of <strong>{rows.length}</strong> vertical(s) can be used.
        </p>

        {rows.length === 0 ? (
          // First zero state: nothing has been assembled. This is work, and it is doable.
          <section
            data-testid="verticals-none-declared"
            aria-labelledby="none-declared-heading"
            className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
          >
            <h2 id="none-declared-heading" className="font-medium text-stone-800">
              No vertical has been put together yet.
            </h2>
            <p>
              This is the current state of the product, not a loading error and not a page waiting
              for you to fill it in. Nobody has yet said which pathways, material and monitoring
              intervals belong together as one care model.
            </p>
            <p>
              That step does not need anybody&rsquo;s sign-off — it is a statement about what goes
              with what. The sign-off is needed afterwards, for the contents.
            </p>
          </section>
        ) : (
          <>
            {nothingReady && (
              // Second zero state, and the opposite message: assembly is done, the ruling is not.
              <section
                data-testid="verticals-nothing-ready"
                aria-labelledby="nothing-ready-heading"
                className="flex flex-col gap-3 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-stone-600"
              >
                <h2 id="nothing-ready-heading" className="font-medium text-stone-800">
                  Every vertical here is complete as an assembly, and none of it can be used.
                </h2>
                <p>
                  Nothing listed below has cleared a clinical sign-off. Meherr ships with no
                  pathway content, no monitoring intervals and no education material of its own —
                  each item needs a specialist to review it and the founder to sign it off, and
                  the interval values additionally wait on a decision that has not been taken.
                </p>
                <p>
                  So this is not a list of things half-built. It is a list of things waiting on
                  people.
                </p>
              </section>
            )}

            <ul data-testid="verticals-list" className="flex flex-col gap-4">
              {rows.map(({ spec, result, report }) => (
                <li
                  key={spec.verticalId}
                  data-testid={`vertical-${spec.verticalId}`}
                  className="rounded-lg border border-stone-200 bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-medium">{spec.name}</h2>
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        result.usable ? "bg-emerald-50 text-emerald-900" : "bg-stone-100 text-stone-700"
                      }`}
                    >
                      {result.usable ? "Can be used" : "Not usable"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {report.readyMembers} of {report.totalMembers} parts ready.
                  </p>

                  {!result.usable && (
                    <ul
                      data-testid={`refusals-${spec.verticalId}`}
                      className="mt-3 flex flex-col gap-2 text-sm text-stone-700"
                    >
                      {result.reasons.map((reason) => (
                        <li key={reason}>{VERTICAL_REFUSAL_COPY[reason]}</li>
                      ))}
                    </ul>
                  )}

                  {report.outstanding.length > 0 && (
                    // Grouped by what has to HAPPEN, which is W158's shape: a flat list of member
                    // ids hides that the blockers have different owners.
                    <ul
                      data-testid={`outstanding-${spec.verticalId}`}
                      className="mt-3 flex flex-col gap-1 text-sm text-stone-600"
                    >
                      {report.outstanding.map((row) => (
                        <li key={row.kind}>
                          {row.count} × {row.kind.replace(/_/g, " ")} — needs {row.chain}.
                        </li>
                      ))}
                    </ul>
                  )}

                  {(result.usable ? result.vertical.contradictions : result.contradictions).length > 0 && (
                    // W159: shown, never resolved. A blocking finding refused above; anything
                    // rendered here is a judgement for a person.
                    <ul
                      data-testid={`contradictions-${spec.verticalId}`}
                      className="mt-3 flex flex-col gap-2 text-sm text-amber-900"
                    >
                      {(result.usable ? result.vertical.contradictions : result.contradictions).map(
                        (finding, index) => (
                          <li key={`${finding.kind}-${finding.subject}-${index}`}>
                            <span className="font-medium">{finding.detail}</span>{" "}
                            {CONTRADICTION_COPY[finding.kind]}
                          </li>
                        ),
                      )}
                    </ul>
                  )}

                  <dl className="mt-3 flex flex-col gap-1 text-sm text-stone-500">
                    {report.members.map((assessment) => (
                      <div key={`${assessment.member.kind}:${assessment.member.ref}`} className="flex gap-2">
                        <dt>{assessment.member.kind.replace(/_/g, " ")}</dt>
                        <dd>{STATUS_LABEL[assessment.status]}</dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ul>
          </>
        )}

        <p data-testid="verticals-note" className="text-sm text-stone-500">
          What a pathway actually says is not shown here. This page is about whether the parts of a
          care model have been checked and by whom, not about the clinical content itself — and
          material nobody has reviewed does not belong in front of a clinician with Meherr&rsquo;s
          name on it.
        </p>
      </div>
    </ConsoleShell>
  );
}
