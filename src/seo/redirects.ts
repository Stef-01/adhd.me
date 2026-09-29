// The addresses that answer with a redirect, read by next.config.ts to issue them and by the sitemap
// so it never names one. Config redirects rather than pages that redirect: a page inside a
// `loading.tsx` boundary streams a 200 and navigates after load, while these are real 3xx answers
// issued before any HTML is written.
export const REDIRECTS = [
  // O230: the finder moved to `/`; the address kept its meaning. Permanent, because the move is.
  { source: "/finder", destination: "/", permanent: true },
  // The Lives library folded into the Learn tab (Phase T): without a module the page has nothing to
  // show, and a page-level redirect raced the next navigation in the footer sweep.
  { source: "/lives/learn", destination: "/approach?pane=modules", permanent: false, missing: [{ type: "query" as const, key: "module" }] },
];
