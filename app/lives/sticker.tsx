"use client";

// The things in a microgame (PRD §91): a sticker with a flat glyph where one is cheap to draw —
// wasp, mosquito, bubble, pancake, pigeon, spider, milk, toast — and the word on a pill for the
// rest. The word is always there, so a screen reader and a sighted person get the same thing.
// Our own art, in the beans' style; nothing here is anyone else's character.

import type { ReactElement } from "react";

const GLYPHS: Record<string, ReactElement> = {
  wasp: <><ellipse cx="32" cy="34" rx="16" ry="11" fill="#F5C518" /><path d="M20 30h24M20 38h24" stroke="#2b2b2b" strokeWidth="4" /><circle cx="14" cy="32" r="7" fill="#2b2b2b" /><ellipse cx="34" cy="20" rx="10" ry="5" fill="#fff" fillOpacity=".75" /></>,
  mosquito: <><ellipse cx="32" cy="36" rx="10" ry="6" fill="#5a4a3a" /><path d="M32 30l-10-12M32 30l10-12M22 36h-12M42 36h12" stroke="#5a4a3a" strokeWidth="3" strokeLinecap="round" /><ellipse cx="36" cy="22" rx="9" ry="4" fill="#fff" fillOpacity=".7" /></>,
  bubble: <><circle cx="32" cy="32" r="18" fill="#bfe3ff" fillOpacity=".8" stroke="#6fb6ea" strokeWidth="3" /><circle cx="25" cy="26" r="4" fill="#fff" /></>,
  pancake: <><ellipse cx="32" cy="36" rx="22" ry="9" fill="#d9a35b" /><ellipse cx="32" cy="30" rx="22" ry="9" fill="#e9b96f" /><ellipse cx="30" cy="27" rx="9" ry="4" fill="#f2c94c" /></>,
  pigeon: <><ellipse cx="34" cy="36" rx="16" ry="11" fill="#9aa0ad" /><circle cx="18" cy="30" r="7" fill="#7d8494" /><path d="M11 31l-5 2 5 2z" fill="#f2a33a" /><circle cx="16" cy="29" r="1.6" fill="#fff" /></>,
  seagull: <><ellipse cx="34" cy="36" rx="17" ry="10" fill="#f4f4f2" /><circle cx="17" cy="30" r="7" fill="#f4f4f2" /><path d="M10 31l-6 2 6 2z" fill="#f2a33a" /><path d="M28 30q8-12 18-6" stroke="#bfc2c9" strokeWidth="3" fill="none" /></>,
  spider: <><circle cx="32" cy="34" r="10" fill="#2b2b2b" /><path d="M22 30l-10-8M22 36l-12 2M42 30l10-8M42 36l12 2M24 40l-8 8M40 40l8 8" stroke="#2b2b2b" strokeWidth="3" strokeLinecap="round" /><circle cx="29" cy="31" r="1.5" fill="#fff" /><circle cx="35" cy="31" r="1.5" fill="#fff" /></>,
  milk: <><path d="M22 20h20v28a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4z" fill="#f7f7f5" stroke="#c9cbd1" strokeWidth="2" /><path d="M22 20l4-8h12l4 8" fill="#e5e7eb" /><rect x="26" y="30" width="12" height="8" fill="#6fb6ea" /></>,
  toast: <><path d="M18 24a8 8 0 0 1 8-8h12a8 8 0 0 1 8 8v24H18z" fill="#e2b877" /><path d="M22 26a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v18H22z" fill="#f3d9a4" /></>,
  chips: <><path d="M20 30h24l-3 20H23z" fill="#e5533d" /><path d="M24 30l2-12M32 30l0-14M40 30l-2-12" stroke="#f2c94c" strokeWidth="5" strokeLinecap="round" /></>,
  charger: <><rect x="18" y="26" width="28" height="16" rx="4" fill="#3b3b3b" /><path d="M46 30h6v8h-6zM24 18v8M40 18v8" stroke="#3b3b3b" strokeWidth="4" strokeLinecap="round" /></>,
  banana: <><path d="M16 26q14 24 32 12" stroke="#f2c94c" strokeWidth="9" strokeLinecap="round" fill="none" /><path d="M16 26q14 24 32 12" stroke="#c9a020" strokeWidth="3" strokeLinecap="round" fill="none" strokeDasharray="2 10" /></>,
  kayak: <><path d="M10 34q22-12 44 0q-22 12-44 0z" fill="#e5533d" /><ellipse cx="32" cy="34" rx="8" ry="3" fill="#7a1f1b" /></>,
  cow: <><ellipse cx="32" cy="36" rx="18" ry="11" fill="#f4f4f2" /><circle cx="24" cy="34" r="5" fill="#2b2b2b" /><circle cx="40" cy="40" r="4" fill="#2b2b2b" /><rect x="26" y="20" width="12" height="8" rx="4" fill="#f4f4f2" /></>,
  burger: <><ellipse cx="32" cy="24" rx="16" ry="6" fill="#e9b96f" /><rect x="16" y="28" width="32" height="6" fill="#7a4a1b" /><rect x="16" y="34" width="32" height="4" fill="#5aa02c" /><ellipse cx="32" cy="42" rx="16" ry="5" fill="#e9b96f" /></>,
  sheep: <><ellipse cx="32" cy="36" rx="17" ry="11" fill="#f4f4f2" stroke="#d7d7d3" strokeWidth="3" /><circle cx="18" cy="34" r="6" fill="#2b2b2b" /></>,
};

export function glyphFor(label: string): string | null {
  const key = label.toLowerCase();
  for (const name of Object.keys(GLYPHS)) if (key === name || key.includes(name)) return name;
  return null;
}

/** The glyph alone, for HUD and lists. */
export function Glyph({ label, size = 36 }: { label: string; size?: number }) {
  const key = glyphFor(label);
  if (!key) return null;
  return <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="lives-glyph">{GLYPHS[key]}</svg>;
}
