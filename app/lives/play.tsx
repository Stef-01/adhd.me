"use client";

// The play route's client shell: reads an optional `?seed=` (a fact about the run, nothing about the
// person, §90) and mounts the Chaos Run.

import { useSearchParams } from "next/navigation";
import { ChaosRun, seedFrom } from "./run";

export function LivesPlay() {
  const params = useSearchParams();
  return <ChaosRun seed={seedFrom(params.get("seed"))} />;
}
