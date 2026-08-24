// W11: shared console primitives — one look for every console surface.

import { signOut, switchPractice } from "./actions";
import { DemoNavigator } from "../demo-navigator";
import Link from "next/link";
import { isAdhdMeStaff } from "@/tenancy/staff";

/**
 * W166: the practices this session may act for, and which one it is on.
 *
 * Rendered only when there is more than one — a switcher offering a single choice is furniture,
 * and every practice with one site would carry it forever.
 */
export function PracticeSwitcher({
  practices,
  activeId,
}: {
  practices: ReadonlyArray<{ id: string; name: string }>;
  activeId: string;
}) {
  if (practices.length < 2) return null;
  return (
    <form action={switchPractice} className="flex items-center gap-2" data-testid="practice-switcher">
      <label htmlFor="practiceId" className="text-sm text-stone-500">
        Practice
      </label>
      <select
        id="practiceId"
        name="practiceId"
        defaultValue={activeId}
        className="rounded border border-stone-300 bg-white px-2 py-1 text-sm"
      >
        {practices.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="submit" className="text-sm text-stone-500 underline hover:text-stone-800">
        Switch
      </button>
    </form>
  );
}

export function ConsoleShell({
  email,
  practices,
  activeId,
  children,
}: {
  email: string | null;
  practices?: ReadonlyArray<{ id: string; name: string }>;
  activeId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <DemoNavigator />
            <span className="text-sm text-stone-500">practice console</span>
          </div>
          {email && (
            // O149: `min-w-0` and `flex-wrap` are what let the email truncate instead of pushing
            // the header past the viewport. Without min-w-0 a flex child refuses to shrink below
            // its content, which is why `owner@demo.practice.example` was dragging the whole
            // document sideways on a phone.
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-2">
              {practices && activeId && (
                <PracticeSwitcher practices={practices} activeId={activeId} />
              )}
            <form action={signOut} className="flex min-w-0 items-center gap-3">
              {/* W105: ADHD.ME-internal, so it is not offered to practice accounts. The
                  route still gates itself — hiding a link is navigation, not access control. */}
              {isAdhdMeStaff(email) && (
                <Link href="/console/interest" className="text-sm text-stone-500 underline hover:text-stone-800">Interest</Link>
              )}
              <span className="min-w-0 truncate text-sm text-stone-500">{email}</span>
              {/* O148: measured 33x48 — tall enough, too narrow, on every console route at once,
                  so this one control was sixteen of the sweep's thirty-eight findings. Padding
                  carries it past 44 and an equal negative margin gives the width back, so the
                  header row is unchanged. */}
              <button
                type="submit"
                className="-mx-1.5 inline-flex min-h-11 min-w-11 items-center justify-center px-1.5 text-sm text-stone-500 underline hover:text-stone-800"
              >
                Sign out
              </button>
            </form>
            </div>
          )}
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-stone-500">{hint}</span>}
    </label>
  );
}

// O148: `min-h-11` is the 44px touch floor (O14), added here rather than at each call site —
// these two constants dress most of the console's form controls, so the console sweep found
// them as `342x40`, `215x40` and `77x40` on rules, usefulness and elsewhere at once.
// `focus:outline-none` is legitimate in both because a ring replaces it, which is what the
// taste law asks for and what O147's gate checks.
export const inputClass =
  "min-h-11 rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 " +
  "focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

export const primaryButtonClass =
  "min-h-11 rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white hover:bg-stone-700 " +
  "focus:outline-none focus:ring-2 focus:ring-stone-400";

export function ErrorNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Some values couldn't be saved — please check them and try again.
    </p>
  );
}
