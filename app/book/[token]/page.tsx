// W7: booking page behind the tokenised deep link (mock rail, synthetic data only).
// Copy discipline mirrors the W6 linter posture: availability language only —
// no urgency, no clinical framing, no benefit claims.

import { contactPreferencesFor, getStore, sessionAppointmentType } from "@/booking/store";
import { verifyBookingToken } from "@/booking/token";
import type { ContactPreferences } from "@/messaging/preferences";
import { confirmBooking, saveContactPreference } from "../actions";

export const dynamic = "force-dynamic";

// W49 follow-up: pin a route-level <title>. The confirm action revalidates this
// route, and during that swap the inherited layout title can be momentarily absent —
// axe caught it as a document-title violation (WCAG 2.4.2). A patient-facing page
// reached from an SMS deserves its own title regardless.
export const metadata = { title: "Your appointment — Meherr" };

function Panel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
      {children}
    </main>
  );
}

// W74: the patient sets when and how the practice may contact them. Deliberately offered
// AFTER booking rather than as a gate before it — making someone answer a preferences form
// to take an appointment would be a worse experience than the one it protects.
function ContactPreferenceForm({
  token,
  prefs,
  saved,
  invalid,
}: {
  token: string;
  prefs: ContactPreferences;
  saved: boolean;
  invalid: boolean;
}) {
  const hours = Array.from({ length: 25 }, (_, h) => h);

  return (
    <form
      action={saveContactPreference}
      data-testid="contact-preferences"
      className="mt-2 flex flex-col gap-3 border-t border-stone-200 pt-5"
    >
      <input type="hidden" name="token" value={token} />
      <h2 className="text-base font-medium text-stone-800">When can we contact you?</h2>
      <p className="text-sm text-stone-500">
        This only affects messages about appointment times. The practice can always reach you
        about your care.
      </p>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="contactable"
          value="1"
          defaultChecked={prefs.channel !== null}
          data-testid="pref-contactable"
        />
        Send me a text when an appointment comes up
      </label>

      <div className="flex items-center gap-2 text-sm text-stone-700">
        <label className="flex items-center gap-2">
          Between
          <select
            name="earliestHour"
            defaultValue={String(prefs.earliestHour)}
            data-testid="pref-earliest"
            className="rounded border border-stone-300 px-2 py-1"
          >
            {hours.slice(0, 24).map((h) => (
              <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          and
          <select
            name="latestHour"
            defaultValue={String(prefs.latestHour)}
            data-testid="pref-latest"
            className="rounded border border-stone-300 px-2 py-1"
          >
            {hours.slice(1).map((h) => (
              <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input
          type="checkbox"
          name="weekdaysOnly"
          value="1"
          defaultChecked={!prefs.days.includes(0)}
          data-testid="pref-weekdays"
        />
        Weekdays only
      </label>

      {saved && (
        <p role="status" data-testid="pref-saved" className="text-sm text-stone-700">
          Saved. We&rsquo;ll only text you in those hours.
        </p>
      )}
      {invalid && (
        <p role="alert" data-testid="pref-invalid" className="text-sm text-stone-700">
          Please choose an end time later than the start time.
        </p>
      )}

      <button
        type="submit"
        className="self-start rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
      >
        Save contact times
      </button>
    </form>
  );
}

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ prefs?: string }>;
}) {
  const { token } = await params;
  const { prefs } = await searchParams;
  const invitationId = verifyBookingToken(token);
  const store = getStore();
  const invitation = invitationId
    ? store.state.invitations.find((i) => i.id === invitationId)
    : undefined;

  if (!invitation) {
    return (
      <Panel heading="This booking link isn't valid">
        <p className="text-stone-600">
          The link may have been copied incompletely. Please contact the practice to book.
        </p>
      </Panel>
    );
  }

  const isTelehealth = sessionAppointmentType(store, invitation) === "telehealth";
  const kind = isTelehealth ? "video appointment" : "appointment";

  if (invitation.status === "booked") {
    const appointment = store.state.appointments.find(
      (a) => a.patientId === invitation.patientId && a.generatedByInvitation,
    );
    return (
      <Panel heading={`Your ${kind} is booked`}>
        <p className="text-stone-600">
          {store.clinicianName} at {store.practiceName}
          {appointment ? ` — ${new Date(appointment.startsAt).toLocaleString("en-AU")}` : ""}.
        </p>
        <p className="text-sm text-stone-500">
          {isTelehealth
            ? "The practice will call you at this time. If you can no longer attend, please contact the practice."
            : "If you can no longer attend, please contact the practice."}
        </p>
        <ContactPreferenceForm
          token={token}
          prefs={contactPreferencesFor(invitation.practiceId, invitation.patientId)}
          saved={prefs === "saved"}
          invalid={prefs === "invalid"}
        />
      </Panel>
    );
  }

  if (invitation.status === "expired") {
    return (
      <Panel heading="This appointment offer is no longer available">
        <p className="text-stone-600">
          The session has filled. No action is needed — you can contact {store.practiceName} any
          time to arrange another appointment.
        </p>
      </Panel>
    );
  }

  if (invitation.status === "opted_out") {
    return (
      <Panel heading="You've opted out">
        <p className="text-stone-600">
          You won't receive further availability messages from {store.practiceName}.
        </p>
      </Panel>
    );
  }

  return (
    <Panel heading={isTelehealth ? "A video appointment is available" : "An appointment is available"}>
      <p className="text-stone-600">
        {store.clinicianName} at {store.practiceName} has{" "}
        {isTelehealth ? "telehealth (phone/video) appointment times" : "appointment times"} available on{" "}
        {new Date(`${invitation.sessionDate}T00:00:00`).toLocaleDateString("en-AU", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        .
      </p>
      <form action={confirmBooking}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white hover:bg-stone-700"
        >
          Confirm booking
        </button>
      </form>
      <p className="text-sm text-stone-500">
        No action is needed if this time doesn't suit you.
      </p>
    </Panel>
  );
}
