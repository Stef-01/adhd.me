import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build a focused practice | ADHD.ME",
  description: "A clinician pathway for concentrating appropriate cases and learning deliberately around the work ahead.",
};

export default function CliniciansLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
