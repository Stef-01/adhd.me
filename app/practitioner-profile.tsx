"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import type { Clinician } from "@/demo/clinicians";
import { ProfileStage } from "./finder-stages/profile-stage";
import { BookingStage } from "./finder-stages/booking-stage";
export function PractitionerProfile({ clinician }: { clinician: Clinician }) {
  const router = useRouter();
  const [booking, setBooking] = useState(false);
  return <MotionConfig reducedMotion="user"><main id="main-content" className="care-app patient-v2" data-stage={booking ? "booking" : "profile"} data-tabs="hidden"><section className="care-shell">
    {booking ? <BookingStage clinician={clinician} focusOnArrival onBack={() => setBooking(false)} /> :
      <ProfileStage clinician={clinician} personalizedSignals={[]} profileEvidence={[]} profileMissed={[]} request="" origin={null} compareName={null} focusOnArrival
        onBack={() => router.push("/support")} onCompare={() => router.push("/")} onBook={() => setBooking(true)} />}
  </section></main></MotionConfig>;
}
