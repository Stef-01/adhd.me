"use client";

// One line in each character game: when its state reaches the end, the Learn list gets a tick.
import { useEffect, useState } from "react";
import { deviceLearningStorage } from "@/learn/cursor";
import { emptyPlayed, markPlayed, readPlayed, type Played } from "@/learn/played";
import type { CharacterId } from "@/lives/types";

export function usePlayedWhen(who: CharacterId, ended: boolean): void {
  useEffect(() => {
    if (ended) markPlayed(deviceLearningStorage, who);
  }, [who, ended]);
}

/** Which character games have been played, kept in step with every write on this device. */
export function usePlayed(): Played {
  const [played, setPlayed] = useState<Played>(emptyPlayed);
  useEffect(() => {
    const sync = () => setPlayed(readPlayed(deviceLearningStorage));
    sync();
    window.addEventListener("adhdme:personalisation", sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("adhdme:personalisation", sync); window.removeEventListener("storage", sync); };
  }, []);
  return played;
}
