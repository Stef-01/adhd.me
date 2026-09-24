/** Maya's concourse pieces, drawn in code. Decorative; the grid and controls live in the player. */
const HEADS = ["#e46a5e", "#6c8cd9", "#f2c14e", "#5fae8b", "#b98bd6", "#f29a5b"];

export function Crowd({ seed }: { seed: number }) {
  return <svg viewBox="0 0 140 60" aria-hidden="true">
    {[0, 1, 2, 3].map(i => { const x = 18 + i * 32 + ((seed + i) % 2) * 6, y = 22 + ((seed * 3 + i) % 3) * 8;
      return <g key={i} className="mw-walker" style={{ animationDelay: `${(i * .13 + seed * .07) % .5}s` }}>
        <ellipse cx={x} cy={y + 16} rx="15" ry="7" fill="#00000018" />
        <circle cx={x} cy={y} r="15" fill={HEADS[(seed + i) % HEADS.length]} />
        <circle cx={x - 4} cy={y - 2} r="2" fill="#26304a" /><circle cx={x + 4} cy={y - 2} r="2" fill="#26304a" />
      </g>; })}
  </svg>;
}

export function Bench() {
  return <svg viewBox="0 0 80 50" aria-hidden="true"><rect x="6" y="14" width="68" height="14" rx="5" fill="#b98a5c" /><rect x="6" y="30" width="68" height="8" rx="4" fill="#9a6f46" /><rect x="12" y="38" width="6" height="10" rx="2" fill="#6b4c30" /><rect x="62" y="38" width="6" height="10" rx="2" fill="#6b4c30" /></svg>;
}

export function Speaker() {
  return <svg viewBox="0 0 60 60" aria-hidden="true"><rect x="12" y="20" width="12" height="20" rx="3" fill="#4f5b7a" /><path d="M24 20 L42 8 V52 L24 40 Z" fill="#6c7aa0" /><rect x="10" y="44" width="4" height="12" fill="#4f5b7a" /></svg>;
}

export function Gate({ open }: { open: boolean }) {
  return <svg viewBox="0 0 80 60" aria-hidden="true"><rect x="4" y="10" width="72" height="44" rx="10" fill={open ? "#5fae8b" : "#9aa3bd"} /><path d="M26 32 H54 M44 22 L54 32 L44 42" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>;
}

export function Queue() {
  return <svg viewBox="0 0 80 60" aria-hidden="true">{[0, 1, 2].map(i => <circle key={i} cx={18 + i * 22} cy={30} r="11" fill={HEADS[(i + 2) % HEADS.length]} opacity=".9" />)}<rect x="4" y="46" width="72" height="6" rx="3" fill="#c8513f" /></svg>;
}
