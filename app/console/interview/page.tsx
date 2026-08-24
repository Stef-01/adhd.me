// O30: the onboarding interview, run from the console.
//
// The matching console keeps its WORKED EXAMPLE — a fixed transcript everybody can audit the
// pipeline against. This page is the working instrument: the transcript field is editable and
// empty, and everything on it is live. Session-gated like every console surface; the transcript
// and the saved draft are internal, and nothing on this path can publish (G6).

import Link from "next/link";
import { requireSession } from "../guard";
import { InterviewScreen } from "./interview-screen";

export const metadata = { title: "Onboarding interview — ADHD.ME" };
export const dynamic = "force-dynamic";

export default async function InterviewPage() {
  await requireSession();
  return (
    <main id="main-content" className="mc">
      <header className="mc-head">
        <Link href="/console" className="mc-back">Console</Link>
        <h1>Onboarding interview</h1>
        <p className="mc-lead">
          Twenty minutes of a doctor talking about how they work, typed as it happens. The
          machine proposes; the interviewer asks the scripted question back; only a recorded
          answer becomes part of the profile draft.
        </p>
      </header>
      <InterviewScreen />
    </main>
  );
}
