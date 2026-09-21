import { notFound } from "next/navigation";
import { rosterFor } from "@/demo/synthetic-roster";
import { PractitionerProfile } from "../../../practitioner-profile";
import { ROBOTS_META } from "@/security/robots";
export const metadata = { title: "Your practitioner", robots: ROBOTS_META };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinician = rosterFor(true).find(p => p.id === id);
  if (!clinician) notFound();
  return <PractitionerProfile clinician={clinician} />;
}
