// O19 (SEO pass): robots.txt DISALLOWS /console/, which stops crawling but not indexing — a
// disallowed URL that is linked from anywhere can still appear in results as a bare title.
// The meta robots tag is the instruction that actually removes it, and a layout puts it on
// every console page at once so a new console page cannot ship indexable by omission.
import type { Metadata } from "next";
import { after } from "next/server";
import type { ReactNode } from "react";
import { warmDashboardData } from "@/sim/dashboard-data";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  // Warm the incrementality sim AFTER this response is sent, not before: any console page a person
  // opens starts the ~5s build in the background, so the dashboard's first click — measured at
  // 4.9s cold, and the reason `e2e/dashboard.spec.ts` was red — becomes a cache read. See
  // `warmDashboardData` for why this is here and not in `instrumentation.ts`.
  after(warmDashboardData);
  return children;
}
