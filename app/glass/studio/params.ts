// The studio's defaults (src/Controls.tsx of iyinchao/liquid-glass-studio, MIT), as the app's tokens.
// Values are the panel's own: percentages are /100 at upload, exactly as the studio's App.tsx does.
export const STUDIO = {
  refThickness: 20,
  refDistance: 0.05,
  refFactor: 1.4,
  refDispersion: 7,
  refFresnelRange: 30,
  refFresnelHardness: 20,
  refFresnelFactor: 20,
  glareRange: 30,
  glareHardness: 20,
  glareFactor: 90,
  glareConvergence: 50,
  glareOppositeFactor: 80,
  glareAngle: -45,
  blurRadius: 1,
  blurEdge: true,
  tint: { r: 255, g: 255, b: 255, a: 0 },
  shadowExpand: 30,
  shadowFactor: 7,
  shadowPosition: { x: 0, y: -10 },
  mergeRate: 0.05,
  springSizeFactor: 10,
  /** The droplet under the finger (the studio's one moving shape), and the ones a tap leaves. */
  blobSize: 56,
} as const;

/**
 * The two merges (ADHD.ME, 2026-09-11, founder: "right now it's continuous connected bubbles, it
 * should have interaction and be playable with your bubble that the tap has"). One merge rate did
 * both jobs and did neither well: at the studio's 0.05 — about a twentieth of the screen's height,
 * some forty pixels — every control within forty pixels of another fused into it, so a row of
 * buttons drew as one connected ribbon of glass and nothing a finger did changed that.
 *
 * `SHAPE` is how much two DOM surfaces melt into each other: small enough that a row reads as a
 * row of separate bubbles. `DROP` is how much a droplet melts into whatever it reaches, which is
 * the interaction — the finger's droplet joins a bubble as it crosses it and lets go after, and a
 * tap leaves a droplet that blooms out of the point it was tapped and melts away.
 */
export const MERGE = { SHAPE: 0.012, DROP: 0.075 } as const;

/** A tap's droplet: how long it lives, and how wide it opens before it goes. */
export const TAP_DROP = { ms: 620, from: 14, to: 132, max: 5 } as const;

/** The game surfaces the WebGL layer draws, inside a [data-liquid] scope only (app/styles/glass.css). */
export const GLASS_SELECTOR = [
  ".learn-stack .learn-card", ".leo-feature", ".learn-play-card", ".lives-play", ".play-tempt:not(.play-tempt-thing)", ".play-choice", ".play-hut",
  ".play-x", ".lives-choice", ".lives-row", ".learn-show-all",
].map((s) => `[data-liquid] ${s}`).join(", ");

export const MAX_SHAPES = 24;
