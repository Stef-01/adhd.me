"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerInterest } from "./interest-actions";
import { INTEREST_REASONS, type InterestFormState } from "@/interest/types";

const initialState: InterestFormState = { status: "idle", message: "" };

export function InterestForm() {
  const [state, action, pending] = useActionState(registerInterest, initialState);
  const router = useRouter();

  // Launch item 4: success lands on a page, not a message. A page can be returned to and
  // screenshotted, and it is the only shape a conversion can be counted in without watching
  // anybody. The inline block below still renders for the instant before navigation, so the
  // announcement reaches assistive tech either way.
  useEffect(() => {
    if (state.status === "success") router.replace("/thanks");
  }, [state.status, router]);

  if (state.status === "success") {
    return (
      <div className="community-form-success" role="status" aria-live="polite">
        <strong>You’re registered.</strong>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="community-interest-form" noValidate>
      {state.status === "error" && <p className="community-form-error" role="alert">{state.message}</p>}
      <div className="community-field-row">
        <label>
          <span>Name</span>
          <input name="name" type="text" autoComplete="name" aria-invalid={Boolean(state.fieldErrors?.name)} aria-describedby={state.fieldErrors?.name ? "interest-name-error" : undefined} required />
          {state.fieldErrors?.name && <small id="interest-name-error">{state.fieldErrors.name}</small>}
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" inputMode="email" autoComplete="email" aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.fieldErrors?.email ? "interest-email-error" : undefined} required />
          {state.fieldErrors?.email && <small id="interest-email-error">{state.fieldErrors.email}</small>}
        </label>
      </div>

      <fieldset aria-describedby={state.fieldErrors?.interests ? "interest-options-error" : undefined}>
        <legend>Choose any that fit</legend>
        <div className="community-interest-options">
          {INTEREST_REASONS.map((reason) => (
            <label key={reason}>
              <input name="interest" type="checkbox" value={reason} />
              <span>{reason}</span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.interests && <small id="interest-options-error">{state.fieldErrors.interests}</small>}
      </fieldset>

      <label className="community-consent">
        <input name="consent" type="checkbox" value="yes" aria-invalid={Boolean(state.fieldErrors?.consent)} aria-describedby={state.fieldErrors?.consent ? "interest-consent-error" : undefined} required />
        <span>I agree to ADHD.ME storing these details and contacting me about community sessions and early testing.</span>
      </label>
      {state.fieldErrors?.consent && <small id="interest-consent-error" className="community-inline-error">{state.fieldErrors.consent}</small>}

      <label className="community-honeypot" aria-hidden="true">
        Company
        <input name="company" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button type="submit" disabled={pending}>{pending ? "Registering…" : "Register interest"}</button>
      <p className="community-form-privacy">No health history. No mailing list resale. You can ask us to remove your details at any time.</p>
    </form>
  );
}
