"use server";

import { saveApplication, validateApplication } from "@/onboarding/store";
import type { ClinicianFormState } from "@/onboarding/types";

/**
 * Receive an application.
 *
 * The success message deliberately promises a HUMAN reading it and nothing else. There is no
 * automatic path from here to a published listing (see the note on `ClinicianApplication.status`),
 * so any wording implying "you are now listed" would be untrue on the one page most likely to be
 * believed.
 */
export async function submitApplication(
  _previous: ClinicianFormState,
  formData: FormData,
): Promise<ClinicianFormState> {
  const text = (key: string) => String(formData.get(key) ?? "");
  const many = (key: string) => formData.getAll(key).map(String);

  const input = {
    fullName: text("fullName"),
    ahpraRegistrationNumber: text("ahpraRegistrationNumber"),
    email: text("email"),
    practiceSuburb: text("practiceSuburb"),
    practiceName: text("practiceName"),
    careAreas: many("careAreas"),
    manner: many("manner"),
    languages: many("languages"),
    otherLanguages: text("otherLanguages"),
    nswAdhdTrained: formData.get("nswAdhdTrained") === "on",
    acceptingNewPatients: formData.get("acceptingNewPatients") === "on",
  };

  // Consent is checked here rather than in `validateApplication`, which validates the APPLICATION.
  // A missing tick is a fact about this submission, not about the clinician's details, and folding
  // it into the validator would mean a stored application could never be re-validated without a
  // form present.
  const fieldErrors: NonNullable<ClinicianFormState["fieldErrors"]> = validateApplication(input);

  if (!formData.get("consent")) {
    fieldErrors.consent = "Please confirm the details are yours and are accurate.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Some details need another look.", fieldErrors };
  }

  const { created } = saveApplication(input);

  return {
    status: "success",
    message: created
      ? "A person reads every application. Nothing is published until an Ahpra advertising check is done, and we will email you either way."
      : "We already have an application against that registration number. We will be in touch about that one.",
  };
}
