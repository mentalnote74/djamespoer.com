import { BedlamConfig } from './engine';

// Restored from 909072dbb5471198d253031c8eb526b6e99b8736 (pre-emission).
// Values below reproduce that recipe. No artistic tuning has been applied.
// Full handle/interaction table: docs/bedlam-pre-fart-tuning.md.
export const BEDLAM_SEED: string | number = 'djamespoer-header'; // any string/number: different repeatable layout, not more/less.
export const BEDLAM_TUNING: BedlamConfig = {
  scale: 0.95, // 0.7-2: higher/lower = larger/smaller transformed forms; depth also adds scale.
  density: 0.4, // 0-1: higher/lower = 2-5 nebulae in steps; affects overlap and cost, not other layers.
  speed: 0.12, // 0-1: higher/lower = faster/slower; 0 pauses. Also see motionRate.
  motionRate: 1.44, // 0.25-4: higher/lower = faster/slower CSS playback; restored existing divisor.
  horizontalTravel: 1, // 0-4: higher/lower = farther/shorter horizontal travel; turbulence sets its base.
  verticalTravel: 1, // 0-4: higher/lower = farther/shorter vertical travel; depth slot sets its base.
  opacity: 0.95, // 0-1: higher/lower = stronger/fainter layers; multiplies intensity and sceneOpacity.
  intensity: 0.95, // 0-1: same visibility multiplier as opacity; does not add motion or work.
  sceneOpacity: 0.72, // 0-1: higher/lower = stronger/fainter whole procedural composition.
  blur: 7, // 0-20 SVG/CSS blur factor: higher/lower = softer/sharper nebulae; multiplied by depth/distance.
  turbulence: 0.8, // 0-1: higher/lower = stronger/weaker static distortion, rotation and horizontal travel.
  depth: 0.9, // 0-1: higher/lower = more/less scale, blur and shadow separation between fixed depth slots.
  symmetry: 0.08, // 0-1: higher/lower = more centered/more scattered form positions, not mirrored pairs.
  derivedColorMix: 0.6, // 0-1: higher/lower = more derived contrast color/more original theme color.
  hueRotation: 150, // -180..180 degrees: changes derived hue offsets, not saturation; 0 reduces hue shift.
  blend: 'normal', // normal | screen | overlay | soft-light; mode, no numeric increase/decrease.
  direction: 'normal', // normal | reverse: reverses playback; does not create ping-pong motion.
  positionX: 0, // -25..25%: right/left base transform; animated transforms overwrite it while running.
  positionY: 0, // -25..25%: down/up base transform; animated transforms overwrite it while running.
  particles: false, // true/false enables/removes optional dots (mobile always removes them).
  particleCount: 8, // 0-24 rounded: more/fewer dots, only when particles and its layer are enabled.
  layers: { nebula: true, rings: true, rays: true, grain: true, particles: true }, // false removes work, not merely visibility.
};
