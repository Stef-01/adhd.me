import type { Metadata } from "next";
import { ChatCircleText, ChatsCircle, Phone } from "@phosphor-icons/react/dist/ssr";
import { ROBOTS_META } from "@/security/robots";
import { URGENT_SERVICES } from "@/model/safety";
import type { ContactMethod } from "@/model/crisis-contacts";

// Reachable from the header of every patient screen. It asks nothing, reads nothing and records
// nothing: it names the services that already exist, by voice, text or chat, and gets out of the way.
export const metadata: Metadata = {
  alternates: { canonical: "/urgent" },
  robots: ROBOTS_META,
  title: "Urgent help",
  description: "The Australian services to call, text or chat with right now: 000, Lifeline, Kids Helpline and Beyond Blue.",
};

const ICON: Record<ContactMethod, typeof Phone> = { call: Phone, text: ChatCircleText, relay: ChatCircleText, chat: ChatsCircle };

export default function UrgentPage() {
  return (
    <main id="main-content" className="me-screen urgent-screen">
      <h1>Reach a person now.</h1>
      <ul className="urgent-list">
        {URGENT_SERVICES.map((s) => {
          const Icon = ICON[s.method];
          const away = s.method === "chat" ? { target: "_blank", rel: "noopener noreferrer" } : {};
          return (
            <li key={s.id}>
              <a className="urgent-call" href={s.href} data-method={s.method} {...away}>
                <span className="urgent-name">
                  <strong>{s.service}</strong>
                  <span>{s.when}</span>
                </span>
                <span className="urgent-number t-digit">
                  <Icon size={18} weight="fill" aria-hidden="true" />
                  {s.said}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
