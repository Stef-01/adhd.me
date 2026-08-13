import type { Metadata } from "next";
import { CareFinder } from "../care-finder";

export const metadata: Metadata = {
  title: "Early clinician finder demo — Meherr",
  description: "A synthetic demonstration of culturally aware clinician matching for PMOS, formerly PCOS.",
};

export default function FinderPage() {
  return <CareFinder />;
}
