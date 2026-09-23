/** Nina's evening desk, drawn in code. Decorative; the page grid and controls live in the player. */
export function Desk() {
  return <svg className="nw-desk" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <radialGradient id="nw-lamp" cx="50%" cy="58%" r="55%"><stop offset="0" stopColor="#fff4cf" /><stop offset=".55" stopColor="#f6e2a6" /><stop offset="1" stopColor="#5b5170" /></radialGradient>
    </defs>
    <rect width="600" height="700" fill="url(#nw-lamp)" />
    <rect x="40" y="40" width="170" height="150" rx="14" fill="#3f4766" />
    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <line key={i} className="nw-rain" x1={60 + i * 19} y1={52 + (i % 3) * 30} x2={56 + i * 19} y2={68 + (i % 3) * 30} stroke="#9fb0da" strokeWidth="2" strokeLinecap="round" style={{ animationDelay: `${i * .17}s` }} />)}
    <rect x="40" y="40" width="170" height="150" rx="14" fill="none" stroke="#f2e6c4" strokeWidth="8" />
    <path d="M470 60 L520 60 L540 110 L450 110 Z" fill="#f2c14e" /><rect x="492" y="110" width="6" height="90" fill="#8a7a5a" />
    <rect y="560" width="600" height="140" fill="#b98a5c" /><rect y="552" width="600" height="14" fill="#d3a676" />
    <rect x="470" y="500" width="50" height="60" rx="10" fill="#e6d3b8" /><path d="M520 516 q20 4 0 26" stroke="#e6d3b8" strokeWidth="8" fill="none" />
    <path d="M72 560 C70 520 90 506 96 480 M96 480 C80 486 70 476 70 462 M96 480 C110 470 124 474 126 486" stroke="#6f9a74" strokeWidth="7" fill="none" strokeLinecap="round" />
    <rect x="58" y="556" width="44" height="20" rx="6" fill="#c46e4e" />
  </svg>;
}

export function Blot() {
  return <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 6 C40 8 44 18 52 20 C58 30 50 36 52 46 C44 56 34 50 26 54 C16 56 12 46 8 40 C2 30 12 24 12 16 C16 6 24 10 30 6 Z" fill="#b3392c" /><circle cx="50" cy="10" r="4" fill="#b3392c" /><circle cx="8" cy="54" r="3" fill="#b3392c" /><path d="M22 26 l6 4 M38 26 l-6 4 M24 40 q6 -6 12 0" stroke="#fbe9e4" strokeWidth="3" strokeLinecap="round" fill="none" /></svg>;
}

export function Nib() {
  return <svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 4 L46 26 L38 56 H22 L14 26 Z" fill="#2d3552" /><path d="M30 18 V40" stroke="#f2c14e" strokeWidth="3" strokeLinecap="round" /><circle cx="30" cy="42" r="4" fill="#f2c14e" /></svg>;
}
