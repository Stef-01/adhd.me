import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MyAdhdHistory } from "../../../my-adhd-history";

// What you have tried, and how it went. Off the hub, one word away.
export const metadata: Metadata = {
  alternates: { canonical: "/my-adhd/history" },
  robots: ROBOTS_META,
  title: "What you tried",
  description: "The strategies you have tried, how each one went, and the readings you said fitted.",
};

export default function MyAdhdHistoryPage() {
  return <MyAdhdHistory />;
}
