import type { Metadata } from "next";
import "../../../../styles/leo-room.css";
import { LeoBedroom } from "../../../../lives/leo-room/player";
import { ROBOTS_META } from "@/security/robots";

export const metadata: Metadata = {
  title: "Leo and the mosquito, ADHD Lives",
  description: "Catch the buzz, change the room, and carry your bedtime routine into the next evening.",
  alternates: { canonical: "/lives/play/leo-mosquito" },
  robots: ROBOTS_META,
};

export default function Page() {
  return <main id="main-content"><LeoBedroom rounds /></main>;
}
