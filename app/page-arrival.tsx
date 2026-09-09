"use client";
// Keep the server and hydrating browser tree identical, including under reduced motion.
// Arrival fades begin after mount; reading content never shifts vertically.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate, useReducedMotion } from "motion/react";

export function PageArrival({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = region.current;
    if (!element || reducedMotion || pathname === "/") return;
    const arrival = animate(element, { opacity: [0.35, 1] }, { duration: 0.24, ease: [0.16, 1, 0.3, 1] });
    return () => { arrival.stop(); element.style.removeProperty("opacity"); };
  }, [pathname, reducedMotion]);
  if (pathname === "/") return <>{children}</>;
  return (
    <div ref={region} className="page-arrival">
      {children}
    </div>
  );
}
