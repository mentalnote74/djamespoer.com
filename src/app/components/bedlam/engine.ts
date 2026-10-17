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
  const symmetry = bounded(config.symmetry, 0.08);
  const turbulence = bounded(config.turbulence, 0.8);
  const opacity = bounded(config.opacity, 0.95);
  const depth = bounded(config.depth, 0.9);
  const speed = bounded(config.speed, 0.12);
  const scale = bounded(config.scale, 0.95, 0.7, 2);
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
    const angle = Math.round((random() - 0.5) * 48),
      distance = kind === 'nebula' ? [0.12, 0.5, 0.9][index % 3] : 0.4 + random() * 0.6;
    const duration = 22 + (1 - distance) * 55 + random() * 15,
      phase = random();
    const gradients: Record<BedlamLayerKind, string> = {
      nebula: `radial-gradient(ellipse at 24% 18%, color-mix(in srgb, ${a} 25%, white) 0%, ${a} 9%, color-mix(in srgb, ${b} 75%, black) 34%, color-mix(in srgb, ${b} 70%, transparent) 48%, transparent 69%), radial-gradient(ellipse at 65% 75%, ${a}, transparent 65%)`,
      rings: `linear-gradient(165deg, transparent 38%, color-mix(in srgb, ${a} 20%, transparent) 46%, ${palette.accent} 48%, ${b} 49%, transparent 57%)`,
      rays: `linear-gradient(115deg, transparent 24%, ${b} 31%, ${a} 42%, ${palette.accent} 43%, ${b} 48%, transparent 68%)`,
      grain: `radial-gradient(circle at 7px 9px, ${a} 0 0.45px, transparent 0.8px), radial-gradient(circle at 19px 5px, ${b} 0 0.6px, transparent 1px)`,
      particles: `radial-gradient(circle, ${b} 0 30%, ${a} 35%, transparent 70%)`,
    };
    const style: Record<string, string> = {
      'background-image': gradients[kind],
      opacity: String(
        opacity *
          intensity *
          (kind === 'grain' ? 0.18 : kind === 'rings' ? 0.22 : 0.42 + distance * 0.45),
      ),
      'mix-blend-mode': blend,
      '--bedlam-angle': `${angle}deg`,
      '--bedlam-turn': `${(index % 2 ? -1 : 1) * (2 + turbulence * 9) * distance}deg`,
      '--bedlam-scale': String(scale + distance * depth * 0.7),
      '--bedlam-travel': `${(index % 2 ? -1 : 1) * (0.5 + turbulence * distance * 10)}%`,
      '--bedlam-rise': `${(index % 3 ? 1 : -1) * (0.3 + distance * 5)}%`,
      '--bedlam-duration': `${duration / (0.25 + speed * 1.75)}s`,
      '--bedlam-delay': `${-duration * phase}s`,
      '--bedlam-direction': config.direction === 'reverse' ? 'reverse' : 'normal',
      '--bedlam-blur': `${kind === 'nebula' ? (1 - distance) * depth * 7 : 0}px`,
      '--bedlam-depth': `${distance * depth * 4}px`,
      '--bedlam-noise-seed': String(Math.round(phase * 65535)),
      '--bedlam-distortion': String(12 + turbulence * 35 + distance * 15),
      '--bedlam-x': `${bounded(config.positionX, 0, -25, 25)}%`,
      '--bedlam-y': `${bounded(config.positionY, 0, -25, 25)}%`,
    };
    if (kind === 'nebula') {
      style['inset'] = 'auto';
      style['left'] = `${x - (distance < 0.3 ? 65 : distance < 0.7 ? 30 : 8)}%`;
      style['top'] = `${y - (distance < 0.3 ? 100 : 55)}%`;
      style['width'] = `${distance < 0.3 ? 145 : distance < 0.7 ? 90 : 28}%`;
      style['height'] = `${distance < 0.3 ? 230 : distance < 0.7 ? 200 : 105}%`;
      style['border-radius'] = '38% 66% 42% 60% / 55% 40% 68% 45%';
    }
    if (kind === 'rays') {
      style['inset'] = 'auto';
      style['left'] = `${x}%`;
      style['top'] = `${y - 70}%`;
      style['width'] = '34%';
      style['height'] = '170%';
      style['clip-path'] =
        'polygon(0 68%, 22% 42%, 36% 51%, 65% 7%, 57% 49%, 100% 62%, 53% 71%, 35% 100%, 24% 73%)';
    }
    if (kind === 'grain') style['background-size'] = '23px 17px, 31px 29px';
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
