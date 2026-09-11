"use client";

// The play route's client shell: reads an optional `?seed=` (a fact about the run, nothing about the
// person, §90) and mounts the Chaos Run.

import { useSearchParams } from "next/navigation";
import { ChaosRun, seedFrom } from "./run";

export function LivesPlay() {
  const params = useSearchParams();
  return <ChaosRun seed={seedFrom(params.get("seed"))} />;
}

/** The lab's one-game run (§106–§107): `?game=` names the game, for QA captures and a designer's eye. */
export function LivesLabPlay() {
  const params = useSearchParams();
  const game = (params.get("game") ?? "").replace(/[^a-z_]/g, "").slice(0, 40);
  return <ChaosRun seed={seedFrom(params.get("seed"))} only={game || undefined} />;
}
