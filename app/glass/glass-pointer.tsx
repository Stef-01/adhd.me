"use client";

// Where a tap landed, for every glass surface at once (2026-09-11).
//
// THE SHIMMER IS GONE, AND ON PURPOSE (founder: "remove the shimmer that mouse/touch over causes …
// it should just be a bubble not shimmer"). This used to move a specular highlight under the
// pointer on every frame, on the theory that a moving highlight is what tells somebody a surface
// is glass. It is not: what tells them is the rim, the dome and the way it answers a press. A
// highlight that chases the cursor across a whole page of tiles reads as restlessness, and this
// product is for people whose attention is the thing under strain. A bubble now holds its own
// light, in one place, and does not follow anybody.
//
// What is left is the tap. The surface is marked for the length of the bloom and the POINT THAT
// WAS TOUCHED goes into --lg-x/--lg-y, which is all those two properties are for now: the origin
// of the bubble a tap makes (founder, earlier the same day: "it should be playable with your
// bubble that the tap has"). The WebGL layer leaves a real droplet where a finger lands, but it
// needs WebGL2 and a real GPU and stands aside without them, so this is the same event on every
// other device.
//
// One delegated listener, off the same list of surfaces the WebGL layer draws (GLASS_SELECTOR),
// so a surface added to that list is covered without being wired up. It never reads content and
// never blocks a gesture (passive listeners, no preventDefault), which is why it cannot be the
// reason a tap goes missing. Under reduced motion it does nothing at all.

import { useEffect } from "react";
import { GLASS_SELECTOR, TAP_DROP } from "./studio/params";

export function GlassPointer() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const blooming = new Map<HTMLElement, number>();

    const surfaceAt = (e: PointerEvent) =>
      e.target instanceof Element ? e.target.closest<HTMLElement>(GLASS_SELECTOR) : null;

    /** The tap's bubble: the surface is marked for the length of the bloom, then unmarked. */
    const onDown = (e: PointerEvent) => {
      const target = surfaceAt(e);
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // The only thing these two properties do now: say where the bubble opens from.
      target.style.setProperty("--lg-x", `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
      target.style.setProperty("--lg-y", `${Math.round(((e.clientY - r.top) / r.height) * 100)}%`);
      window.clearTimeout(blooming.get(target));
      // Re-raised so a second tap starts the bloom again rather than continuing the first.
      delete target.dataset.tap;
      void target.offsetWidth;
      target.dataset.tap = "";
      blooming.set(target, window.setTimeout(() => { delete target.dataset.tap; blooming.delete(target); }, TAP_DROP.ms));
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      for (const [el, timer] of blooming) { window.clearTimeout(timer); delete el.dataset.tap; }
      blooming.clear();
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);
  return null;
}
