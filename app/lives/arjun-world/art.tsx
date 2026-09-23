/** Arjun's meeting room: code-native scenery, decorative only (the stage owns every control). */
export function MeetingRoom({ minutes }: { minutes: number }) {
  const hand = (1 - minutes) * 360;
  return <svg className="aw-backdrop" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="1200" height="700" fill="#dfe3f6" />
    <rect y="0" width="1200" height="380" fill="#e7eaf8" />
    <rect x="80" y="54" width="250" height="176" rx="18" fill="#c4d7f1" />
    <path d="M80 190 C150 150 200 176 260 150 S330 150 330 150 V212 a18 18 0 0 1 -18 18 H98 a18 18 0 0 1 -18 -18Z" fill="#b0c8e8" />
    <rect x="80" y="54" width="250" height="176" rx="18" fill="none" stroke="#f7f8fd" strokeWidth="12" />
    <line x1="205" y1="54" x2="205" y2="230" stroke="#f7f8fd" strokeWidth="8" />
    <circle cx="276" cy="100" r="18" fill="#f7e2a3" />
    <g transform="translate(1030 122)">
      <circle r="52" fill="#fbfbfe" stroke="#c9cfea" strokeWidth="8" />
      {[0, 90, 180, 270].map(a => <rect key={a} x="-2" y="-44" width="4" height="10" rx="2" fill="#9aa3c9" transform={`rotate(${a})`} />)}
      <rect x="-3" y="-34" width="6" height="34" rx="3" fill="#3b4a8f" transform={`rotate(${hand})`} />
      <circle r="6" fill="#3b4a8f" />
    </g>
    <g transform="translate(880 210)">
      <rect x="-26" y="44" width="52" height="56" rx="10" fill="#d58f6e" />
      <path d="M0 48 C-40 10 -44 -30 -20 -54 C-8 -20 -4 10 0 48Z" fill="#7ea38d" />
      <path d="M0 48 C34 6 50 -26 34 -56 C16 -24 6 10 0 48Z" fill="#94b8a1" />
    </g>
    <rect y="372" width="1200" height="10" fill="#d0d5ef" />
  </svg>;
}

/** The table's near edge sits in front of the seated cast and behind Arjun. */
export function TableTop() {
  return <svg className="aw-tabletop" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
    <path d="M110 30 H1090 L1190 250 H10 Z" fill="#b9c3ea" />
    <path d="M10 250 H1190 V290 H10 Z" fill="#9ea9d9" />
    <path d="M110 30 H1090 L1106 64 H94 Z" fill="#c9d1f1" />
    <g opacity=".95">
      <rect x="250" y="96" width="120" height="84" rx="8" fill="#fbfbfe" transform="rotate(-8 310 138)" />
      <rect x="270" y="116" width="70" height="8" rx="4" fill="#d6dbf1" transform="rotate(-8 310 138)" />
      <rect x="270" y="136" width="54" height="8" rx="4" fill="#d6dbf1" transform="rotate(-8 310 138)" />
      <ellipse cx="560" cy="150" rx="36" ry="12" fill="#8e99cc" />
      <rect x="532" y="104" width="56" height="46" rx="10" fill="#f4f1ea" />
      <path d="M588 114 q22 4 0 26" stroke="#f4f1ea" strokeWidth="9" fill="none" />
      <rect x="760" y="92" width="170" height="104" rx="10" fill="#4d5b9c" transform="skewX(-10)" />
      <rect x="772" y="102" width="146" height="84" rx="6" fill="#dbe4fb" transform="skewX(-10)" />
      <rect x="960" y="150" width="60" height="44" rx="8" fill="#f6dd8f" transform="rotate(10 990 172)" />
    </g>
  </svg>;
}
