import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ADHD.ME — ADHD assessment you can actually reach",
  description:
    "Find a GP in Western Sydney who does ADHD assessment, in your language, at a practice you can get to.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
