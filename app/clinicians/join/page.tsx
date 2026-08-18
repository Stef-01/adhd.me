import type { Metadata } from "next";
import { JoinExperience } from "./join-experience";

export const metadata: Metadata = {
  alternates: { canonical: "/clinicians/join" },
  title: "Join the directory",
  description:
    "For GPs who have completed the NSW training to carry ADHD care. Apply to be listed in the ADHD.ME directory.",
};

export default function JoinPage() {
  return (
    <main className="join-page">
      {/* O26: hero and form share one owner, so the mix set above actually reaches the
          application below — see join-experience.tsx. */}
      <JoinExperience />
    </main>
  );
}
