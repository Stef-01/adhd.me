"use client";

// The light under the finger, for every glass surface at once (2026-09-11).
//
// The specular on a glass bubble is the one thing that tells a person it is glass: it sits where
// the light hits and it moves when they do. app/styles/glass.css reads it off --lg-x/--lg-y, and
// until now only two surfaces set them — the coloured tiles and Leo's card, each with its own
// pair of pointer handlers. Every other bubble held a highlight that never moved.
//
// One delegated listener does it for all of them, off the same list of surfaces the WebGL layer
// draws (GLASS_SELECTOR), so a surface added to that list is lit without being wired up. It reads
// pointer positions and writes two custom properties; it never reads content and never blocks a
// gesture (passive listeners, no preventDefault), which is why it cannot be the reason a tap goes
// missing. Under reduced motion it does nothing at all: the stylesheet's default position is the
// static equal.
//
// It also carries the tap's own bubble (founder, 2026-09-11: "it should be playable with your
// bubble that the tap has"). The WebGL layer leaves a droplet where a finger lands, but that layer
// needs WebGL2 and a real GPU and stands aside without them — so the same tap marks the surface
// here for the length of the bloom and `glass.css` opens a bubble out of the point that was
// touched. The bubble a tap makes therefore exists on every device, not only the fast ones.

import { useEffect } from "react";
import { GLASS_SELECTOR, TAP_DROP } from "./studio/params";

export function GlassPointer() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let lit: HTMLElement | null = null;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;
    let raf = 0;
    const blooming = new Map<HTMLElement, number>();

    const clear = () => {
      if (!lit) return;
      lit.style.removeProperty("--lg-x");
      lit.style.removeProperty("--lg-y");
      delete lit.dataset.touch;
      lit = null;
    };
    const paint = () => {
      raf = 0;
      if (!pending) return;
      const { el, x, y } = pending;
      pending = null;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (lit && lit !== el) clear();
      el.style.setProperty("--lg-x", `${Math.round(((x - r.left) / r.width) * 100)}%`);
      el.style.setProperty("--lg-y", `${Math.round(((y - r.top) / r.height) * 100)}%`);
      el.dataset.touch = "";
      lit = el;
    };
    const surfaceAt = (e: PointerEvent) =>
      e.target instanceof Element ? e.target.closest<HTMLElement>(GLASS_SELECTOR) : null;
    const onMove = (e: PointerEvent) => {
      const target = surfaceAt(e);
      if (!target) { clear(); return; }
      pending = { el: target, x: e.clientX, y: e.clientY };
      raf ||= requestAnimationFrame(paint);
    };
    /** The tap's bubble: the surface is marked for the length of the bloom, then unmarked. */
    const onDown = (e: PointerEvent) => {
      onMove(e);
      const target = surfaceAt(e);
      if (!target) return;
      window.clearTimeout(blooming.get(target));
      // Re-raised so a second tap starts the bloom again rather than continuing the first.
      delete target.dataset.tap;
      void target.offsetWidth;
      target.dataset.tap = "";
      blooming.set(target, window.setTimeout(() => { delete target.dataset.tap; blooming.delete(target); }, TAP_DROP.ms));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", clear, { passive: true });
    window.addEventListener("pointercancel", clear, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clear();
      for (const [el, timer] of blooming) { window.clearTimeout(timer); delete el.dataset.tap; }
      blooming.clear();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", clear);
      window.removeEventListener("pointercancel", clear);
    };
  }, []);
  return null;
}
