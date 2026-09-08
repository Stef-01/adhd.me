"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate, inView, MotionConfig, useReducedMotion } from "motion/react";

/** One route-arrival and reveal vocabulary for patient, public and console pages. */
export function SiteMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced || !region.current) return;
    const active: ReturnType<typeof animate>[] = [];
    const revealed: HTMLElement[] = [];
    const seen = new WeakSet<Element>();
    const stop = inView(region.current.querySelectorAll("main > h1, main > section, .console-card, .console-panel, .finder-getting-started, .site-footer-inner"), element => {
      if (seen.has(element)) return;
      seen.add(element);
      revealed.push(element as HTMLElement);
      // §14 Calm (PLAY-PLAN): a reveal may fade, never move — text that shifts while a person reads is what the tester felt as panic.
      active.push(animate(element, { opacity: [0.35, 1] }, { duration: .42, ease: [.22, 1, .36, 1] }));
    }, { margin: "0px 0px -24px 0px" });
    const controls = region.current.querySelectorAll<HTMLElement>(".site-nav-link, .console-button, .console-primary-button, .console-quick-link, .console-nav a, .platform-help, .story-primary-link");
    const cleanups = [...controls].map(element => {
      let current: ReturnType<typeof animate> | undefined;
      const move = (scale: number, y: number) => { current?.stop(); current = animate(element, { scale, y }, { type: "spring", stiffness: 480, damping: 32 }); };
      const enter = () => move(1.015, -2);
      const leave = () => move(1, 0);
      const press = () => move(.97, 0);
      element.addEventListener("pointerenter", enter); element.addEventListener("pointerleave", leave);
      element.addEventListener("pointerdown", press); element.addEventListener("pointerup", leave);
      return () => { current?.stop(); element.removeEventListener("pointerenter", enter); element.removeEventListener("pointerleave", leave); element.removeEventListener("pointerdown", press); element.removeEventListener("pointerup", leave); element.style.removeProperty("transform"); };
    });
    return () => { stop(); active.forEach(animation => animation.stop()); revealed.forEach(element => { element.style.removeProperty("opacity"); element.style.removeProperty("transform"); }); cleanups.forEach(cleanup => cleanup()); };
  }, [pathname, reduced]);
  return <MotionConfig reducedMotion="user" transition={{ type: "spring", stiffness: 380, damping: 32 }}><div ref={region} className="site-motion-root">{children}</div></MotionConfig>;
}
