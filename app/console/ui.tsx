// W11: shared console primitives — one look for every console surface.

import { signOut, switchPractice } from "./actions";
import { DemoNavigator } from "../demo-navigator";
import Link from "next/link";
import { isMeherrStaff } from "@/tenancy/staff";

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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-baseline gap-3">
            <DemoNavigator />
            <span className="text-sm text-stone-500">practice console</span>
          </div>
          {email && (
            <div className="flex items-center gap-3">
              {practices && activeId && (
                <PracticeSwitcher practices={practices} activeId={activeId} />
              )}
            <form action={signOut} className="flex items-center gap-3">
              {/* W105: Meherr-internal, so it is not offered to practice accounts. The
                  route still gates itself — hiding a link is navigation, not access control. */}
              {isMeherrStaff(email) && (
                <Link href="/console/interest" className="text-sm text-stone-500 underline hover:text-stone-800">Interest</Link>
              )}
              <span className="text-sm text-stone-500">{email}</span>
              <button type="submit" className="text-sm text-stone-500 underline hover:text-stone-800">
                Sign out
              </button>
            </form>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
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

export const inputClass =
  "rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 " +
  "focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200";

export const primaryButtonClass =
  "rounded-lg bg-stone-900 px-5 py-2.5 font-medium text-white hover:bg-stone-700 " +
  "focus:outline-none focus:ring-2 focus:ring-stone-400";

export function ErrorNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Some values couldn't be saved — please check them and try again.
    </p>
  );
}
