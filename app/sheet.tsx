"use client";

// O230 (founder-directed): the bottom sheet — the one gesture this app takes from native health
// apps, built the way both platforms' own guidance says to build it.
//
// WHAT THE RESEARCH SAID, AND WHAT THIS DOES ABOUT IT:
//   * A sheet has DETENTS, not one height. iOS's own sheet controller offers medium and large and
//     lets the grabber cycle them; this snaps between `half` and `full`, and a drag that ends low
//     or fast dismisses.
//   * EVERY GESTURE NEEDS A TAP EQUIVALENT. The drag handle is a real `<button>` with a 48px hit
//     area that cycles the detents on click or Enter — Material's own accessibility guidance for
//     the grabber, and the reason a person using VoiceOver or a keyboard never has to drag.
//   * A sheet is a dialog: `role="dialog" aria-modal="true"`, focus moved inside on open, focus
//     trapped while it is open, focus returned to whatever opened it on close, Escape closes, and
//     an explicit close control exists so dismissal is never swipe-only.
//   * `overscroll-behavior: contain` on the scrolling body so dragging the sheet's content to its
//     end does not chain into scrolling the page behind it — the specific failure that makes a
//     web sheet feel like a div.
//
// WHAT IT DELIBERATELY DOES NOT DO: pull-to-refresh (the research is unanimous that a
// reimplemented one reads as "web" even when it is good), and horizontal swipe anywhere near the
// left edge, where iOS's own back gesture lives and a second handler makes both feel broken.
//
// Motion owns the drag rather than CSS scroll-snap. Snap points would give the inertia free, but
// the sheet also has to be a focus-trapped dialog that closes on a downward flick, and one
// mechanism that can express "dismissed" is worth more here than two that disagree.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";

/** The heights a sheet rests at, as a share of the viewport. */
const DETENT = { half: 0.55, full: 0.92 } as const;
type Detent = keyof typeof DETENT;

/** Below this fraction of its own height, or faster than this downward flick, a drag dismisses. */
const DISMISS_OFFSET = 0.35;
const DISMISS_VELOCITY = 520;

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  /** Names the dialog for a screen reader and heads the sheet for everybody else. */
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [detent, setDetent] = useState<Detent>("half");
  const reducedMotion = useReducedMotion();

  // Focus: remember who opened it, move in, and give it back on close. `preventScroll` because
  // moving focus into a sheet that is still animating up must not scroll the page behind it.
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDetent("half");
    const first = panel.current?.querySelector<HTMLElement>("[data-sheet-initial-focus]") ?? panel.current;
    first?.focus({ preventScroll: true });
    return () => opener.current?.focus({ preventScroll: true });
  }, [open]);

  // Escape closes; Tab cycles inside. A dialog whose focus escapes to the page behind it is a
  // dialog only to somebody using a mouse.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const root = panel.current;
      if (!root) return;
      const focusable = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cycleDetent = useCallback(() => setDetent((d) => (d === "half" ? "full" : "half")), []);

  // Mounted only on the client, so the portal below never runs during the server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /**
   * PORTALLED TO THE BODY, AND THE PREVIEW IS WHY. A sheet rendered where it is used sits inside
   * the finder's animated stage, and a transformed ancestor creates a stacking context — so the
   * dialog's z-index was being resolved INSIDE that stage and the privacy bar, a direct child of
   * body, painted over the top of it. `z-index: 60` had no way to win an argument it was never in.
   * A modal belongs at the top of the document, which is also what makes its scrim mean anything.
   */
  const layer = (
    <AnimatePresence>
      {open && (
        <div className="sheet-layer">
          {/* The scrim dismisses on click, but it is NOT a labelled control: it carried
              `Close <title>` and so answered the same role query as the close button, which made
              "the close control" ambiguous — caught by the shell spec. Keyboard and screen-reader
              users dismiss with Escape or the close button; this is the pointer affordance only. */}
          <motion.div
            className="sheet-scrim"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.18 }}
          />
          <motion.div
            ref={panel}
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            style={{ height: `${DETENT[detent] * 100}svh` }}
            initial={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { y: "100%" }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
            drag={reducedMotion ? false : "y"}
            dragDirectionLock
            dragElastic={{ top: 0.04, bottom: 0.6 }}
            dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => {
              const height = panel.current?.offsetHeight ?? 1;
              if (info.offset.y > height * DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
              else if (info.offset.y < -60 && detent === "half") setDetent("full");
              else if (info.offset.y > 60 && detent === "full") setDetent("half");
            }}
          >
            {/* The grabber. A button, not an ornament: click or Enter cycles the detents, which is
                the whole of the drag's function for anybody who cannot perform one. */}
            <button
              type="button"
              className="sheet-handle"
              onClick={cycleDetent}
              aria-expanded={detent === "full"}
              aria-controls={titleId}
            >
              <span className="sheet-handle-bar" aria-hidden="true" />
              <span className="sr-only">{detent === "full" ? `Shrink ${title}` : `Expand ${title}`}</span>
            </button>

            <header className="sheet-header">
              <h2 id={titleId} tabIndex={-1} data-sheet-initial-focus>{title}</h2>
              <button type="button" className="sheet-close" onClick={onClose} aria-label={`Close ${title}`}>
                <X size={19} weight="bold" aria-hidden="true" />
              </button>
            </header>

            <div className="sheet-body">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return mounted ? createPortal(layer, document.body) : null;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
