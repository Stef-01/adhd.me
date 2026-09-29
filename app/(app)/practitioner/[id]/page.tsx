import { notFound } from "next/navigation";
import { clinicians } from "@/demo/clinicians";
import { PractitionerProfile } from "../../../practitioner-profile";
import { ROBOTS_META } from "@/security/robots";
export const metadata = { title: "Your practitioner", robots: ROBOTS_META };
/** Every listed clinician is built ahead, and an id that is not one is a 404 at the router, not a page that streams a 200 first. */
export function generateStaticParams() {
  return clinicians.map((clinician) => ({ id: clinician.id }));
}
export const dynamicParams = false;
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clinician = clinicians.find((p) => p.id === id);
  if (!clinician) notFound();
  return <PractitionerProfile clinician={clinician} />;
}
