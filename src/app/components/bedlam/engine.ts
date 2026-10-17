export type BedlamLayerKind = 'nebula' | 'rings' | 'rays' | 'grain' | 'particles';
export interface BedlamPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}
export interface BedlamConfig {
  readonly intensity?: number;
  readonly density?: number;
  readonly layers?: Partial<Record<BedlamLayerKind, boolean>>;
  readonly particles?: boolean;
  readonly particleCount?: number;
  readonly symmetry?: number;
  readonly turbulence?: number;
  readonly opacity?: number;
  readonly blend?: 'normal' | 'screen' | 'overlay' | 'soft-light';
  readonly speed?: number;
  readonly direction?: 'normal' | 'reverse';
  readonly scale?: number;
  readonly positionX?: number;
  readonly positionY?: number;
  readonly depth?: number;
}
export interface BedlamLayer {
  readonly id: string;
  readonly kind: BedlamLayerKind;
  readonly style: Readonly<Record<string, string>>;
}
export const bedlamThemePalette: BedlamPalette = {
  primary: 'var(--selected-background)',
  secondary: 'var(--navigation-surface)',
  accent: 'var(--page-foreground)',
};
const bounded = (value: number | undefined, fallback: number, min = 0, max = 1) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;

/** Pure seeded recipe. Theme references cascade live; geometry has no clock or DOM. */
export function createBedlam(
  palette: BedlamPalette,
  seed: string | number,
  config: BedlamConfig = {},
): readonly BedlamLayer[] {
  const colors = [palette.primary, palette.secondary, palette.accent];
  if (
    colors.some(
      (color) =>
        !/^(?:#[\da-f]{3,8}|var\(--[a-z][a-z\d-]*\)|(?:rgb|rgba|hsl|hsla|color|oklab|oklch)\([a-z\d%., /+\-]+\))$/i.test(
          color,
        ),
    )
  )
    throw new Error('Bedlam requires colors or semantic theme references.');
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const intensity = bounded(config.intensity, 0.95);
  const density = bounded(config.density, 0.4);
  const symmetry = bounded(config.symmetry, 0.35);
  const turbulence = bounded(config.turbulence, 0.55);
  const opacity = bounded(config.opacity, 0.95);
  const depth = bounded(config.depth, 0.65);
  const speed = bounded(config.speed, 0.12);
  const scale = bounded(config.scale, 1.15, 0.7, 2);
  const blend = ['normal', 'screen', 'overlay', 'soft-light'].includes(config.blend ?? '')
    ? config.blend!
    : 'normal';
  const kinds: BedlamLayerKind[] = [
    ...Array<BedlamLayerKind>(2 + Math.round(density * 3)).fill('nebula'),
    'rings',
    'rays',
    'grain',
    ...(config.particles
      ? Array<BedlamLayerKind>(Math.round(bounded(config.particleCount, 8, 0, 24))).fill(
          'particles',
        )
      : []),
  ];
  return kinds.flatMap((kind, index) => {
    const a = colors[index % colors.length],
      b = colors[(index + 1) % colors.length];
    const x = 50 + (random() - 0.5) * 85 * (1 - symmetry);
    const y = 50 + (random() - 0.5) * 70 * (1 - symmetry);
    const angle = Math.round(random() * 360),
      distance = random();
    const duration = 30 + random() * 70,
      phase = random();
    const gradients: Record<BedlamLayerKind, string> = {
      nebula: `radial-gradient(ellipse at ${x}% ${y}%, ${a} 0%, ${b} 22%, transparent 65%)`,
      rings: `repeating-radial-gradient(ellipse at ${x}% ${y}%, transparent 0 12px, ${a} 13px 14px, ${b} 15px, transparent 17px 28px)`,
      rays: `repeating-conic-gradient(from ${angle}deg at ${x}% ${y}%, transparent 0deg 32deg, ${a} 36deg, transparent 42deg 64deg)`,
      grain: `repeating-linear-gradient(${angle}deg, transparent 0 3px, color-mix(in srgb, ${a} 20%, transparent) 4px, transparent 5px 9px)`,
      particles: `radial-gradient(circle, ${b} 0 30%, ${a} 35%, transparent 70%)`,
    };
    const style: Record<string, string> = {
      'background-image': gradients[kind],
      opacity: String(opacity * intensity * (kind === 'grain' ? 0.22 : 0.35 + distance * 0.35)),
      'mix-blend-mode': blend,
      '--bedlam-angle': `${angle}deg`,
      '--bedlam-turn': `${(index % 2 ? -1 : 1) * (8 + turbulence * 28)}deg`,
      '--bedlam-scale': String(scale + distance * depth * 0.25),
      '--bedlam-travel': `${1 + turbulence * (2 + distance * 4)}%`,
      '--bedlam-duration': `${duration / (0.25 + speed * 1.75)}s`,
      '--bedlam-delay': `${-duration * phase}s`,
      '--bedlam-direction': config.direction === 'reverse' ? 'reverse' : 'normal',
      '--bedlam-blur': `${kind === 'nebula' ? (1 - distance) * depth * 5 : 0}px`,
      '--bedlam-depth': `${distance * depth * 4}px`,
      '--bedlam-x': `${bounded(config.positionX, 0, -25, 25)}%`,
      '--bedlam-y': `${bounded(config.positionY, 0, -25, 25)}%`,
    };
    if (kind === 'particles') {
      style['inset'] = 'auto';
      style['left'] = `${x}%`;
      style['top'] = `${y}%`;
      style['width'] = style['height'] = `${2 + distance * 5}px`;
    }
    return config.layers?.[kind] === false
      ? []
      : [Object.freeze({ id: `${kind}-${index}`, kind, style: Object.freeze(style) })];
  });
}
