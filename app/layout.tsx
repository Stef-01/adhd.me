import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meherr — recognise PMOS earlier",
  description:
    "A Western Sydney community program helping South Asian women recognise PMOS, formerly PCOS, earlier.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">{children}</body>
    </html>
  );
}
