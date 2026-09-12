import type { Metadata } from "next";
import { ROBOTS_META } from "@/security/robots";
import { MyMap } from "../../my-map";

// Your map (founder, 2026-09-11): the nine wellness dimensions as a shape that grows with what you
// do. Device-local, like everything in My ADHD — src/wellness/map.ts holds the rules and the reason
// the rungs are words rather than a score.
export const metadata: Metadata = {
  alternates: { canonical: "/my-map" },
  robots: ROBOTS_META,
  title: "Your map",
  description: "The nine dimensions of a life with ADHD as one shape: what you have named, explored, kept and found working, and the kinds of care each one opens.",
};

export default function MyMapPage() {
  return <MyMap />;
}
