import type { TheoItem } from "@/lives/theo-launch";

/** Original, flat illustrated props. Colour is decorative; every control has a text label. */
export function TheoProp({ item }: { item: TheoItem }) {
  const shapes = {
    keys: <><circle cx="27" cy="25" r="14" fill="#f6c344" /><circle cx="27" cy="25" r="5" fill="#fff6dc" /><path d="m37 35 23 23 7-7m-17-3 7-7" fill="none" stroke="#d49419" strokeWidth="9" /></>,
    phone: <><rect x="22" y="7" width="36" height="64" rx="8" fill="#34534b" /><rect x="27" y="16" width="26" height="40" rx="3" fill="#99d8c2" /><path d="m33 37 6 6 10-15" fill="none" stroke="#34534b" strokeWidth="4" /><circle cx="40" cy="64" r="3" fill="#fff6dc" /></>,
    shoes: <><path d="M7 24h20l6 16 25 8q10 5 8 14H7z" fill="#d9614b" /><path d="M12 14h18l6 11 25 7q9 3 11 14H38L23 33H12z" fill="#f3956e" /><path d="M7 58h58M32 42l9-8m0 13 9-8" stroke="#fff6dc" strokeWidth="6" /></>,
    wallet: <><rect x="9" y="19" width="62" height="43" rx="9" fill="#a55b35" /><path d="M16 16h44v9H16" fill="#f2c976" /><rect x="48" y="31" width="26" height="20" rx="6" fill="#d88d50" /><circle cx="59" cy="41" r="3" fill="#fff6dc" /></>,
    pass: <><rect x="9" y="18" width="62" height="44" rx="7" fill="#6677b8" /><path d="M10 28h60" stroke="#bccced" strokeWidth="8" /><rect x="18" y="43" width="18" height="10" rx="2" fill="#f6c344" /><path d="M44 46h17m-17 7h11" stroke="#fff6dc" strokeWidth="3" /></>,
    book: <><path d="M10 14h50q10 0 10 10v42H19q-9 0-9-9z" fill="#7479b4" /><path d="M19 14v45h51M30 28h27m-27 9h21" fill="none" stroke="#ece5fb" strokeWidth="4" /><path d="M50 14v14l7-5 6 5V14" fill="#f6c344" /></>,
    plant: <><path d="M40 47V19" stroke="#3a7760" strokeWidth="5" /><path d="M40 35Q7 34 15 12q27 0 25 23m0-7Q64 2 69 21q-5 19-29 17" fill="#6b9d63" /><path d="M20 44h41l-8 27H28z" fill="#df8259" /><path d="M18 44h45" stroke="#ad5639" strokeWidth="7" /></>,
    laundry: <><path d="M13 34h56l-7 35H20z" fill="#d6a658" /><path d="M21 34Q8 7 31 17q13-17 22 0 24-8 10 17" fill="#a8bbb8" /><path d="M24 43v17m13-17v17m13-17v17m11-17v17" stroke="#fff6dc" strokeWidth="4" /></>,
    email: <><rect x="7" y="21" width="66" height="44" rx="6" fill="#f9e4b9" /><path d="m9 25 31 23 31-23M9 62l22-20m40 20L49 42" fill="none" stroke="#bb8651" strokeWidth="3" /><circle cx="65" cy="19" r="12" fill="#d9614b" /><path d="M65 12v9m0 4v2" stroke="#fff6dc" strokeWidth="3" /></>,
    coffee: <><path d="M19 27h39v26q0 15-20 15T19 53z" fill="#d9614b" /><path d="M58 33q24-2 12 19H57" fill="none" stroke="#d9614b" strokeWidth="7" /><path d="M30 19q-8-8 0-14m16 14q-8-8 0-14" fill="none" stroke="#aa7853" strokeWidth="3" /></>,
    controller: <><path d="M24 22h33q12 0 17 32t-23 4H30Q-5 90 7 48t17-26" fill="#6677b8" /><path d="M23 33v22m-11-11h22" stroke="#fff6dc" strokeWidth="5" /><circle cx="54" cy="36" r="4" fill="#f6c344" /><circle cx="63" cy="46" r="4" fill="#e88776" /></>,
  };
  return <svg viewBox="0 0 80 80" aria-hidden="true" className="theo-prop">{shapes[item]}</svg>;
}

export function TheoHallway({ mood = "ready", packed = 0 }: { mood?: "ready" | "worried" | "success" | "failure"; packed?: number }) {
  return <svg className="theo-hallway" data-mood={mood} viewBox="0 0 440 330" aria-hidden="true">
    <path fill="#f8d889" d="M0 0h440v330H0z" /><path fill="#edbc6b" d="M0 267h440v63H0z" />
    <path d="M0 267h440" stroke="#c79759" strokeWidth="5" />
    <rect x="232" y="27" width="156" height="246" rx="75" fill="#ad6d44" />
    <rect x="241" y="36" width="138" height="237" rx="66" fill={mood === "success" ? "#9ccbb8" : "#d47b51"} />
    {mood === "success" && <><path d="M243 207q67-70 134 0v63H243" fill="#70a48b" /><circle cx="329" cy="101" r="24" fill="#fff1aa" /></>}
    <g className="theo-door-leaf"><path d="M243 108q0-70 67-70t67 70v163H243z" fill="#df8f60" /><rect x="265" y="90" width="90" height="65" rx="30" fill="#f4c987" /><path d="M310 91v62" stroke="#ad6d44" strokeWidth="5" /><circle cx="353" cy="199" r="7" fill="#fff1aa" /></g>
    <circle cx="80" cy="66" r="34" fill="#fff6dc" /><circle cx="80" cy="66" r="28" fill="none" stroke="#b48f54" strokeWidth="2" /><path d="M80 47v19l15 8" fill="none" stroke="#475344" strokeWidth="4" strokeLinecap="round" />
    <rect x="26" y="151" width="94" height="8" rx="4" fill="#9e6749" /><path d="M37 159v98m69-98v98" stroke="#9e6749" strokeWidth="7" />
    <path d="M34 145h68v-11H34z" fill="#6677b8" /><path d="M45 133h56v-13H45z" fill="#e79b72" />
    <ellipse cx="195" cy="290" rx="65" ry="12" fill="#d1a35e" />
    <g className="theo-person"><path d="m174 260-7 27m48-27 8 27" stroke="#3e5950" strokeWidth="11" strokeLinecap="round" />
    <path d="M148 232v-48q0-51 46-51t46 51v48q0 42-46 42t-46-42" fill="#80b6a0" />
    <path d="M151 178q-6-53 38-49 38-14 49 47l-22-16-12 12-13-15-20 17" fill="#37564b" />
    <path d={mood === "worried" || mood === "failure" ? "M169 190l12-5m25 0 12 5" : "M169 185h12m25 0h12"} stroke="#30483e" strokeWidth="3" strokeLinecap="round" />
    <ellipse cx="175" cy="199" rx="3" ry="5" fill="#30483e" /><ellipse cx="211" cy="199" rx="3" ry="5" fill="#30483e" />
    <path d={mood === "failure" || mood === "worried" ? "M184 218q10-8 19 0" : "M184 214q10 12 19 0"} stroke="#30483e" strokeWidth="3" fill="none" strokeLinecap="round" />
    <path d="M149 220q-24 16-23-12m115 12q20 12 24-9" fill="none" stroke="#619881" strokeWidth="10" strokeLinecap="round" />
    {packed > 0 && <><path d="m206 233 26-3 4 42h-34z" fill="#6677b8" /><path d="M209 234v-6q10-14 17 0v4" stroke="#475686" strokeWidth="4" fill="none" /></>}
    </g>
    <path d="M274 291h108" stroke="#b07d47" strokeWidth="10" strokeLinecap="round" />
  </svg>;
}
