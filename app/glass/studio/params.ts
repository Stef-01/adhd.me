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

/** Every glass surface the CSS layer paints (app/styles/glass.css) is a shape the WebGL layer draws. */
export const GLASS_SELECTOR = [
  ".app-tabs", ".settings-trigger", ".play-hut", ".play-x", ".play-choice", ".play-tempt", ".play-bean-label", ".play-chip-big",
  ".filter-chip", ".filter-clear", ".adjust-tab", ".manual-chip", ".layer-pill", ".learn-map-link", ".learn-chip",
  ".learn-secondary", ".learn-primary", ".learn-back", ".primary-button", ".nearby-zoom-button", ".speech-retry",
  ".life-card", ".learn-card", ".clinician-row", ".results-empty", ".support-step", ".profession-card", ".strategy-card",
  ".learn-option", ".me-switches", ".consent-dialog", ".sheet",
].join(", ");

export const MAX_SHAPES = 24;
