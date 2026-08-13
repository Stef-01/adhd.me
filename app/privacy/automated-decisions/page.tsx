// W33, revised at W102, rewritten at W201: ADM-transparency statement (Privacy Act 1988, APP 1.7,
// commencing 10 December 2026) — what Meherr automates, what it never automates, and the human
// controls.
//
// W102 revised this page and left an instruction in a comment: keep it in the same commit as any
// change to what the software decides. Three years of product went by. An instruction in a comment
// is a hope, so W201 replaced it with a register — `src/privacy/automated-decisions.ts` — that a
// test checks against the source tree in both directions. A module that decides something about a
// patient and is not declared there fails the suite.
//
// This file is therefore deliberately thin: it is layout. Nothing about what the software decides
// is written here, because a sentence written here is a sentence that can drift from the code.
// Add a decision to the register, not to this page.

import {
  AUTOMATED_DECISIONS,
  HUMAN_CONTROLS,
  INFORMATION_USED,
  NEVER_AUTOMATED,
} from "@/privacy/automated-decisions";

export const metadata = { title: "Automated decisions — Meherr" };

export default function AutomatedDecisionsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        How Meherr uses automated decision-making
      </h1>
      <p className="mt-4 text-sm leading-6 text-stone-500">
        This statement is published to meet the Privacy Act&apos;s automated-decision-making
        transparency requirements, which commence on 10 December 2026, and is kept in step with
        the software itself. Last reviewed 11 August 2026.
      </p>

      <div className="mt-10 space-y-8 text-stone-700">
        <section>
          <h2 className="text-lg font-medium text-stone-900">What information is used</h2>
          {INFORMATION_USED.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-sm leading-6">
              {paragraph}
            </p>
          ))}
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-900">What is automated</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {AUTOMATED_DECISIONS.map((decision) => (
              <li key={decision.id}>
                <strong>{decision.title}</strong> {decision.what}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-900">What is never automated</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {NEVER_AUTOMATED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium text-stone-900">Human controls</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
            {HUMAN_CONTROLS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
