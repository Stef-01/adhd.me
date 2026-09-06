"use client";
// SMOOTH: the arrival of a tab. A page that lands as a hard cut reads as a reload; one that
// settles in over the house enter beat reads as the same app turning a page. Opacity and a
// short rise only — the finder's stages have their own blur-and-settle and this stands aside
// there — and nothing under reduced motion, where the page simply is.
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

export function PageArrival({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();
  if (pathname === "/" || reducedMotion) return <>{children}</>;
  return (
    <motion.div
      className="page-arrival"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
