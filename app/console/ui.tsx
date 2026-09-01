// W11: shared console primitives — one look for every console surface.

import { signOut, switchPractice } from "./actions";
import { DemoNavigator } from "../demo-navigator";
import { isAdhdMeStaff } from "@/tenancy/staff";
import { ConsoleNavigation } from "./console-navigation";

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
    <form action={switchPractice} className="console-practice-switcher" data-testid="practice-switcher">
      <label htmlFor="practiceId">
        Practice
      </label>
      <select
        id="practiceId"
        name="practiceId"
        defaultValue={activeId}
        className="console-select"
      >
        {practices.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="submit" className="console-text-button">
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
  const staff = email ? isAdhdMeStaff(email) : false;

  return (
    <div className={`console-app${email ? "" : " console-app-auth"}`}>
      <header className="console-header">
        <div className="console-header-inner">
          <div className="console-brand-row">
            <div className="console-brand">
            <DemoNavigator />
              <span>Practice console</span>
            </div>
          {email && (
            // O149: `min-w-0` and `flex-wrap` are what let the email truncate instead of pushing
            // the header past the viewport. Without min-w-0 a flex child refuses to shrink below
            // its content, which is why `owner@demo.practice.example` was dragging the whole
            // document sideways on a phone.
              <div className="console-session-controls">
              {practices && activeId && (
                <PracticeSwitcher practices={practices} activeId={activeId} />
              )}
                <form action={signOut} className="console-session">
              <span className="console-session-email">{email}</span>
              {/* O148: measured 33x48 — tall enough, too narrow, on every console route at once,
                  so this one control was sixteen of the sweep's thirty-eight findings. Padding
                  carries it past 44 and an equal negative margin gives the width back, so the
                  header row is unchanged. */}
              <button
                type="submit"
                    className="console-text-button console-sign-out"
              >
                Sign out
              </button>
            </form>
            </div>
          )}
          </div>
          {email && <ConsoleNavigation isStaff={staff} />}
        </div>
      </header>
      <main id="main-content" className="console-main">{children}</main>
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
    <label className="console-field">
      <span className="console-field-label">{label}</span>
      {children}
      {hint && <span className="console-field-hint">{hint}</span>}
    </label>
  );
}

// O148: `min-h-11` is the 44px touch floor (O14), added here rather than at each call site —
// these two constants dress most of the console's form controls, so the console sweep found
// them as `342x40`, `215x40` and `77x40` on rules, usefulness and elsewhere at once.
// `focus:outline-none` is legitimate in both because a ring replaces it, which is what the
// taste law asks for and what O147's gate checks.
export const inputClass =
  "console-input";

export const primaryButtonClass =
  "console-primary-button";

export function ErrorNote({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="console-error-note" role="alert">
      Some values couldn't be saved — please check them and try again.
    </p>
  );
}
