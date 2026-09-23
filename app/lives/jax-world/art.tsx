/** Jax's supermarket and kitchen, drawn in code. Decorative; controls live in the player. */
const SHELF = ["#e46a5e", "#f2c14e", "#5fae8b", "#6c8cd9", "#f29a5b", "#b98bd6", "#e8e2d0"];

export function Aisle({ flicker }: { flicker: boolean }) {
  return <svg className="jw-aisle" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="600" height="700" fill="#eef1e4" />
    <path d="M0 0 H600 L352 170 H248 Z" fill="#f7f8f0" />
    {[0, 1, 2].map(i => <rect key={i} x={222 + i * 3} y={40 + i * 44} width={156 - i * 6} height="9" rx="4" fill="#fffdf2" opacity={flicker && i === 1 ? .35 : .95} />)}
    <path d="M0 700 L248 250 H352 L600 700 Z" fill="#d9ddcb" />
    {[0, 1, 2, 3, 4, 5, 6].map(i => { const y = 250 + (450 * (i / 6) ** 1.6); const w = 104 + (i / 6) ** 1.6 * 496; return <line key={i} x1={300 - w / 2} x2={300 + w / 2} y1={y} y2={y} stroke="#c9cdb9" strokeWidth={1 + i * .5} />; })}
    <line x1="300" y1="250" x2="300" y2="700" stroke="#c9cdb9" strokeWidth="2" />
    {[-1, 1].map(side => {
      // k runs from the near edge (0) to the vanishing wall (1); the wall spans 0..700 near and 170..250 far.
      const X = (k: number) => side < 0 ? 248 * k : 600 - 248 * k;
      const Y = (k: number, f: number) => 170 * k + (700 - 620 * k) * f;
      const quad = (k0: number, k1: number, f0: number, f1: number) => `M${X(k0)} ${Y(k0, f0)} L${X(k1)} ${Y(k1, f0)} L${X(k1)} ${Y(k1, f1)} L${X(k0)} ${Y(k0, f1)} Z`;
      return <g key={side}>
        <path d={quad(0, 1, 0, 1)} fill="#cfd6c0" />
        {[.12, .34, .56].map((f, r) => <g key={r}>
          {[0, .2, .38, .54, .67, .78, .87].map((k, c, all) => <path key={c} d={quad(k + .01, (all[c + 1] ?? .95) - .01, f, f + .16)} fill={SHELF[(r * 3 + c + (side > 0 ? 2 : 0)) % SHELF.length]} />)}
          <path d={quad(0, 1, f + .17, f + .19)} fill="#9aa487" />
        </g>)}
      </g>;
    })}
    <rect x="236" y="96" width="128" height="30" rx="6" fill="#e46a5e" />
    <rect x="256" y="106" width="88" height="10" rx="5" fill="#fff4ea" />
  </svg>;
}

/** One product, each drawn from a handful of shapes. */
export function Product({ id }: { id: string }) {
  const body = (() => {
    switch (id) {
      case "milk": case "oat": return <><path d="M22 24 L32 10 H56 L66 24 V86 H22 Z" fill="#fbfbf6" /><path d="M22 24 H66 L56 10 H32 Z" fill={id === "oat" ? "#e2c58b" : "#8fb4e6"} /><rect x="22" y="44" width="44" height="18" fill={id === "oat" ? "#c9a25a" : "#4f7fc6"} /></>;
      case "bread": return <><path d="M12 50 C12 26 76 26 76 50 V78 H12 Z" fill="#d99a52" /><path d="M20 46 C22 34 66 34 68 46" stroke="#f5d59c" strokeWidth="6" fill="none" strokeLinecap="round" /></>;
      case "eggs": return <><rect x="10" y="48" width="68" height="30" rx="8" fill="#c7b594" />{[22, 44, 66].map(x => <ellipse key={x} cx={x} cy="46" rx="10" ry="13" fill="#fbf4e6" />)}</>;
      case "bananas": return <><path d="M16 36 C24 76 66 80 78 58 C60 66 34 60 26 32 Z" fill="#f2d04e" /><path d="M26 30 l-6 -8" stroke="#6b5a1a" strokeWidth="5" strokeLinecap="round" /></>;
      case "rice": return <><path d="M20 28 H68 L74 84 H14 Z" fill="#f4efe0" /><rect x="20" y="46" width="48" height="20" rx="3" fill="#7fb07d" /><path d="M24 28 L30 18 H58 L64 28" fill="#e0d7bf" /></>;
      case "choc": return <><rect x="14" y="30" width="60" height="44" rx="5" fill="#7a4a2e" /><rect x="14" y="30" width="60" height="16" rx="5" fill="#e46a5e" />{[26, 44, 62].map(x => <rect key={x} x={x - 7} y="52" width="14" height="16" rx="2" fill="#5c341e" />)}</>;
      case "chips": return <><path d="M20 20 Q44 12 68 20 L64 84 Q44 90 24 84 Z" fill="#f2c14e" /><circle cx="44" cy="50" r="13" fill="#e46a5e" /></>;
      case "candle": return <><rect x="26" y="36" width="36" height="46" rx="6" fill="#e8d7f0" /><path d="M44 14 C52 24 50 32 44 34 C38 32 36 24 44 14Z" fill="#f29a5b" /><rect x="42" y="30" width="4" height="8" fill="#5b4a3a" /></>;
      case "soda": return <><rect x="30" y="14" width="28" height="70" rx="10" fill="#5fae8b" /><rect x="30" y="38" width="28" height="18" fill="#e7f5ec" /><rect x="36" y="8" width="16" height="8" rx="3" fill="#3e7b60" /></>;
      case "kayak": return <><path d="M44 12 V52" stroke="#6b6b6b" strokeWidth="4" strokeLinecap="round" /><ellipse cx="44" cy="12" rx="6" ry="10" fill="#f2c14e" /><path d="M4 62 C28 46 60 46 84 62 C60 76 28 76 4 62 Z" fill="#e46a5e" /><ellipse cx="44" cy="58" rx="12" ry="5" fill="#7a2a24" /></>;
      case "speaker": return <><rect x="22" y="14" width="44" height="70" rx="10" fill="#4f5b7a" /><circle cx="44" cy="58" r="13" fill="#2c3448" /><circle cx="44" cy="30" r="6" fill="#2c3448" /></>;
      case "bike": return <><rect x="24" y="30" width="40" height="30" rx="12" fill="#6c8cd9" /><circle cx="44" cy="45" r="9" fill="#fff6c8" /><path d="M64 45 H80" stroke="#4f5b7a" strokeWidth="6" strokeLinecap="round" /></>;
      default: return <rect x="18" y="18" width="52" height="60" rx="8" fill="#c9cdb9" />;
    }
  })();
  return <svg viewBox="0 0 88 92" aria-hidden="true">{body}</svg>;
}

export function Trolley() {
  return <svg className="jw-trolley-art" viewBox="0 0 220 150" aria-hidden="true">
    <path d="M24 28 H196 L180 104 H40 Z" fill="#dfe6ee" stroke="#7d8a99" strokeWidth="6" strokeLinejoin="round" />
    {[60, 96, 132, 168].map(x => <line key={x} x1={x} y1="30" x2={x - 6} y2="102" stroke="#9ba7b4" strokeWidth="3" />)}
    <line x1="30" y1="60" x2="190" y2="60" stroke="#9ba7b4" strokeWidth="3" />
    <rect x="8" y="12" width="204" height="14" rx="7" fill="#e46a5e" />
    <circle cx="58" cy="132" r="12" fill="#3c4450" /><circle cx="164" cy="132" r="12" fill="#3c4450" />
    <path d="M48 104 L58 124 M172 104 L164 124" stroke="#7d8a99" strokeWidth="6" strokeLinecap="round" />
  </svg>;
}

export function Kitchen() {
  return <svg className="jw-kitchen" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <rect width="600" height="700" fill="#f3efe3" />
    <rect y="470" width="600" height="230" fill="#dcd3bd" />
    <rect x="360" y="120" width="180" height="420" rx="18" fill="#e9eef1" stroke="#b9c4ca" strokeWidth="6" />
    <line x1="360" y1="280" x2="540" y2="280" stroke="#b9c4ca" strokeWidth="6" />
    <rect x="374" y="200" width="10" height="56" rx="5" fill="#9aa7ae" /><rect x="374" y="300" width="10" height="70" rx="5" fill="#9aa7ae" />
    <rect x="40" y="330" width="290" height="150" rx="10" fill="#c99a6b" />
    <rect x="40" y="316" width="290" height="22" rx="8" fill="#e8d7b6" />
    <rect x="70" y="120" width="220" height="150" rx="14" fill="#cfe0d4" />
    <path d="M70 230 C130 190 190 214 290 180 V256 a14 14 0 0 1 -14 14 H84 a14 14 0 0 1 -14 -14 Z" fill="#b7d0bf" />
    <rect x="70" y="120" width="220" height="150" rx="14" fill="none" stroke="#fffdf6" strokeWidth="10" />
  </svg>;
}
