// Presentation, not mechanics: the drawn world each game plays in (app/lives/scenes.tsx draws
// it; docs/design/games-to-leo-standard.md §3 names them) and the one-shot feedback a tap earns
// there. Pure data, so the registry can be held to it without a browser: every game has a world,
// every world has one palette block in app/styles/lives.css.

/** One scene and one palette block per world (`.lives-world[data-world=...]`). */
export const WORLDS = ["bedroom", "kitchen", "crossing", "meeting", "phone", "hall", "bathroom", "shop", "desk", "park", "living", "shed", "corridor", "pond"] as const;
export type World = (typeof WORLDS)[number];

/** What a cleared thing does on its way out: the wasp squashes, the bubble pops, the pigeon flaps off. */
export const HIT_FX = ["squash", "pop", "catch", "shred", "collect", "flyoff", "putback"] as const;
export type HitFx = (typeof HIT_FX)[number];

export const WORLD_OF: Readonly<Record<string, World>> = {
  wasps: "park",
  maya_crossing: "crossing",
  arjun_lock_in: "meeting",
  zoe_dont_send: "phone",
  mia_why_here: "living",
  pancake: "kitchen",
  leo_mosquito: "bedroom",
  theo_get_out: "hall",
  jax_just_milk: "shop",
  nina_start_small: "desk",
  zoe_keyword: "meeting",
  theo_backwards: "hall",
  mia_list: "living",
  maya_layers: "crossing",
  leo_lights_out: "bedroom",
  arjun_parking: "meeting",
  pigeons: "park",
  toast: "kitchen",
  bubbles: "park",
  spider: "shed",
  rogue_blender: "kitchen",
  office_chair: "corridor",
  maya_turn_it_down: "crossing",
  leo_one_more: "bedroom",
  arjun_hold_thread: "meeting",
  zoe_drafts: "phone",
  theo_shower: "bathroom",
  mia_the_list: "living",
  jax_checkout: "shop",
  nina_first_line: "desk",
  sneeze: "kitchen",
  ducks: "pond",
};

const FX_OF: Readonly<Record<string, HitFx>> = { wasps: "squash", bubbles: "pop", pancake: "catch", zoe_drafts: "shred", pigeons: "flyoff", jax_just_milk: "putback" };

export function worldOf(gameId: string): World {
  return WORLD_OF[gameId] ?? "living";
}

/** The exit a cleared thing takes; a plain collect where the game names nothing louder. */
export function hitFxOf(gameId: string): HitFx {
  return FX_OF[gameId] ?? "collect";
}
