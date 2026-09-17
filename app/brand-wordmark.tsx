// The mark, as the reference draws it: ADHD small and letter-spaced over "me", the warm-red point
// after it. Decorative inside a link that carries the product's name as its accessible name, so
// a screen reader still hears "ADHD.ME" and every spec that names the link keeps matching.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className ? `brand-mark ${className}` : "brand-mark"} aria-hidden="true" translate="no">
      <span className="brand-mark-top">ADHD</span>
      <span className="brand-mark-me">
        me
        <span className="brand-mark-dot" />
      </span>
    </span>
  );
}
