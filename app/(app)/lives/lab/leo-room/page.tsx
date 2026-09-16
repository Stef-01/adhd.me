import "../../../../styles/leo-room.css";
import type { Metadata } from "next";
import { LeoBedroom } from "../../../../lives/leo-room/player";

export const metadata: Metadata = {
  title: "Leo’s evening · Gameplay preview",
  description: "Catch the buzz, change the room, and return the following evening.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <main id="main-content"><LeoBedroom /></main>;
}
