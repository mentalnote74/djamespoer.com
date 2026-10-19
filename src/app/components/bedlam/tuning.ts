import { BedlamConfig } from './engine';

/** Operation BEANO: persistent silhouette disturbance, not emissions.
 * scale 0.4?2: larger = coarser features. All other continuous controls 0?1.
 * detail 1?3: noise octaves (mobile caps at 1). speed 0 freezes evolution.
 * reach extends the actual alpha silhouette, never a rectangular field.
 */
export const BEDLAM_TUNING: BedlamConfig = {
  enabled: true,
  scale: 0.65,
  strength: 0.4,
  speed: 0.65,
  detail: 2,
  irregularity: 0.75,
  reach: 0.1,
  opacity: 0.45,
  softness: 0.2,
  colorInfluence: 0.65,
};
