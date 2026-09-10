import type { Metadata } from "next";
import { TheoPractice } from "../../../../lives/theo-practice";
import { ROBOTS_META } from "@/security/robots";
export const metadata: Metadata = { title: "Theo: Out the door — ADHD Lives", description: "Pack the essentials, resist the detours, and help Theo get out the door. A replayable game with an untimed option.", alternates: { canonical: "/lives/play/theo-out-the-door" }, robots: ROBOTS_META };
export default function Page() { return <main id="main-content"><TheoPractice /></main>; }
