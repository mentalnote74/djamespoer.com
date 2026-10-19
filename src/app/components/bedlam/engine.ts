export interface BedlamPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}
export interface BedlamConfig {
  readonly enabled?: boolean;
  readonly scale?: number;
  readonly strength?: number;
  readonly speed?: number;
  readonly detail?: number;
  readonly irregularity?: number;
  readonly opacity?: number;
  readonly softness?: number;
  readonly colorInfluence?: number;
}
export const bedlamThemePalette: BedlamPalette = {
  primary: 'var(--selected-background)',
  secondary: 'var(--navigation-surface)',
  accent: 'var(--page-foreground)',
};
const bound = (n: number | undefined, fallback: number, min = 0, max = 1) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n!)) : fallback;

/** A bounded, deterministic field recipe; no particles, lifetimes or frame loop. */
export function createBedlam(
  palette: BedlamPalette,
  seed: string | number,
  config: BedlamConfig = {},
) {
  for (const color of Object.values(palette)) {
    if (
      !/^(?:#[\da-f]{3,8}|var\(--[a-z][a-z\d-]*\)|(?:rgb|rgba|hsl|hsla|color|oklab|oklch)\([a-z\d%., /+\-]+\))$/i.test(
        color,
      )
    )
      throw new Error('Bedlam requires colors or semantic theme references.');
  }
  let hash = 2166136261;
  for (const c of String(seed)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const noiseSeed = (hash >>> 0) % 65521;
  const scale = bound(config.scale, 1, 0.4, 2);
  const frequency = 0.018 / scale;
  const irregularity = bound(config.irregularity, 0.65);
  const speed = bound(config.speed, 0.6);
  const pair = (x: number, y: number) =>
    `${(frequency * x).toFixed(5)} ${(frequency * y).toFixed(5)}`;
  const influence = bound(config.colorInfluence, 0.65);
  return {
    enabled: config.enabled !== false,
    noiseSeed,
    detail: Math.round(bound(config.detail, 2, 1, 3)),
    frequency: pair(1, 1.4),
    // Cache seeded textures; unequal offset clocks alter the sampled field/warp.
    // No letter geometry, object spawn, size or opacity is animated.
    fineX: `-30;${30 + irregularity * 45};-10;-30`,
    fineY: `12;${-12 - irregularity * 30};24;12`,
    coarseX: `35;-45;${10 + irregularity * 35};35`,
    fineDuration: `${(13 / (0.3 + speed)).toFixed(3)}s`,
    coarseDuration: `${(23 / (0.3 + speed)).toFixed(3)}s`,
    strength: bound(config.strength, 0.5) * 60,
    softness: bound(config.softness, 0.3) * 2.5,
    opacity: bound(config.opacity, 0.5),
    color: `color-mix(in oklch, ${palette.primary}, oklch(from ${palette.accent} clamp(0.45, calc(1 - l), 0.7) c h) ${influence * 100}%)`,
    moving: speed > 0,
  };
}
