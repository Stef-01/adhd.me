"use client";

import { eraseServerRecord } from "@/finder/track";

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
import { CaretRight, DownloadSimple, Gear, Trash, UploadSimple } from "@phosphor-icons/react";
import { deviceLearningStorage } from "@/learn/cursor";
import { copyFileName, deleteDeviceData, hasDeviceData, makeCopy, parseCopy, restoreCopy, type DeviceCopy } from "@/privacy/device-data";
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
          <YourData />
        </div>
      </Sheet>
    </>
  );
}

/** Both browser stores, or none when storage is blocked. */
function browserStores(): Storage[] {
  try {
    return [window.localStorage, window.sessionStorage];
  } catch {
    return [];
  }
}

/**
 * What this browser holds, as three rows: save it to a file, bring a file back, delete it all.
 * There is no account, so the file is the only way a record moves to another browser. Restore is
 * always here, because the browser that needs it is the one that holds nothing yet.
 */
function YourData() {
  const [present, setPresent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [gone, setGone] = useState(false);
  const [incoming, setIncoming] = useState<DeviceCopy | null>(null);
  const [restore, setRestore] = useState<"idle" | "refused" | "done">("idle");
  const fileRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setPresent(hasDeviceData(browserStores())); }, []);

  const save = () => {
    const blob = new Blob([JSON.stringify(makeCopy(deviceLearningStorage), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = copyFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const copy = parseCopy(await file.text());
    if (fileRef.current) fileRef.current.value = "";
    setRestore(copy ? "idle" : "refused");
    setIncoming(copy);
  };

  return (
    <>
      {present && (
        <button type="button" className="settings-row" onClick={save}>
          <span>
            <strong>Save a copy</strong>
            <small>This file holds your answers. Keep it somewhere private.</small>
          </span>
          <DownloadSimple size={16} weight="bold" aria-hidden="true" />
        </button>
      )}
      <div className="settings-row">
        <span>
          <strong>Restore a copy</strong>
          {restore === "refused" && <small role="alert">That file isn&apos;t a copy from here. Nothing changed.</small>}
          {restore === "done" && <small role="status">Restored.</small>}
          {incoming && <small>Replace what is on this device?</small>}
        </span>
        {incoming ? (
          <span className="settings-danger-actions">
            <button
              type="button"
              className="learn-primary"
              onClick={() => {
                const [local, session] = browserStores();
                if (local) restoreCopy(local, session ?? null, incoming);
                setIncoming(null);
                setRestore("done");
                setGone(false);
                setPresent(hasDeviceData(browserStores()));
              }}
            >
              Replace
            </button>
            <button type="button" className="learn-secondary" onClick={() => setIncoming(null)}>
              Keep mine
            </button>
          </span>
        ) : (
          <button type="button" className="learn-secondary" onClick={() => fileRef.current?.click()}>
            <UploadSimple size={15} weight="bold" aria-hidden="true" /> Choose file
          </button>
        )}
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void pick(e.target.files?.[0])} data-testid="restore-file" />
      </div>
      {(present || gone) && (
        <div className="settings-row is-danger">
          <span>
            <strong>Your data</strong>
            <small>{gone ? "Deleted, here and with us." : "In this browser, and your searches with us."}</small>
          </span>
          {gone ? null : confirming ? (
            <span className="settings-danger-actions">
              <button
                type="button"
                className="learn-primary"
                onClick={() => {
                  // The server's copy first: the device id it is kept under goes with the browser's.
                  eraseServerRecord();
                  deleteDeviceData(browserStores());
                  setGone(true);
                  setPresent(false);
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
      )}
    </>
  );
}
