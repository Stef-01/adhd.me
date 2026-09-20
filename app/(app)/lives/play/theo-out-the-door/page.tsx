import "../../../../styles/theo-morning.css";
import type { Metadata } from "next";
import { TheoPractice } from "../../../../lives/theo-practice";
import { ROBOTS_META } from "@/security/robots";
export const metadata: Metadata = { title: "Theo: Out the door — ADHD Lives", description: "Plan a route, juggle interruptions, and catch the train with Theo. Arrange the house tonight and feel the difference tomorrow.", alternates: { canonical: "/lives/play/theo-out-the-door" }, robots: ROBOTS_META };
export default function Page() { return <main id="main-content"><TheoPractice /></main>; }
