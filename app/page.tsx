import type { Metadata } from "next";
import { StoryLanding } from "./story-landing";

export const metadata: Metadata = {
  title: "ADHD.ME — why we founded it",
  description:
    "Why we founded ADHD.ME: getting assessed for ADHD in Australia is a test of stamina rather than of need, and the front door was built for somebody with more resources than most people have.",
};

export default function Home() {
  return <StoryLanding />;
}
