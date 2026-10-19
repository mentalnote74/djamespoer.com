import { BedlamConfig } from './engine';

// Static material, continuously sampled under the canonical alpha mask.
// All controls are per-instance overridable. No emissions, objects or SVG filters.
export const BEDLAM_SEED: string | number = 'bedlam-material-01';
export const BEDLAM_TUNING: BedlamConfig = {
  enabled: true, // false = clean static identity.
  speed: 1.4, // 0.1-3: higher = faster constant travel; no easing or dwell.
  scale: 0.85, // 0.5-2: higher = larger/coarser material detail.
  variation: 0.8, // 0-1: increases crossing-angle/pattern variation (not frame randomness).
  contrast: 0.85, // 0-1: visibility of the material over the readable base.
  softness: 0.05, // 0-1: small static blur; higher = softer edges.
  colorInfluence: 0.85, // 0-1: original theme colors -> derived contrasting colors.
  planes: 3, // 1-3; mobile capped at 2. More asynchronous planes increases complexity/cost.
};
