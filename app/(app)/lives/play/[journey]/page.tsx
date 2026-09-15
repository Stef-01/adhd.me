import { notFound } from "next/navigation";
import { JOURNEYS } from "@/lives/journeys";
import { CharacterJourney } from "../../../../lives/journey";
import { ROBOTS_META } from "@/security/robots";
export async function generateMetadata({ params }: { params: Promise<{ journey: string }> }) {
  const { journey: slug } = await params;
  const journey = JOURNEYS.find(item => item.slug === slug);
  return { title: journey ? `${journey.title} — ADHD Lives` : "ADHD Lives", robots: ROBOTS_META };
}
export default async function Page({ params }: { params: Promise<{ journey: string }> }) {
  const { journey: slug } = await params;
  const journey = JOURNEYS.find(item => item.slug === slug);
  if (!journey) notFound();
  return <main id="main-content"><CharacterJourney journey={journey} /></main>;
}
