"use client";

// O233 (founder-directed): the settings control, top right.
//
// "About, is all found in the top right corner filtered away under a settings area … Similarly
// questions is also filtered away."
//
// THE RULE THIS APPLIES, WHICH O230 GOT WRONG. A tab bar is for destinations somebody RETURNS to.
// About and Questions are consulted once — a person reads what the product is, or looks up what it
// costs, and does not come back to either. O230 put them in the bar because they were the pages the
// tree had; this is where they belong instead, behind one control that is present on every app
// surface and in the way on none of them.
//
// It reuses the sheet the finder already opens for its testing options, so the app has ONE modal
// idiom rather than a settings screen that behaves unlike everything else: same drag, same
// grabber, same Escape, same focus return.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CaretRight, Gear, Trash } from "@phosphor-icons/react";
import { deviceLearningStorage } from "@/learn/cursor";
import { clearCursor } from "@/learn/cursor";
import { clearProgress } from "@/learn/progress";
import { clearModel, hasSignals, readModel } from "@/model/store";
import { Sheet } from "./sheet";

/** One row of the sheet. A real link, so long-press and open-in-new-tab still work. */
function SettingsLink({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link className="settings-row" href={href}>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <CaretRight size={16} weight="bold" aria-hidden="true" />
    </Link>
  );
}

export function AppSettings({ children, fallback = false }: { children?: React.ReactNode; fallback?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [overridden, setOverridden] = useState(false);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => { if (!fallback) setMount(document.getElementById("platform-settings")); }, [fallback]);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!fallback) return;
    const host = document.getElementById("platform-settings");
    if (!host) return;
    const sync = () => setOverridden(!!host.querySelector(".settings-trigger:not([data-settings-fallback])"));
    const observer = new MutationObserver(sync);
    observer.observe(host, { childList: true });
    sync();
    return () => observer.disconnect();
  }, [fallback]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const trigger = <button ref={triggerRef} className="settings-trigger" data-settings-fallback={fallback || undefined} type="button" onClick={() => setOpen(true)} aria-label="Settings"><Gear size={21} weight="regular" aria-hidden="true" /></button>;
  return (
    <>
      {fallback && overridden ? null : mount ? createPortal(trigger, mount) : trigger}
      <Sheet open={open} title="Settings" onClose={() => setOpen(false)} openedBy={triggerRef}>
        <div className="settings-list">
          <SettingsLink href="/profile" title="Search filters" detail="Where you are, the kind of support, and the declared facts a provider must have." />
          <SettingsLink href="/story" title="About ADHD.ME" detail="Why the product exists and what the route through assessment costs today." />
          <SettingsLink href="/faq" title="Help & answers" detail="Using ADHD.ME, costs, and common questions." />
          <SettingsLink href="/examples" title="Worked examples" detail="The same matching run over written requests, with the reasons printed." />
          <SettingsLink href="/privacy" title="Privacy" detail="What this device holds, what leaves it, and how to take it back." />
          {/* The finder passes its own testing options in, so one sheet holds everything a person
              can change rather than two sheets that look identical and hold different things. */}
          {children}
          {/* Deleting everything used to sit at the bottom of My ADHD, under the person's own
              picture of themselves. A destructive control belongs where somebody goes looking for
              it, which is here, beside what the product holds and how to take it back. */}
          <DeleteEverything />
        </div>
      </Sheet>
    </>
  );
}

/**
 * The one control that removes everything this device holds. Two taps, and the second one says
 * what it does — there is no undo and nothing is kept anywhere else.
 */
function DeleteEverything() {
  const [confirming, setConfirming] = useState(false);
  const [gone, setGone] = useState(false);
  const [present, setPresent] = useState(false);
  useEffect(() => {
    try {
      setPresent(hasSignals(readModel(deviceLearningStorage)));
    } catch {
      setPresent(false);
    }
  }, []);
  if (!present) return null;
  return (
    <div className="settings-row is-danger">
      <span>
        <strong>Your data</strong>
        <small>{gone ? "Deleted from this browser." : "Lives in this browser only."}</small>
      </span>
      {gone ? null : confirming ? (
        <span className="settings-danger-actions">
          <button
            type="button"
            className="learn-primary"
            onClick={() => {
              clearModel(deviceLearningStorage);
              clearProgress(deviceLearningStorage);
              clearCursor(deviceLearningStorage);
              setGone(true);
              setConfirming(false);
            }}
          >
            Yes, delete it
          </button>
          <button type="button" className="learn-secondary" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </span>
      ) : (
        <button type="button" className="learn-secondary" onClick={() => setConfirming(true)}>
          <Trash size={15} weight="bold" aria-hidden="true" /> Delete
        </button>
      )}
    </div>
  );
}
