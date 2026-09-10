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
  /** The pointer blob (the studio's one moving shape): a small circle, on hover devices only. */
  blobSize: 56,
} as const;

/** The game surfaces the WebGL layer draws, inside a [data-liquid] scope only (app/styles/glass.css). */
export const GLASS_SELECTOR = [
  ".learn-stack .learn-card", ".leo-feature", ".learn-play-card", ".lives-play", ".play-tempt", ".play-choice", ".play-hut",
  ".play-x", ".lives-choice", ".lives-row", ".learn-show-all",
].map((s) => `[data-liquid] ${s}`).join(", ");

export const MAX_SHAPES = 24;
