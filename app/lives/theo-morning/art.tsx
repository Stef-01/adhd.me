import { TheoProp } from "../theo-art";
import type { Command, Room } from "@/lives/theo-morning";
import { beanColour, beanInk, beanTone } from "../bean";

export function Prop({ kind }: { kind: Command | "clock" | "moon" }) {
  if (["keys", "phone", "shoes", "laundry", "plant", "email"].includes(kind)) return <TheoProp item={kind as "keys" | "phone" | "shoes" | "laundry" | "plant" | "email"} />;
  return <svg viewBox="0 0 80 80" aria-hidden="true">
    {kind === "bottle" && <><rect x="29" y="5" width="23" height="12" rx="4" fill="#31584c"/><path d="M29 17h23l7 13v38q0 7-8 7H29q-8 0-8-7V30z" fill="#c1e5da"/><path d="M24 40q15-7 32 0v27q0 5-6 5H30q-6 0-6-5z" fill="#4b9b90"/><path d="M29 26v30" stroke="#f7ffea" strokeWidth="4" strokeLinecap="round"/></>}
    {kind === "bag" && <><path d="M26 22V15q14-15 28 0v7" stroke="#354854" fill="none" strokeWidth="6"/><rect x="15" y="18" width="50" height="55" rx="15" fill="#657799"/><rect x="21" y="42" width="38" height="22" rx="7" fill="#899cb8"/><path d="M26 49h28" stroke="#f7efd6" strokeWidth="3"/><path d="M19 22v22m42-22v22" stroke="#354854" strokeWidth="4"/></>}
    {kind === "spill" && <><path d="M8 54q-4-13 13-14 5-19 21-6 28-13 29 8 15 13-5 20-29 17-52 0z" fill="#70adba"/><path d="m22 43 12-24 21 11-10 24z" fill="#f6f3de"/><path d="m28 41 11-17" stroke="#9fbec3" strokeWidth="3"/></>}
    {kind === "umbrella" && <><path d="M40 12v51q0 15-12 7" stroke="#34544e" strokeWidth="5" fill="none" strokeLinecap="round"/><path d="M5 40q35-57 70 0-12-9-23 0-12-9-24 0-11-9-23 0" fill="#df846b"/><path d="M40 12Q23 23 28 40m12-28q16 12 12 28" stroke="#f2b29b" strokeWidth="3" fill="none"/></>}
    {(kind === "later" || kind === "message") && <><path d="M12 12h56v48L52 75H12z" fill="#fff1b2"/><path d="M52 75V59h16M23 27h34M23 38h29M23 49h20" fill="none" stroke="#a77b3d" strokeWidth="4" strokeLinecap="round"/></>}
    {kind === "clock" && <><circle cx="40" cy="40" r="32" fill="#fff6dc" stroke="#b58b4c" strokeWidth="5"/><path d="M40 18v22l15 9" fill="none" stroke="#34534b" strokeWidth="5" strokeLinecap="round"/><circle cx="40" cy="40" r="4" fill="#34534b"/></>}
    {kind === "door" && <><path d="M17 72V29q0-25 23-25t23 25v43z" fill="#c27750"/><path d="M25 34q0-24 15-24t15 24" fill="#f3d28b"/><circle cx="53" cy="49" r="4" fill="#fff2b2"/></>}
    {kind === "breathe" && <><path d="M10 30h40q25 0 12-17M10 43h49q24 0 11 16M16 56h22q18 0 12 14" stroke="#438777" strokeWidth="6" fill="none" strokeLinecap="round"/></>}
    {kind === "moon" && <path d="M58 8Q30 40 66 58 27 87 12 51-1 18 35 8q-5 31 23 0" fill="#ffdb83"/>}
  </svg>;
}

export function RoomArt({ room, evening }: { room: Room; evening: boolean }) {
  return <svg viewBox="0 0 260 190" aria-hidden="true" className="tm-furniture">
    {room === "kitchen" && <><rect x="13" y="18" width="53" height="128" rx="8" fill="#d6ddd0"/><path d="M13 69h53m-11-27v13m0 30v18" stroke="#879e90" strokeWidth="4"/><rect x="77" y="84" width="166" height="65" rx="4" fill="#91b2a0"/><path d="M77 84h166M131 88v61m56-61v61" stroke="#5e8875" strokeWidth="5"/><path d="M98 79V65q0-19 18-13v17" fill="none" stroke="#496b65" strokeWidth="5"/><ellipse cx="115" cy="85" rx="27" ry="5" fill="#d7e2d2"/><rect x="166" y="29" width="51" height="35" rx="8" fill="#f3c47c"/><path d="m174 44 10-8 11 13 13-8" stroke="#bf905d" strokeWidth="3" fill="none"/></>}
    {room === "bedroom" && <><rect x="54" y="80" width="184" height="78" rx="13" fill="#bb896a"/><rect x="63" y="88" width="165" height="57" rx="10" fill={evening ? "#849aa9" : "#e8ab83"}/><rect x="68" y="91" width="49" height="42" rx="10" fill="#fff0ce"/><path d="M123 89v57" stroke="#c7886c" strokeWidth="5"/><path d="M62 156v16m165-16v16" stroke="#936e53" strokeWidth="6"/><rect x="13" y="105" width="34" height="8" rx="3" fill="#937955"/><path d="M20 113v43m20-43v43M30 105V79" stroke="#937955" strokeWidth="4"/><path d="m11 79 9-27h22l9 27z" fill="#f5cd79"/><rect x="151" y="10" width="54" height="53" rx="25" fill={evening ? "#334c66" : "#b6d9cf"}/><path d="M178 10v52m-27-26h53" stroke="#fff0cf" strokeWidth="4"/>{evening && <circle cx="168" cy="24" r="7" fill="#f9da85"/>}</>}
    {room === "living" && <><rect x="21" y="70" width="148" height="73" rx="21" fill="#d69d72"/><rect x="31" y="98" width="129" height="47" rx="9" fill="#e9b88a"/><path d="M40 147v14m111-14v14" stroke="#987454" strokeWidth="6"/><rect x="34" y="80" width="49" height="32" rx="10" fill="#f5d59c"/><rect x="93" y="79" width="49" height="32" rx="10" fill="#b5baa0"/><path d="M217 127V47" stroke="#5d8872" strokeWidth="5"/><path d="M216 86Q170 80 185 45q33 8 31 41m2-27q27-40 36-10-2 29-36 28" fill="#87ad87"/><path d="M195 118h43l-8 40h-26z" fill="#b47f5a"/><rect x="50" y="13" width="77" height="40" rx="6" fill="#fff1c7"/><path d="m64 40 18-17 16 14 16-11" fill="none" stroke="#b3926b" strokeWidth="4"/></>}
    {room === "door" && <><path d="M88 165V65q0-56 57-56t57 56v100" fill="#a47151"/><path d="M97 165V65q0-47 48-47t48 47v100" fill="#d88c61"/><path d="M118 76V59q0-27 27-27t27 27v17z" fill="#f4d598"/><path d="M145 33v43" stroke="#b27f57" strokeWidth="4"/><circle cx="176" cy="112" r="6" fill="#fff0bb"/><path d="M101 178h95" stroke="#b28a60" strokeWidth="9" strokeLinecap="round"/><path d="M41 25v137M23 52h37" stroke="#a47e55" strokeWidth="6" strokeLinecap="round"/><path d="M25 55h31v53H21z" fill="#739a87"/></>}
  </svg>;
}

/*
 * Theo, in Theo's own colours. This avatar was drawn fern (#80b6a0 body, #37564b hair, #284b40
 * face) while the cast has defined Theo as cyan since the beans were drawn, so the library
 * thumbnail and the game it opens showed two different people — the conflict the v2 plan names
 * and resolves in favour of the canonical identity. The four tones are derived from that one
 * palette entry rather than picked again here, so this cannot drift into a third Theo. The shoes
 * and the shadow are not identity and keep their own colours.
 */
const SKIN = beanColour("theo");
const FACE = beanInk("theo");
const HAIR = beanTone("theo", 0.15);
const ARMS = beanTone("theo", 0.55);

export function TheoAvatar({ load, walking, shoes, carrying }: { load: number; walking: boolean; shoes: boolean; carrying: number }) {
  return <svg viewBox="0 0 100 126" aria-hidden="true" className="tm-avatar" data-walking={walking} data-upset={load > 60}>
    <ellipse cx="50" cy="117" rx="31" ry="6" fill="#725b3f" opacity=".18"/>
    <g className="tm-leg-left"><path d="m35 93-5 21" stroke={HAIR} strokeWidth="7" strokeLinecap="round"/>{shoes && <path d="M24 109h14l-1 9H21q-5-7 3-9" fill="#c77554"/>}</g>
    <g className="tm-leg-right"><path d="m65 93 5 21" stroke={HAIR} strokeWidth="7" strokeLinecap="round"/>{shoes && <path d="M65 109h12q8 6 2 9H63z" fill="#c77554"/>}</g>
    <g className="tm-body"><path d="M19 66V42q0-34 31-34t31 34v27q0 36-31 36T19 66" fill={SKIN}/><path d="M20 40Q15 7 45 10q31-15 36 29L66 28l-8 10-10-11-12 11" fill={HAIR}/>
    <path d={load > 60 ? "m32 44 8-3m20 0 8 3" : "m32 41 8-1m20 0 8 1"} stroke={FACE} strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="36" cy="51" rx="2.5" ry="3.5" fill={FACE}/><ellipse cx="64" cy="51" rx="2.5" ry="3.5" fill={FACE}/>
    <path d={load > 60 ? "M43 69q7-7 14 0" : "M43 65q7 8 14 0"} stroke={FACE} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    <path d={carrying ? "M20 74 7 63m74 11 12-11" : "M20 69Q7 85 6 68m75 1q13 16 13-1"} fill="none" stroke={ARMS} strokeWidth="7" strokeLinecap="round"/>
    {load > 60 && <path d="M88 29q6 10 0 12-7-2 0-12" fill="#588d9b"/>}</g>
  </svg>;
}
