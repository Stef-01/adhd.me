"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitApplication } from "./actions";
import {
  CARE_AREA_GROUPS,
  CARE_AREA_LABELS,
  MANNER_LABELS,
  OFFERED_LANGUAGES,
  type CareAreaGroup,
  type ClinicianFormState,
} from "@/onboarding/types";
import { coveredSuburbs } from "@/geo/suburbs";

const initialState: ClinicianFormState = { status: "idle", message: "" };

/**
 * O181: ONE FORM, TWO WAYS TO READ IT — founder-directed 2026-08-22.
 * O185: ONE QUESTION ON SCREEN, AND ALMOST NOTHING ELSE — founder-directed 2026-08-23.
 *
 * WHAT THIS FILE USED TO ARGUE, AND WHY IT WAS HALF RIGHT. Its header said: "A multi-step flow was
 * the obvious build and is the wrong one here: the audience is a GP filling this in between
 * patients, and a four-screen wizard means four chances to lose them and no way to see how long it
 * is." Both objections are real and neither is answered by making the form longer to look at. The
 * founder's report is also real: six fieldsets and forty-odd controls arriving at once is a wall,
 * and a wall is its own way of losing somebody between patients.
 *
 * SO THE ANSWER IS NOT A WIZARD. It is one form that can be READ two ways. Sectioned is the default
 * — one idea on screen, which is `adhdme-taste`'s first layout rule and REDCap's section-per-page
 * behaviour — and "Show the whole form" is one tap away for the GP who would rather see all of it,
 * or print it, or scan for the question they are worried about. The old header's second objection
 * is answered directly rather than dismissed: the step counter and the progress rail mean the
 * sectioned view is MORE honest about its length than the scroll ever was, because "of 8" arrives
 * immediately where "how much further" needed a thumb.
 *
 * O185 — WHAT THE SECTIONED VIEW STILL GOT WRONG, MEASURED BY COUNTING WHAT WAS ON SCREEN.
 * Sectioned mode showed one FIELDSET at a time and then stacked four pieces of navigation chrome
 * above it: a two-button view toggle, a "Go to" select carrying every section name, a progress
 * sentence and a progress bar. On step one a GP met eight interactive controls before reading a
 * single question, and five of them were about the form rather than in it. Two changes, both
 * subtractive:
 *
 *   - THE CHROME LEFT THE TOP. The rail is a hairline across the head of the card with no label
 *     competing with it, the counter is four characters, and the view toggle moved BELOW the card
 *     where an escape hatch belongs. The "Go to" select is gone outright — it was a second
 *     navigation model for a form that already has "Show the whole form", which reaches any
 *     question in one tap and is the affordance a reader looking for one question actually wants.
 *   - THE WALL WAS SPLIT. "What you see often" was twelve checkboxes under three sub-headings on
 *     one screen — by some distance the busiest thing in the form, and the reason it read as a
 *     wall even in sectioned mode. The three sub-headings were already the honest seam, so each
 *     is now its own step: 4, 2 and 6 boxes. Six sections became eight.
 *
 * WHAT WAS DELIBERATELY NOT SPLIT, AND WHY THE REFUSAL IS THE INTERESTING PART. "How you work"
 * (9 statements) and "Languages" (10) are longer lists than any care group, and `adhdme-taste`'s
 * {#layout.five-then-rest} would have them show five with the rest one tap away. Both were left
 * whole. Splitting a FLAT set needs a principle for which items come first, and neither set has
 * one that is ours to invent: ranking the manner statements would be this tree deciding which way
 * of working matters most, and ranking the languages would be deciding whose language is
 * primary. The care areas split cleanly because `CARE_AREA_GROUPS` is a seam a GP already reads
 * by, not one this unit drew. A rule applied where it has no honest cut produces an arbitrary
 * order wearing the authority of a design law, which is worse than a slightly longer screen.
 *
 * THE MECHANIC THAT MAKES IT SAFE: EVERY SECTION STAYS MOUNTED, ALWAYS.
 * Sections are hidden with the `hidden` attribute, never unmounted. Three things follow, and all
 * three are the reason it is built this way rather than as a router or a set of steps:
 *   - Nothing a GP typed can be lost by moving between sections or switching views, because nothing
 *     is ever destroyed.
 *   - The server action still receives ONE native form submit carrying every field, so
 *     `submitApplication` and its validation are untouched by this change. A wizard that posted
 *     per-step would have made the view a data-model change; this cannot.
 *   - With JavaScript unavailable the form renders as it always did — every section visible, one
 *     submit — because `mode` starts at "all" on the server and only becomes "steps" after mount.
 *     A GP with a hardened browser gets the long form, which works, instead of a first section and
 *     a Next button that does nothing.
 *
 * TAILWIND V4 TRAP, LOAD-BEARING: this project's utilities live in `@layer utilities`, and every
 * hand-written rule in `globals.css` is UNLAYERED, so it beats them regardless of specificity. That
 * is why `.join-form fieldset[hidden] { display: none }` is written explicitly there instead of
 * trusting `[hidden]`'s user-agent rule — `.join-form fieldset` sets `padding-top` and a border in
 * the same file, and a bare `[hidden]` would have been overridden by nothing more than being
 * unlayered next to it. An e2e assertion checks the computed style rather than the attribute.
 */

/**
 * The sections, and the fields each one owns.
 *
 * `fields` is not decoration: when the server returns errors the form has to move the reader TO
 * them, and in a sectioned view an error in a section nobody is looking at is an error nobody can
 * see. This map is what makes "jump to the first section with a problem" possible, and it is
 * keyed to `ClinicianFormState["fieldErrors"]` so a new error key that nobody routes is a type
 * error rather than a silent dead end.
 *
 * O185: `careAreas` stays on the FIRST care step even though the boxes now span three. The error
 * it carries is "choose at least one", which is a statement about all three steps together, and
 * the first of them is where the anchor (`adhd-assessment`) and the framing sentence live — so it
 * is the step where the message reads as an instruction rather than as a complaint about the six
 * boxes that happen to be on screen.
 */
type ErrorKey = keyof NonNullable<ClinicianFormState["fieldErrors"]>;

const SECTIONS: ReadonlyArray<{ id: string; title: string; fields: readonly ErrorKey[] }> = [
  { id: "you", title: "About you", fields: ["fullName", "ahpraRegistrationNumber", "email"] },
  { id: "practice", title: "Your practice", fields: ["practiceName", "practiceSuburb"] },
  { id: "care-adhd", title: "ADHD care you see often", fields: ["careAreas", "desiredMixPercent"] },
  { id: "care-mood", title: "Depression and anxiety you see often", fields: [] },
  { id: "care-other", title: "Other mental health you see often", fields: [] },
  { id: "manner", title: "How you work", fields: ["manner"] },
  { id: "languages", title: "Languages other than English", fields: [] },
  { id: "declarations", title: "Declarations", fields: ["consent"] },
];

/**
 * The three care steps, paired to the group each one renders.
 *
 * The section index is looked up by id rather than written as a number: `data-section` and the
 * `hidden` test both key off position, and a hand-typed offset here would silently mis-hide a
 * section the day anybody inserts a step above it.
 */
const CARE_STEPS: ReadonlyArray<{ group: CareAreaGroup; sectionId: string; lede: string }> = [
  {
    group: "ADHD",
    sectionId: "care-adhd",
    lede:
      "Your own statement about your own practice. Nobody here checks it, nothing here ranks clinicians against each other, and none of it is published as a specialty.",
  },
  {
    group: "Depression and anxiety",
    sectionId: "care-mood",
    lede: "Declared by you and checked by nobody, like the rest.",
  },
  {
    group: "Other mental health",
    sectionId: "care-other",
    lede: "Declared by you and checked by nobody, like the rest.",
  },
];

/** Guards the pairing above against a renamed or deleted section id. */
const sectionIndex = (id: string) => SECTIONS.findIndex((section) => section.id === id);

export function ClinicianJoinForm({ desiredMixPercent }: { desiredMixPercent?: number }) {
  const [state, action, pending] = useActionState(submitApplication, initialState);

  /**
   * "all" on the server, "steps" once mounted — see the header. The one-frame change is deliberate
   * and is the price of a form that still works without JavaScript; the alternative was a hydration
   * mismatch or a form that silently breaks for the reader least able to report it.
   */
  const [mode, setMode] = useState<"all" | "steps">("all");
  const [step, setStep] = useState(0);
  const [advisory, setAdvisory] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);
  const moveRequested = useRef(false);

  useEffect(() => setMode("steps"), []);

  const err = state.fieldErrors ?? {};

  /**
   * An error in a hidden section is an error nobody can see, so the form goes to it.
   *
   * This runs on the errored state rather than inside the submit handler because the state arrives
   * from the server action, not from the event — the submit that produced it finished long before
   * the errors existed.
   */
  useEffect(() => {
    if (state.status !== "error") return;
    const keys = Object.keys(state.fieldErrors ?? {}) as ErrorKey[];
    if (keys.length === 0) return;
    const target = SECTIONS.findIndex((section) => section.fields.some((field) => keys.includes(field)));
    if (target >= 0) {
      setStep(target);
      moveRequested.current = true;
    }
  }, [state]);

  /**
   * Focus follows the reader's position, but only when they asked to move.
   *
   * Without the flag this would steal focus on first paint and on every unrelated re-render, which
   * is the classic way an "accessible" focus manager becomes a trap for the people it was for.
   */
  useEffect(() => {
    if (!moveRequested.current) return;
    moveRequested.current = false;
    headingRef.current?.focus();
  }, [step, mode]);

  if (state.status === "success") {
    return (
      <div className="join-success" role="status" aria-live="polite">
        <h2>Application received.</h2>
        <p>{state.message}</p>
      </div>
    );
  }

  const stepped = mode === "steps";
  const isLast = step === SECTIONS.length - 1;

  const goTo = (index: number) => {
    setStep(Math.min(Math.max(index, 0), SECTIONS.length - 1));
    setAdvisory(null);
    moveRequested.current = true;
  };

  /**
   * Advancing checks THIS SECTION ONLY, and it checks with the browser rather than with a second
   * copy of the rules.
   *
   * `checkValidity()` reads the `required` and `type` attributes already on the inputs, so this
   * cannot drift from the markup and does not restate anything `submitApplication` validates —
   * the server stays the authority on what a valid application is. The point is smaller and
   * REDCap's: telling a GP about an empty required field while they are still looking at it beats
   * telling them about it six sections later.
   */
  const advance = () => {
    const section = formRef.current?.querySelector<HTMLFieldSetElement>(`[data-section="${step}"]`);
    const invalid = section
      ? Array.from(section.querySelectorAll<HTMLInputElement>("input")).find((input) => !input.checkValidity())
      : undefined;

    if (invalid) {
      setAdvisory("There is a question above that still needs an answer.");
      invalid.focus();
      return;
    }
    goTo(step + 1);
  };

  return (
    <>
      <div className="join-card">
        <form action={action} className="join-form" noValidate ref={formRef} data-mode={mode}>
          {stepped && (
            /* ONE ROW, NOT TWO. The counter is four characters, tabular so the digits do not
               shuffle the line as the step changes, and the rail takes the rest of the width — the
               same fact in words and drawn, sharing a row rather than stacking into two more
               pieces of chrome. `adhdme-taste` {#layout.shared-row}: a label and its evidence
               belong together.

               THE RAIL IS NOT AT THE CARD'S TOP EDGE, and the reason is measured rather than
               aesthetic: a 2px bar inside a box with `overflow: hidden` and a 14px radius has both
               of its ends eaten by the corner curve, so at step 1 the 12.5% fill rendered as a
               detached dash floating near the corner instead of as the start of a track. Inset
               inside the padding it is a full-width line that begins where the content begins.

               The title is NOT repeated here — it is the legend directly below, and printing it
               twice is exactly the doubling this unit exists to remove. A screen reader reaching
               this live region hears the position and then reads straight into the question. */
            <div className="join-progress-row">
              <p className="join-count" ref={headingRef} tabIndex={-1} aria-live="polite">
                Step {step + 1} of {SECTIONS.length}
              </p>
              <div className="join-rail" aria-hidden="true">
                <span style={{ width: `${((step + 1) / SECTIONS.length) * 100}%` }} />
              </div>
            </div>
          )}

          {state.status === "error" && <p className="join-error" role="alert">{state.message}</p>}

          <fieldset data-section={0} hidden={stepped && step !== 0}>
            <legend>About you</legend>
            <label>
              <span>Full name</span>
              <input name="fullName" type="text" autoComplete="name" autoCapitalize="words" aria-invalid={Boolean(err.fullName)} required />
              {err.fullName && <small role="alert">{err.fullName}</small>}
            </label>
            <label>
              <span>Ahpra registration number</span>
              {/* `autoCapitalize`/`autoCorrect` off and an uppercase transform in CSS: the number is
                  MED0001234567 and a phone keyboard would otherwise capitalise and autocorrect it. */}
              <input
                name="ahpraRegistrationNumber"
                type="text"
                placeholder="MED0001234567"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={Boolean(err.ahpraRegistrationNumber)}
                required
              />
              <small className="join-hint">Published on the public register, which is what lets a patient check the rest of your listing themselves.</small>
              {err.ahpraRegistrationNumber && <small role="alert">{err.ahpraRegistrationNumber}</small>}
            </label>
            <label>
              <span>Email</span>
              <input name="email" type="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-invalid={Boolean(err.email)} required />
              {err.email && <small role="alert">{err.email}</small>}
            </label>
          </fieldset>

          <fieldset data-section={1} hidden={stepped && step !== 1}>
            <legend>Your practice</legend>
            <label>
              <span>Practice name</span>
              <input name="practiceName" type="text" autoComplete="organization" autoCapitalize="words" aria-invalid={Boolean(err.practiceName)} required />
              {err.practiceName && <small role="alert">{err.practiceName}</small>}
            </label>
            <label>
              <span>Suburb</span>
              {/* Already a combobox: `list` gives the native dropdown of covered suburbs while still
                  accepting one that is not on it, which is the right shape for a field where the
                  list is long, familiar, and not exhaustive. */}
              <input name="practiceSuburb" type="text" list="join-suburbs" autoComplete="address-level2" autoCapitalize="words" aria-invalid={Boolean(err.practiceSuburb)} required />
              <datalist id="join-suburbs">
                {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
              </datalist>
              <small className="join-hint">Suburb, not a street address. It is the question a patient is actually asking.</small>
              {err.practiceSuburb && <small role="alert">{err.practiceSuburb}</small>}
            </label>
          </fieldset>

          {/* O185: one care GROUP per step. Twelve boxes under three sub-headings was the busiest
              screen in the form; the sub-headings were already the seam a GP reads by, so they
              became the steps and the sub-heading markup disappeared with them. */}
          {CARE_STEPS.map(({ group, sectionId, lede }) => {
            const index = sectionIndex(sectionId);
            const isFirstCareStep = group === CARE_AREA_GROUPS[0];
            return (
              <fieldset key={sectionId} data-section={index} hidden={stepped && step !== index}>
                <legend>{SECTIONS[index]!.title}</legend>
                <p className="join-hint">{lede}</p>
                {isFirstCareStep && err.careAreas && (
                  <small role="alert" className="join-field-error">{err.careAreas}</small>
                )}
                <div className="join-checks">
                  {CARE_AREA_LABELS.filter((area) => area.group === group).map((area) => (
                    <label key={area.id} className="join-check">
                      <input type="checkbox" name="careAreas" value={area.id} defaultChecked={area.id === "adhd-assessment"} />
                      <span>{area.label}</span>
                    </label>
                  ))}
                </div>
                {/* O26: the mix from the hero, no longer discarded at the fold. Only rendered — and
                    only submitted — once the GP has actually set it; an untouched default is not a
                    statement, so the field is simply absent until then. O185 keeps it on the ADHD
                    step, which is the work the percent is about. */}
                {isFirstCareStep && desiredMixPercent !== undefined && (
                  <p className="join-hint join-mix-echo" data-testid="mix-echo">
                    The mix you set above — <strong>{desiredMixPercent}%</strong> of your patients in this
                    kind of work — goes with your application as your stated preference. A preference we
                    match toward, not a booking promise, and it is never published.
                    <input type="hidden" name="desiredMixPercent" value={desiredMixPercent} />
                  </p>
                )}
                {isFirstCareStep && err.desiredMixPercent && (
                  <small role="alert" className="join-field-error">{err.desiredMixPercent}</small>
                )}
              </fieldset>
            );
          })}

          <fieldset data-section={sectionIndex("manner")} hidden={stepped && step !== sectionIndex("manner")}>
            <legend>How you work</legend>
            {/* THE HALF THAT SCOPE CANNOT CARRY. A probe of the finder found that about as many people
                describe what they want by MANNER as by clinical area — "I can never get a word in",
                "somewhere I can be honest about how much I drink" — and a clinician who declares only
                care areas is invisible to every one of them. That is a worse outcome for the GP than
                for us, which is why the form asks and why at least one is required.

                Each is phrased as a fact about the day rather than as a self-description: "do you book
                a longer first appointment" has a true answer, "are you unhurried" has only a nice one. */}
            <p className="join-hint">
              Pick the ones that are true of how your day actually runs. Patients search on these as
              often as they search on clinical areas.
            </p>
            <div className="join-checks join-checks-wide">
              {MANNER_LABELS.map((quality) => (
                <label key={quality.id} className="join-check">
                  <input type="checkbox" name="manner" value={quality.id} />
                  <span>{quality.ask}</span>
                </label>
              ))}
            </div>
            {err.manner && <p className="join-field-error" role="alert">{err.manner}</p>}
          </fieldset>

          <fieldset data-section={sectionIndex("languages")} hidden={stepped && step !== sectionIndex("languages")}>
            <legend>Languages other than English</legend>
            <p className="join-hint">Declared by you and checked by nobody, and your listing will say so.</p>
            <div className="join-checks">
              {OFFERED_LANGUAGES.map((language) => (
                <label key={language} className="join-check">
                  <input type="checkbox" name="languages" value={language} />
                  <span>{language}</span>
                </label>
              ))}
            </div>
            <label className="join-other-languages">
              <span>Another language not listed</span>
              <input name="otherLanguages" type="text" placeholder="e.g. Punjabi, Cantonese, Nepali" autoCapitalize="words" />
              <small className="join-hint">Separate several with commas.</small>
            </label>
          </fieldset>

          <fieldset data-section={sectionIndex("declarations")} hidden={stepped && step !== sectionIndex("declarations")}>
            <legend>Declarations</legend>
            <label className="join-check join-declaration">
              <input type="checkbox" name="nswAdhdTrained" defaultChecked />
              <span>I have completed the training NSW requires to carry ADHD care without ongoing psychiatrist involvement.</span>
            </label>
            <label className="join-check join-declaration">
              <input type="checkbox" name="acceptingNewPatients" defaultChecked />
              <span>I am currently accepting new patients.</span>
            </label>
            <label className="join-check join-declaration">
              <input type="checkbox" name="consent" aria-invalid={Boolean(err.consent)} />
              <span>These details are mine and are accurate. I understand nothing is published until ADHD.ME has completed an Ahpra advertising check.</span>
            </label>
            {err.consent && <small role="alert" className="join-field-error">{err.consent}</small>}
          </fieldset>

          {advisory && <p className="join-field-error join-advisory" role="alert">{advisory}</p>}

          {/* ONE ROW, ONE PRIMARY ACTION. Back is an escape and stays a quiet text control on the
              left; the button that carries the flow — Next, or Send on the last step — is the only
              filled thing on the screen. The submit button is always rendered and hidden rather
              than removed while there are steps still to come: the form must stay submittable by
              keyboard, and a submit button that is unmounted takes implicit Enter-to-submit with
              it. */}
          <div className="join-actions">
            {stepped && (
              <button type="button" className="join-step-back" onClick={() => goTo(step - 1)} disabled={step === 0}>
                Back
              </button>
            )}
            {stepped && !isLast && (
              <button type="button" className="join-step-next" onClick={advance}>
                Next
              </button>
            )}
            <button type="submit" className="join-submit" disabled={pending} hidden={stepped && !isLast}>
              {pending ? "Sending…" : "Send application"}
            </button>
          </div>
        </form>
      </div>

      {/* THE ESCAPE HATCH SITS UNDER THE CARD, OUTSIDE THE FORM. Outside is not a detail: a
          <button> inside a <form> with no explicit type submits it, and a reader switching how they
          READ the page must never be able to send an application by doing so. Under the card is
          where O185 moved it — the toggle is about the form rather than in it, and above the first
          question it was the second thing a GP met. */}
      <div className="join-underbar">
        <div className="join-viewtoggle" role="group" aria-label="How to show this form">
          <button
            type="button"
            aria-pressed={stepped}
            onClick={() => { setMode("steps"); setAdvisory(null); moveRequested.current = true; }}
          >
            One section at a time
          </button>
          <button
            type="button"
            aria-pressed={!stepped}
            onClick={() => { setMode("all"); setAdvisory(null); }}
          >
            Show the whole form
          </button>
        </div>

        <p className="join-hint join-footnote">
          We ask for nothing about any patient, and there is no field here for a biography, a rating
          or a photo of a certificate.
        </p>
      </div>
    </>
  );
}
