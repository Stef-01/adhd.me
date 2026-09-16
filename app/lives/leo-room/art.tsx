import type { BedroomState } from "@/lives/leo-room";

export function BedroomBackdrop() {
  return <svg className="bedroom-backdrop" viewBox="0 0 1200 740" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="br-wall" x2=".8" y2="1"><stop stopColor="#dedff3" /><stop offset="1" stopColor="#b9bce0" /></linearGradient>
      <linearGradient id="br-floor" x2="0" y2="1"><stop stopColor="#ada9ce" /><stop offset="1" stopColor="#c9bfce" /></linearGradient>
      <radialGradient id="br-light"><stop stopColor="#fff1c4" stopOpacity=".7" /><stop offset="1" stopColor="#fff1c4" stopOpacity="0" /></radialGradient>
    </defs>
    <path fill="url(#br-wall)" d="M0 0h1200v740H0z" />
    <path d="M0 498Q590 514 1200 492v248H0z" fill="url(#br-floor)" />
    <path d="M0 498Q590 514 1200 492" fill="none" stroke="#9796be" strokeWidth="9" />
    <path d="M0 507Q590 523 1200 501" fill="none" stroke="#eee6e8" strokeWidth="3" opacity=".5" />
    <g stroke="#8f8aaf" opacity=".13" strokeWidth="2"><path d="m240 505-135 235m330-235-35 235m300-235 85 235m165-235 220 235M0 592h1200M0 699h1200" /></g>
    <ellipse cx="525" cy="585" rx="375" ry="82" fill="#918daf" opacity=".12" />
    <ellipse cx="240" cy="410" rx="330" ry="290" fill="url(#br-light)" />
    <g className="bedroom-side-art">
      <path d="M130 119h99v137h-99z" fill="#b3b3d4" transform="rotate(-4 180 188)" />
      <path d="M136 120h87v125h-87z" fill="#ede5dc" transform="rotate(-4 180 188)" />
      <path d="M146 225q40-100 66-13v20z" fill="#96a6a0" /><circle cx="174" cy="151" r="16" fill="#e6b77b" />
      <path d="M1003 428q-14-89 29-126-3 64-22 91 35-43 67-35-22 43-64 65" fill="#7b918d" />
      <path d="M993 425h39l-5 66h-28z" fill="#dfac88" /><path d="M990 425h45v11h-45z" fill="#eac4a4" />
      <path d="M99 384h146v15H99z" fill="#9184a0" /><path d="M116 399v92m112-92v92" stroke="#9184a0" strokeWidth="9" />
      <g transform="translate(126 350) rotate(-3)"><rect width="82" height="12" rx="3" fill="#b57c81" /><rect x="5" y="12" width="84" height="10" rx="3" fill="#e2c78c" /><rect y="22" width="78" height="12" rx="3" fill="#788b9b" /></g>
    </g>
  </svg>;
}

export function RoomWindow({ secured, outside }: { secured: boolean; outside: boolean }) {
  return <svg viewBox="0 0 180 230" aria-hidden="true">
    <defs><linearGradient id="br-night" x2="0" y2="1"><stop stopColor="#393c74" /><stop offset="1" stopColor="#777faf" /></linearGradient></defs>
    <path d="M15 211V77a75 75 0 0 1 150 0v134z" fill="#9598c4" />
    <path d="M23 204V78a67 67 0 0 1 134 0v126z" fill="url(#br-night)" />
    <path d="M100 35a22 22 0 1 0 23 26 23 23 0 0 1-23-26" fill="#f8ebc2" />
    <g fill="#e9e4ff" opacity=".65"><circle cx="63" cy="77" r="2" /><circle cx="129" cy="96" r="1.6" /><circle cx="56" cy="114" r="1.8" /><path d="m131 57 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /></g>
    <path d="M23 184q30-31 63-11 29-45 71-23v54H23z" fill="#4b547e" />
    <g className="room-window-sash" data-closed={secured}>
      <path d="M26 202V79a64 64 0 0 1 128 0v123z" fill={secured ? "#d3e6f1" : "#c4d5ea"} fillOpacity={secured ? ".18" : ".08"} stroke="#ebe7ee" strokeWidth="7" />
      <path d="M90 17v187M26 119h128" stroke="#e9e5ef" strokeWidth="6" />
      <path d="m40 118 40-68M115 173l23-39" stroke="#fff" strokeWidth="4" opacity=".16" />
      <path d={secured ? "M89 123v22" : "M89 123l18 12"} stroke="#e4be82" strokeWidth="6" strokeLinecap="round" />
    </g>
    <path d="M6 206h168v13H6z" fill="#e8e2e8" /><path d="M10 219h160v6H10z" fill="#a6a0bc" />
    {outside && <g className="room-outside-insects" fill="#d8d8ef" stroke="#a4abcd" strokeWidth="2"><ellipse cx="48" cy="142" rx="7" ry="3" /><path d="m47 141-6-8m7 9 5-8" /><ellipse cx="123" cy="168" rx="6" ry="3" /><path d="m122 166-6-7m7 7 5-6" /></g>}
    {!secured && <path className="room-breeze" d="M60 184q-40-15-50 4m56-22q-39-16-50 3" fill="none" stroke="#fbf7f7" strokeWidth="2" strokeLinecap="round" opacity=".5" />}
  </svg>;
}

export function BedAndLeo({ mood, headphones }: { mood: string; headphones: boolean }) {
  const tense = mood === "irritated" || mood === "overwhelmed";
  const resting = mood === "resting";
  return <svg className="room-bed-art" viewBox="0 0 420 360" aria-hidden="true" data-mood={mood}>
    <ellipse cx="224" cy="332" rx="174" ry="19" fill="#66608c" opacity=".17" />
    <path d="M61 117v191m299-191v191" stroke="#897286" strokeWidth="13" strokeLinecap="round" />
    <path d="M62 135V76q0-23 24-23h248q26 0 26 23v59" fill="#ac8995" stroke="#897286" strokeWidth="8" />
    <path d="M80 122V80q0-10 12-10h235q16 0 16 12v40" fill="#c5a6a6" />
    <path d="M83 113q53-23 119-7 64-19 135 7l12 119H73z" fill="#fbf3e5" />
    <path d="M97 105q54-17 99-1l-4 62q-51 13-101-5z" fill="#fffaf1" stroke="#e5d9d1" strokeWidth="3" />
    <path d="M221 106q55-13 98 4l8 54q-59 10-101-6z" fill="#fffaf1" stroke="#e5d9d1" strokeWidth="3" />
    <g className="room-leo-body">
      <path d="M177 162q-19 29-14 64h91q6-48-21-67z" fill="#a4b737" />
      <g className="room-leo-head">
        <path d="M166 132q-13-67 19-83 28-14 54-1 25 12 22 65l-5 45q-2 31-41 32-39 1-46-23z" fill="#c4d54d" />
        <path d="M177 78q5-19 26-23" stroke="#dce985" strokeWidth="5" strokeLinecap="round" fill="none" />
        {resting ? <g stroke="#52672c" strokeWidth="4" fill="none" strokeLinecap="round"><path d="M186 118q9 10 17 0m21 0q8 10 16 0M205 144q9 8 18 0" /></g> : <>
          <g className="room-leo-eyes" fill="#45572d"><ellipse cx={tense ? 195 : 198} cy="119" rx="4" ry={tense ? 3 : 5} /><ellipse cx={tense ? 233 : 236} cy="119" rx="4" ry={tense ? 3 : 5} /></g>
          {tense && <path d="m184 105 18 6m23 0 16-6" stroke="#59652e" strokeWidth="4" strokeLinecap="round" />}
          <path d={mood === "overwhelmed" ? "M205 149q7-9 18 0" : tense ? "M207 146h16" : "M207 142q7 8 15 0"} stroke="#52672c" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <ellipse cx="184" cy="136" rx="9" ry="4" fill="#abba45" /><ellipse cx="245" cy="136" rx="9" ry="4" fill="#abba45" />
        </>}
        {headphones && <g fill="none" stroke="#555682"><path d="M164 128v-25q0-68 52-68 49 0 49 68v25" strokeWidth="9" /><rect x="152" y="98" width="20" height="42" rx="9" fill="#7178a7" strokeWidth="4" /><rect x="254" y="98" width="20" height="42" rx="9" fill="#7178a7" strokeWidth="4" /></g>}
      </g>
      <path d={tense ? "M169 166q-28-21-25-55m104 58q32-25 29-61" : "M169 169q-20 22-8 40m88-42q22 23 8 41"} stroke="#a5b73b" strokeWidth="12" fill="none" strokeLinecap="round" />
    </g>
    <path d="M76 198q141-25 269 0l30 107H52z" fill="#e7bb73" />
    <path d="M76 198q141-25 269 0l7 26q-145-22-283 1z" fill="#f4d49a" />
    <path d="M69 231q137-23 285-1l4 16q-148-25-295 3z" fill="#d5a05e" opacity=".45" />
    <path d="M170 204q-11 42-9 100m101-101q17 44 19 101" fill="none" stroke="#d5a666" strokeWidth="3" opacity=".5" />
    <path d="M55 297h316v20H55z" fill="#977989" /><path d="M66 312v19m294-19v19" stroke="#81677b" strokeWidth="11" strokeLinecap="round" />
    {resting && <g fill="#f4eddf" opacity=".8"><path d="m292 48 17-2-11 16 17-2v4l-23 2v-4l11-15-11 1z" /><path d="m314 20 11-1-7 10 10-1v3l-15 1v-3 0l7-8-6 1z" /></g>}
  </svg>;
}

export function RoomLamp({ level }: { level: BedroomState["lamp"] }) {
  return <svg viewBox="0 0 130 175" aria-hidden="true">
    <ellipse cx="65" cy="164" rx="47" ry="9" fill="#7f7399" opacity=".2" />
    <path d="M18 138h94v10H18z" fill="#90788f" /><path d="M30 148v20m70-20v20" stroke="#90788f" strokeWidth="7" />
    <path d="M65 62v70" stroke="#877189" strokeWidth="7" /><ellipse cx="65" cy="131" rx="25" ry="5" fill="#877189" />
    <path d="m37 14 53 0 23 55q-48 15-96 0z" fill={level === "off" ? "#b7a6b4" : level === "dim" ? "#dbbf91" : "#f3d79b"} />
    <ellipse cx="65" cy="68" rx="47" ry="8" fill={level === "off" ? "#8c809d" : "#ffecc4"} />
    <path d="M95 74v30" stroke="#84718a" strokeWidth="2" /><circle cx="95" cy="107" r="4" fill="#dba873" />
    <path d="M42 20 28 64" stroke="#fff1cb" strokeWidth="3" opacity={level === "off" ? 0 : .4} />
  </svg>;
}

export function RoomPhone({ parked, notifications }: { parked: boolean; notifications: number }) {
  return <svg viewBox="0 0 90 120" aria-hidden="true">
    <path d="M5 86h80l-10 28H15z" fill="#b69ba0" /><path d="M7 83h76v10H7z" fill="#d5bcb3" />
    <g className="room-phone-device" data-parked={parked}>
      <rect x="22" y="6" width="47" height="86" rx="10" fill="#504b73" />
      <rect x="26" y="13" width="39" height="70" rx="6" fill={parked ? "#777398" : "#c9daef"} />
      <path d="M38 10h14" stroke="#9893b8" strokeWidth="3" strokeLinecap="round" />
      {!parked && <><rect x="30" y="30" width="31" height="17" rx="4" fill="#fdf7ef" /><path d="M34 36h20m-20 5h14" stroke="#a8b2ce" strokeWidth="2" /><rect x="30" y="52" width="25" height="10" rx="4" fill="#b1c7e3" /></>}
      {!parked && notifications > 0 && <g><circle cx="65" cy="19" r="11" fill="#b05669" /><text x="65" y="23" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">{notifications}</text></g>}
      {parked && <path d="m39 46 5 5 10-12" fill="none" stroke="#c8c8e2" strokeWidth="3" strokeLinecap="round" />}
    </g>
  </svg>;
}

export function RoomBook({ open, page }: { open: boolean; page: number }) {
  return <svg viewBox="0 0 180 124" aria-hidden="true">
    <ellipse cx="90" cy="112" rx="75" ry="8" fill="#756681" opacity=".17" />
    {open ? <>
      <path d="M10 19q42-15 80 0 38-15 80 0v87q-38-14-80 0-38-14-80 0z" fill="#9a6975" />
      <path d="M15 14q40-13 75 2v83q-33-13-75-1zm150 0q-40-13-75 2v83q33-13 75-1z" fill="#fff6dc" />
      <path d="M90 18v77" stroke="#ded0b3" strokeWidth="2" />
      <g stroke="#c7b799" strokeWidth="2" opacity=".8"><path d="M26 35h44m-44 9h48m-48 9h42m-42 9h37M107 63h44m-44 9h44m-44 9h34" /></g>
      <g fill={page % 2 ? "#b0bb89" : "#becada"}><circle cx="130" cy="39" r="15" /><path d="m109 52 13-21 10 19 11-10 12 12z" fill={page % 2 ? "#788f7a" : "#7d88ad"} /></g>
      {page > 0 && <path d="M77 12h9v41l-4-5-5 5z" fill="#bd7b70" />}
    </> : <g transform="rotate(-9 90 62)"><rect x="40" y="8" width="95" height="99" rx="6" fill="#936377" /><path d="M49 11v92" stroke="#ac7d8a" strokeWidth="3" /><rect x="62" y="26" width="53" height="45" rx="24" fill="#d8bb9b" /><path d="M76 50q13-18 26 0-13-6-26 0" fill="#8a849d" /><path d="M69 83h40" stroke="#cdaab2" strokeWidth="3" />{page > 0 && <path d="M110 3h9v34l-5-5-4 5z" fill="#e3b48c" />}</g>}
  </svg>;
}

export function RoomHeadphones({ worn }: { worn: boolean }) {
  return <svg viewBox="0 0 100 95" aria-hidden="true"><ellipse cx="49" cy="82" rx="35" ry="7" fill="#756681" opacity=".16" /><g opacity={worn ? .3 : 1}><path d="M18 61V43a32 32 0 0 1 64 0v18" fill="none" stroke="#575d8c" strokeWidth="9" /><path d="M23 36a27 27 0 0 1 52 0" fill="none" stroke="#aaaecf" strokeWidth="4" /><rect x="12" y="45" width="20" height="32" rx="9" fill="#727fae" stroke="#555c8b" strokeWidth="3" /><rect x="68" y="45" width="20" height="32" rx="9" fill="#727fae" stroke="#555c8b" strokeWidth="3" /></g>{worn && <path d="m37 53 9 9 17-20" stroke="#53627e" strokeWidth="5" fill="none" strokeLinecap="round" />}</svg>;
}

export function RoomMosquito({ kind, perched }: { kind: string; perched: boolean }) {
  return <svg viewBox="0 0 76 76" aria-hidden="true">
    <g className="room-insect-wings" data-perched={perched} fill="#fffbf3" stroke="#5b5579" strokeWidth="1.8"><ellipse cx="25" cy="26" rx="11" ry="17" transform="rotate(-38 25 26)" /><ellipse cx="51" cy="26" rx="11" ry="17" transform="rotate(38 51 26)" /></g>
    <g stroke="#4e486a" strokeWidth="2.5" strokeLinecap="round"><path d="m27 50-12 8m14 0-9 10m30-18 12 8m-14 0 9 10M32 25l-5-12m17 12 5-12" fill="none" /><ellipse cx="38" cy="49" rx="12" ry="18" fill={kind === "hoverer" ? "#e7a16e" : "#efc565"} /><path d="M27 46h22m-20 9h18" strokeWidth="5" /><ellipse cx="38" cy="31" rx="16" ry="13" fill="#edb99c" /><path d="m53 33 12 2" /><path d="M33 38q6 4 10-1" fill="none" /></g>
    <circle cx="31" cy="29" r="2.5" fill="#493e62" /><circle cx="45" cy="29" r="2.5" fill="#493e62" />
  </svg>;
}
