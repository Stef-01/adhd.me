import type { Metadata } from "next";
import { StoryLanding } from "./story-landing";

export const metadata: Metadata = {
  title: "Meherr — why I founded it",
  description:
    "The story of why Narayani founded Meherr: a community program helping South Asian women in Western Sydney recognise PMOS, the condition long known as PCOS, earlier.",
};

export default function Home() {
  return <StoryLanding />;
}
