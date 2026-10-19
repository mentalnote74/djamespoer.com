import { BedlamConfig } from './engine';

/** Navbar recipe knobs. Instances can override any value through their config input.
 * speed: higher = shorter cycles; spread: outward travel in wordmark widths;
 * scale: emitted feature size; persistence: tail strength during each outward fade.
 * Opacity/intensity change appearance; density/layer switches change actual work.
 */
export const BEDLAM_TUNING: BedlamConfig = {
  speed: 0.7,
  intensity: 0.85,
  density: 0.4,
  spread: 0.65,
  scale: 0.8,
  opacity: 0.8,
  persistence: 0.62,
  turbulence: 0.8,
  depth: 0.9,
  symmetry: 0.08,
  derivedColorMix: 0.6,
  hueRotation: 150,
  particles: false,
  particleCount: 0,
  layers: { rings: false, grain: false },
};
