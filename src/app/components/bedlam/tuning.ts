import { BedlamConfig } from './engine';

/** Operation BEANO: a continuous field viewed through the canonical mask.
 * scale 0.4-2: larger = coarser features. All other continuous controls 0-1.
 * detail 1-3: noise octaves (mobile caps at 1). speed 0 freezes evolution.
 * strength warps the field only; the wordmark never deforms.
 */
export const BEDLAM_TUNING: BedlamConfig = {
  enabled: true,
  scale: 1.5,
  strength: 0.65,
  speed: 0.65,
  detail: 1,
  irregularity: 0.75,
  opacity: 0.8,
  softness: 0.08,
  colorInfluence: 0.85,
};
