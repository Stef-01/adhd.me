import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADHD.ME: assessment you can actually reach",
  description:
    "Find a GP in Beecroft or on the Gold Coast who does ADHD assessment, in your language, at a practice you can get to.",
};

/**
 * ONE COLOUR STRATEGY, NOT TWO.
 *
 * The body carried `bg-stone-50 text-stone-900` — Tailwind's own palette, hardcoded — while every
 * surface inside it takes colour from the CSS variables in globals.css. That is two strategies for
 * one job, and it was invisible until dark mode arrived: the tokens inverted, the Tailwind
 * utilities did not, and the margin around the clinician shell stayed cream on a dark page.
 *
 * The body now reads the same tokens as everything else, so there is exactly one place a theme is
 * decided. `min-h-screen` and `antialiased` stay: neither is a colour.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased app-body">{children}</body>
    </html>
  );
}
