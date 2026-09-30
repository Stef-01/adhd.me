// A clinician's Instagram reels (`Clinician.reels`): each public link held to one shape, so the
// profile embeds only a real reel or post and never an arbitrary address.

export interface Reel {
  id: string;
  /** Instagram's own embed of it, loaded only when a person taps the reel. */
  embed: string;
  /** The reel on Instagram. */
  url: string;
}

const REEL = /^https?:\/\/(?:www\.)?instagram\.com\/(?:[\w.]+\/)?(reels?|p)\/([\w-]{5,40})\/?(?:[?#].*)?$/i;

/** The reel a link names, or null when it names none. */
export function reelOf(link: string): Reel | null {
  const match = REEL.exec(link.trim());
  if (!match) return null;
  const kind = match[1]!.toLowerCase() === "p" ? "p" : "reel";
  const id = match[2]!;
  return { id, embed: `https://www.instagram.com/${kind}/${id}/embed`, url: `https://www.instagram.com/${kind}/${id}/` };
}

/** The reels among a clinician's links, each once, at most six. */
export function reelsOf(links: readonly string[] = []): Reel[] {
  const seen = new Set<string>();
  return links.flatMap((link) => reelOf(link) ?? []).filter((reel) => !seen.has(reel.id) && Boolean(seen.add(reel.id))).slice(0, 6);
}
