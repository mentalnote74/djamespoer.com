import { BedlamConfig } from './engine';

/** Navbar recipe knobs. Instances can override any value through their config input.
 * speed: higher = shorter cycles; spread: lateral travel; verticalSpread: independent vertical travel;
 * scale: emitted feature size; persistence: tail strength during each outward fade.
 * Opacity/intensity change appearance; density/layer switches change actual work.
 */
export const BEDLAM_TUNING: BedlamConfig = {
  speed: 0.7,
  intensity: 0.85,
  density: 1,
  spread: 0.85,
  verticalSpread: 0.06,
  scale: 0.3,
  opacity: 0.28,
  persistence: 0.1,
  turbulence: 0.8,
  depth: 1,
  symmetry: 0.08,
  derivedColorMix: 0.6,
  hueRotation: 150,
  particles: false,
  particleCount: 0,
  // Recruiter-safe production fallback. Keep the recipe above for later tuning;
  // disable procedural work rather than leaving invisible animated/filter layers.
  layers: { nebula: false, rings: false, rays: false, grain: false, particles: false },
};
