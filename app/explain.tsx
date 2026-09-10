"use client";

// `<Explain>`: a sentence that renders only while the walkthrough is on. `<WalkthroughSwitch>`:
// the one control that turns it on and off, present in the settings sheet and wherever a screen
// wants it in view. `useWalkthrough()`: the switch's value, live, for a screen that changes shape
// with it. See src/app-shell/walkthrough.ts for why this exists.

import { useEffect, useState, type ReactNode } from "react";
import { Question } from "@phosphor-icons/react";
import { WALKTHROUGH_EVENT, deviceWalkthroughStorage, readWalkthrough, setWalkthrough } from "@/app-shell/walkthrough";

export function useWalkthrough(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(readWalkthrough(deviceWalkthroughStorage()).on);
    const follow = (event: Event) => setOn((event as CustomEvent<{ on: boolean }>).detail.on);
    window.addEventListener(WALKTHROUGH_EVENT, follow);
    return () => window.removeEventListener(WALKTHROUGH_EVENT, follow);
  }, []);
  return [on, (next) => setWalkthrough(next)];
}

/**
 * Text a person reads only when they asked to be shown around. Renders nothing otherwise, which
 * is the point: the words are kept, the cost of reading them every time is not. `as` picks the
 * element so a paragraph stays a paragraph for a screen reader.
 */
export function Explain({ children, as: Tag = "p", className = "" }: { children: ReactNode; as?: "p" | "small" | "span" | "div"; className?: string }) {
  const [on] = useWalkthrough();
  if (!on) return null;
  return <Tag className={`explain ${className}`.trim()}>{children}</Tag>;
}

/** The switch. A real button with a pressed state, 44px tall, labelled by what it does. */
export function WalkthroughSwitch({ compact = false }: { compact?: boolean }) {
  const [on, set] = useWalkthrough();
  return (
    <button type="button" className={`walkthrough-switch${compact ? " is-compact" : ""}`} aria-pressed={on} onClick={() => set(!on)} data-testid="walkthrough-switch">
      <Question size={18} weight="bold" aria-hidden="true" />
      <span>{on ? "Explanations on" : compact ? "Explain" : "Explain this screen"}</span>
    </button>
  );
}
