"use client";

// A clinician's Instagram reels, under Background on the profile. Nothing loads from Instagram until
// a person taps a reel: each is a plain tile until then, so opening a profile sends nobody's visit to
// a third party. A tapped reel plays in Instagram's own embed, one at a time.

import { ArrowUpRight, Play } from "@phosphor-icons/react";
import { useState } from "react";
import type { Reel } from "@/finder/reels";

export function ProfileReels({ reels, name }: { reels: readonly Reel[]; name: string }) {
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <ul className="profile-reels">
      {reels.map((reel, index) => (
        <li key={reel.id}>
          {playing === reel.id ? (
            <>
              <iframe
                className="profile-reel-frame"
                src={reel.embed}
                title={`${name}'s reel ${index + 1} on Instagram`}
                loading="lazy"
                allow="encrypted-media; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              />
              <a className="profile-reel-open" href={reel.url} target="_blank" rel="noopener noreferrer">
                Open on Instagram
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </a>
            </>
          ) : (
            <button type="button" className="profile-reel-tile" onClick={() => setPlaying(reel.id)} aria-label={`Play ${name}'s reel ${index + 1}`}>
              <span className="profile-reel-play">
                <Play size={20} weight="fill" aria-hidden="true" />
              </span>
              <span className="profile-reel-label">Reel {index + 1}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
