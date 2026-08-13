import { requireSession } from "../guard";
import { onboard } from "../actions";
import { ConsoleShell, ErrorNote, Field, inputClass, primaryButtonClass } from "../ui";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const email = await requireSession();
  const { error } = await searchParams;
  return (
    <ConsoleShell email={email}>
      <div className="mx-auto max-w-md">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight">Set up your practice</h1>
        <p className="mb-6 text-sm text-stone-500">
          Three settings to start. Eligibility rules come next and can be changed any time.
        </p>
        <ErrorNote show={error === "1"} />
        <form action={onboard} className="mt-4 flex flex-col gap-5">
          <Field label="Practice name">
            <input name="name" required minLength={2} className={inputClass} />
          </Field>
          <Field label="Timezone" hint="IANA name, e.g. Australia/Sydney">
            <input name="timezone" required defaultValue="Australia/Sydney" className={inputClass} />
          </Field>
          <Field
            label="Holdout share (%)"
            hint="Share of eligible patients never invited, so incremental impact stays measurable."
          >
            <input
              name="holdoutPercent"
              type="number"
              required
              min={0}
              max={50}
              defaultValue={10}
              className={inputClass}
            />
          </Field>
          <button type="submit" className={primaryButtonClass}>
            Create practice
          </button>
        </form>
      </div>
    </ConsoleShell>
  );
}
