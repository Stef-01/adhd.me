"use client";

import { useActionState } from "react";
import { submitApplication } from "./actions";
import { CARE_AREA_LABELS, OFFERED_LANGUAGES, type ClinicianFormState } from "@/onboarding/types";
import { coveredSuburbs } from "@/geo/suburbs";

const initialState: ClinicianFormState = { status: "idle", message: "" };

/**
 * One page, four groups, no wizard.
 *
 * A multi-step flow was the obvious build and is the wrong one here: the audience is a GP filling
 * this in between patients, and a four-screen wizard means four chances to lose them and no way to
 * see how long it is. Everything visible at once is shorter to complete and honest about its
 * length. Labels sit above inputs and errors below them, never a placeholder as a label.
 */
export function ClinicianJoinForm() {
  const [state, action, pending] = useActionState(submitApplication, initialState);

  if (state.status === "success") {
    return (
      <div className="join-success" role="status" aria-live="polite">
        <h2>Application received.</h2>
        <p>{state.message}</p>
      </div>
    );
  }

  const err = state.fieldErrors ?? {};

  return (
    <form action={action} className="join-form" noValidate>
      {state.status === "error" && <p className="join-error" role="alert">{state.message}</p>}

      <fieldset>
        <legend>You</legend>
        <label>
          <span>Full name</span>
          <input name="fullName" type="text" autoComplete="name" aria-invalid={Boolean(err.fullName)} required />
          {err.fullName && <small role="alert">{err.fullName}</small>}
        </label>
        <label>
          <span>Ahpra registration number</span>
          <input name="ahpraRegistrationNumber" type="text" placeholder="MED0001234567" aria-invalid={Boolean(err.ahpraRegistrationNumber)} required />
          <small className="join-hint">Published on the public register, which is what lets a patient check the rest of your listing themselves.</small>
          {err.ahpraRegistrationNumber && <small role="alert">{err.ahpraRegistrationNumber}</small>}
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" aria-invalid={Boolean(err.email)} required />
          {err.email && <small role="alert">{err.email}</small>}
        </label>
      </fieldset>

      <fieldset>
        <legend>Your practice</legend>
        <label>
          <span>Practice name</span>
          <input name="practiceName" type="text" autoComplete="organization" aria-invalid={Boolean(err.practiceName)} required />
          {err.practiceName && <small role="alert">{err.practiceName}</small>}
        </label>
        <label>
          <span>Suburb</span>
          <input name="practiceSuburb" type="text" list="join-suburbs" autoComplete="address-level2" aria-invalid={Boolean(err.practiceSuburb)} required />
          <datalist id="join-suburbs">
            {coveredSuburbs().map((suburb) => <option key={suburb} value={suburb} />)}
          </datalist>
          <small className="join-hint">Suburb, not a street address. It is the question a patient is actually asking.</small>
          {err.practiceSuburb && <small role="alert">{err.practiceSuburb}</small>}
        </label>
      </fieldset>

      <fieldset>
        <legend>What you see often</legend>
        <p className="join-hint">
          Your own statement about your own practice. Nobody here checks it, nothing here ranks
          clinicians against each other, and none of it is published as a specialty.
        </p>
        {err.careAreas && <small role="alert" className="join-field-error">{err.careAreas}</small>}
        <div className="join-checks">
          {CARE_AREA_LABELS.map((area) => (
            <label key={area.id} className="join-check">
              <input type="checkbox" name="careAreas" value={area.id} defaultChecked={area.id === "adhd-assessment"} />
              <span>{area.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
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
      </fieldset>

      <fieldset>
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

      <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send application"}</button>
      <p className="join-hint join-footnote">
        We ask for nothing about any patient, and there is no field here for a biography, a rating
        or a photo of a certificate.
      </p>
    </form>
  );
}
