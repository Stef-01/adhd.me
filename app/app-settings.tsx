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
import { useState } from "react";
import { CaretRight, Gear } from "@phosphor-icons/react";
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

export function AppSettings({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="settings-trigger" type="button" onClick={() => setOpen(true)} aria-label="Settings">
        <Gear size={21} weight="regular" aria-hidden="true" />
      </button>
      <Sheet open={open} title="Settings" onClose={() => setOpen(false)}>
        <div className="settings-list">
          <SettingsLink href="/story" title="About ADHD.ME" detail="Why the product exists and what the route through assessment costs today." />
          <SettingsLink href="/faq" title="Questions" detail="What this is, what it costs, where it operates, and how the order is decided." />
          <SettingsLink href="/examples" title="Worked examples" detail="The same matching run over written requests, with the reasons printed." />
          <SettingsLink href="/privacy" title="Privacy" detail="What this device holds, what leaves it, and how to take it back." />
          {/* The finder passes its own testing options in, so one sheet holds everything a person
              can change rather than two sheets that look identical and hold different things. */}
          {children}
        </div>
      </Sheet>
    </>
  );
}
