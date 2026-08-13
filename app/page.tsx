import type { Metadata } from "next";
import { StoryLanding } from "./story-landing";

export const metadata: Metadata = {
  title: "ADHD.ME — why I founded it",
  description:
    "The story of why Narayani founded ADHD.ME: a community program helping South Asian women in Western Sydney recognise PMOS, the condition long known as PCOS, earlier.",
};

export default function Home() {
  return <StoryLanding />;
}
