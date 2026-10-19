export interface BedlamPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}
export interface BedlamConfig {
  readonly enabled?: boolean;
  readonly speed?: number;
  readonly scale?: number;
  readonly variation?: number;
  readonly contrast?: number;
  readonly softness?: number;
  readonly colorInfluence?: number;
  readonly planes?: number;
}
export const bedlamThemePalette: BedlamPalette = {
  primary: 'var(--selected-background)',
  secondary: 'var(--navigation-surface)',
  accent: 'var(--page-foreground)',
};
export interface BedlamPlane {
  readonly id: number;
  readonly style: Readonly<Record<string, string>>;
}
const bound = (n: number | undefined, fallback: number, min = 0, max = 1) =>
  Number.isFinite(n) ? Math.min(max, Math.max(min, n!)) : fallback;
/** Static, seeded material tiles. Only their transforms animate; no per-frame JS or raster noise. */
export function createBedlam(
  palette: BedlamPalette,
  seed: string | number,
  config: BedlamConfig = {},
): readonly BedlamPlane[] {
  for (const color of Object.values(palette))
    if (
      !/^(?:#[\da-f]{3,8}|var\(--[a-z][a-z\d-]*\)|(?:rgb|rgba|hsl|hsla|color|oklab|oklch)\([a-z\d%., /+\-]+\))$/i.test(
        color,
      )
    )
      throw new Error('Bedlam requires colors or semantic theme references.');
  if (config.enabled === false) return [];
  let hash = 2166136261;
  for (const c of String(seed)) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  const random = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
    return (hash >>> 0) / 4294967296;
  };
  const scale = bound(config.scale, 1, 0.5, 2);
  const variation = bound(config.variation, 0.7);
  const influence = bound(config.colorInfluence, 0.7);
  const contrast = bound(config.contrast, 0.7);
  const speed = bound(config.speed, 1, 0.1, 3);
  return Array.from({ length: Math.round(bound(config.planes, 3, 1, 3)) }, (_, i) => {
    const source = [palette.primary, palette.secondary, palette.accent][i];
    const derived = `oklch(from ${source} clamp(0.58, calc(l + 0.28), 0.76) clamp(0.04, calc(c + 0.04), 0.16) calc(h + ${i % 2 ? -125 : 145}))`;
    const a = `color-mix(in oklch, ${source}, ${derived} ${influence * 100}%)`;
    const b = `oklch(from ${a} clamp(0.25, calc(l - 0.22), 0.65) c calc(h + 70))`;
    const tile = Math.round((116 + random() * 73 + i * 17) * scale);
    const pitch = (6 + random() * 7 + i * 2) * scale;
    const angle = [-23, 37, 78][i] + (random() - 0.5) * variation * 22;
    const duration = [31.73, 47.29, 68.87][i] / speed;
    return {
      id: i,
      style: {
        'background-image': `repeating-linear-gradient(90deg, transparent 0 ${pitch * 0.3}px, ${a} ${pitch * 0.42}px ${pitch * 0.64}px, transparent ${pitch * 0.8}px ${pitch * 1.7}px, ${b} ${pitch * 1.85}px ${pitch * 2.2}px, transparent ${pitch * 2.5}px ${pitch * 3.1}px), repeating-linear-gradient(${48 + variation * 37}deg, transparent 0 ${pitch}px, ${b} ${pitch * 1.2}px ${pitch * 1.6}px, transparent ${pitch * 2}px ${pitch * 3.7}px)`,
        'background-size': `${tile}px ${tile}px`,
        opacity: String(contrast * (i === 0 ? 0.85 : 0.65)),
        '--bedlam-tile': `${tile}px`,
        '--bedlam-angle': `${angle}deg`,
        '--bedlam-duration': `${duration}s`,
        '--bedlam-delay': `${-duration * random()}s`,
        '--bedlam-direction': i % 2 ? 'reverse' : 'normal',
        '--bedlam-softness': `${bound(config.softness, 0.08) * 1.5}px`,
      },
    };
  });
}
