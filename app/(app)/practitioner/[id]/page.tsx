import { notFound } from "next/navigation";
import { clinicians } from "@/demo/clinicians";
import { PractitionerProfile } from "../../../practitioner-profile";
import { ROBOTS_META } from "@/security/robots";
export const metadata = { title: "Your practitioner", robots: ROBOTS_META };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinician = clinicians.find((p) => p.id === id);
  if (!clinician) notFound();
  return <PractitionerProfile clinician={clinician} />;
}
