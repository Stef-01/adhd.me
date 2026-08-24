// O188: seeds one SYNTHETIC clinician application for the e2e suite, replacing the retired join
// form as the way `applications.spec.ts` gets a row into the store. The spec's whole job is the
// access boundary — an application holds a person's name and email, and neither a signed-out
// visitor nor a practice account may see one byte of it — and that boundary outlives the form
// that used to feed it. Synthetic data only, W60 posture: the name says what it is and the
// email is an example domain.
import { NextResponse } from "next/server";
import { saveApplication } from "@/onboarding/store";
import { assertMockRoutesEnabled } from "@/lib/mock-guard";

export const dynamic = "force-dynamic";

export async function POST() {
  assertMockRoutesEnabled();
  const { created, application } = saveApplication({
    fullName: "Dr Applications Fixture",
    ahpraRegistrationNumber: "MED0009990057",
    email: "applications-fixture@example.practice",
    practiceSuburb: "Beecroft",
    practiceName: "Fixture Family Practice",
    careAreas: ["adhd-assessment"],
    manner: ["unhurried"],
    languages: [],
    nswAdhdTrained: true,
    acceptingNewPatients: true,
    desiredMixPercent: 40,
  });
  return NextResponse.json({ created, id: application.id });
}
