import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meherr Clinician — Build a focused practice",
  description: "A clinician pathway for concentrating appropriate cases and learning deliberately around the work ahead.",
};

export default function CliniciansLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
