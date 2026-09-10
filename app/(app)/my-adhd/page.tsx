import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MyAdhd } from "../../my-adhd";

// My ADHD (PRD §26): the personal life map, from this device's own record.
export const metadata: Metadata = {
  alternates: { canonical: "/my-adhd" },
  robots: ROBOTS_META,
  title: "My ADHD",
  description: "Your own picture, the biggest friction, what seems to contribute across brain, body, environment and people, and what has helped.",
};

export default function MyAdhdPage() {
  return <MyAdhd />;
}
