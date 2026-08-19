// O19 (SEO pass): robots.txt DISALLOWS /console/, which stops crawling but not indexing — a
// disallowed URL that is linked from anywhere can still appear in results as a bare title.
// The meta robots tag is the instruction that actually removes it, and a layout puts it on
// every console page at once so a new console page cannot ship indexable by omission.
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return children;
}
