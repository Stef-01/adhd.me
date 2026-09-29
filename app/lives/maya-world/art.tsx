/** Maya's concourse pieces, drawn in code. Decorative; the grid and controls live in the player. */
const HEADS = ["#e46a5e", "#6c8cd9", "#f2c14e", "#5fae8b", "#b98bd6", "#f29a5b"];

export function Queue() {
  return <svg viewBox="0 0 80 60" aria-hidden="true">{[0, 1, 2].map(i => <circle key={i} cx={18 + i * 22} cy={30} r="11" fill={HEADS[(i + 2) % HEADS.length]} opacity=".9" />)}<rect x="4" y="46" width="72" height="6" rx="3" fill="#c8513f" /></svg>;
}
