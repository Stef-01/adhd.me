import type { Metadata } from "next";
import { Phone } from "@phosphor-icons/react/dist/ssr";
import { ROBOTS_META } from "@/security/robots";
import { URGENT_SERVICES } from "@/model/safety";

// Urgent help (Charmaine Bernie, 2026-09-11). Reachable from the header of every patient screen,
// so it is one tap away whatever a person is in the middle of — and it asks nothing, reads nothing
// and records nothing on the way. The app does not decide whether somebody is in crisis; it names
// the services that already exist and gets out of the way, which is the whole of what it does.
export const metadata: Metadata = {
  alternates: { canonical: "/urgent" },
  robots: ROBOTS_META,
  title: "Urgent help",
  description: "The Australian services to call right now: 000, Lifeline, Kids Helpline and Beyond Blue, with the number for each.",
};

export default function UrgentPage() {
  return (
    <main id="main-content" className="me-screen urgent-screen">
      <h1>Talk to a person now.</h1>
      <ul className="urgent-list">
        {URGENT_SERVICES.map((s) => (
          <li key={s.name}>
            <a className="urgent-call" href={`tel:${s.tel}`}>
              <span className="urgent-name">
                <strong>{s.name}</strong>
                <span>{s.when}</span>
              </span>
              <span className="urgent-number t-digit">
                <Phone size={18} weight="fill" aria-hidden="true" />
                {s.said}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="urgent-note">Free, any hour, from any phone.</p>
    </main>
  );
}
