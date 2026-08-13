import type { Metadata } from "next";
import Link from "next/link";
import { ClinicianJoinForm } from "./join-form";

export const metadata: Metadata = {
  title: "Join the directory | ADHD.ME",
  description:
    "For GPs who have completed the NSW training to carry ADHD care. Apply to be listed in the ADHD.ME directory.",
};

export default function JoinPage() {
  return (
    <main className="join-page">
      <div className="join-wrap">
        <header className="join-header">
          <Link href="/clinicians" className="join-back">For clinicians</Link>
          <p className="eyebrow">Join the directory</p>
          <h1>Be findable by the people already looking.</h1>
          <p className="join-lead">
            For GPs who have completed the NSW training. Five minutes, and a person reads every
            application.
          </p>
        </header>

        <ClinicianJoinForm />
      </div>
    </main>
  );
}
