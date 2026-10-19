export type BedlamLayerKind = 'nebula' | 'rings' | 'rays' | 'grain' | 'particles';
export interface BedlamPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
}
export interface BedlamConfig {
  readonly spread?: number;
  readonly persistence?: number;
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
  readonly derivedColorMix?: number;
  readonly hueRotation?: number;
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
  const derivedMix = bounded(config.derivedColorMix, 0.6);
  const hueRotation = bounded(config.hueRotation, 150, -180, 180);
  const contrastColor = (source: string, index: number) => {
    const rotation = index % 2 ? -hueRotation : hueRotation;
    const offset = index % 2 ? -0.06 : 0.06;
    const derived = `oklch(from ${source} clamp(0.38, calc(l + ${offset}), 0.76) clamp(0.055, calc(c + 0.035), 0.14) calc(h + ${rotation}))`;
    return `color-mix(in oklch, ${source}, ${derived} ${derivedMix * 100}%)`;
  };
  const intensity = bounded(config.intensity, 0.95);
  const density = bounded(config.density, 0.4);
  const symmetry = bounded(config.symmetry, 0.08);
  const turbulence = bounded(config.turbulence, 0.8);
  const opacity = bounded(config.opacity, 0.95);
  const depth = bounded(config.depth, 0.9);
  const speed = bounded(config.speed, 0.12);
  const scale = bounded(config.scale, 0.95, 0.3, 2);
  const spread = bounded(config.spread, 0.65, 0, 2);
  const persistence = bounded(config.persistence, 0.62, 0.1, 0.9);
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
    const a = contrastColor(colors[index % colors.length], index),
      b = contrastColor(colors[(index + 1) % colors.length], index + 1);
    const x = 50 + (random() - 0.5) * 85 * (1 - symmetry);
    const y = 50 + (random() - 0.5) * 70 * (1 - symmetry);
    const angle = Math.round((random() - 0.5) * 48),
      distance = kind === 'nebula' ? [0.12, 0.5, 0.9][index % 3] : 0.4 + random() * 0.6;
    const duration = 5 + (1 - distance) * 4 + random() * 3,
      phase = random();
    const gradients: Record<BedlamLayerKind, string> = {
      nebula: `radial-gradient(ellipse at 24% 18%, color-mix(in srgb, ${a} 25%, white) 0%, ${a} 9%, color-mix(in srgb, ${b} 75%, black) 34%, color-mix(in srgb, ${b} 70%, transparent) 48%, transparent 69%), radial-gradient(ellipse at 65% 75%, ${a}, transparent 65%)`,
      rings: `linear-gradient(165deg, transparent 38%, color-mix(in srgb, ${a} 20%, transparent) 46%, ${palette.accent} 48%, ${b} 49%, transparent 57%)`,
      rays: `linear-gradient(115deg, transparent 24%, ${b} 31%, ${a} 42%, ${palette.accent} 43%, ${b} 48%, transparent 68%)`,
      grain: `radial-gradient(circle at 7px 9px, ${a} 0 0.45px, transparent 0.8px), radial-gradient(circle at 19px 5px, ${b} 0 0.6px, transparent 1px)`,
      particles: `radial-gradient(circle, ${b} 0 30%, ${a} 35%, transparent 70%)`,
    };
    const secondaryOpacity =
      kind === 'nebula'
        ? distance < 0.3
          ? 0.3825
          : distance < 0.7
            ? 0.47872
            : 1
        : kind === 'grain'
          ? 0.3825
          : 0.4576;
    const style: Record<string, string> = {
      'background-image': gradients[kind],
      opacity: String(
        opacity *
          intensity *
          secondaryOpacity *
          (kind === 'grain' ? 0.18 : kind === 'rings' ? 0.22 : 0.42 + distance * 0.45),
      ),
      'mix-blend-mode': blend,
      '--bedlam-angle': `${angle}deg`,
      '--bedlam-turn': `${(index % 2 ? -1 : 1) * (2 + turbulence * 9) * distance}deg`,
      '--bedlam-scale': String(scale + distance * depth * 0.7),
      '--bedlam-travel': `${(index % 2 ? -1 : 1) * spread * (45 + distance * 55)}%`,
      '--bedlam-rise': `${(index % 3 ? 1 : -1) * spread * (35 + distance * 65)}%`,
      '--bedlam-persistence': String(persistence),
      '--bedlam-duration': `${duration / (0.25 + speed * 1.75)}s`,
      '--bedlam-delay': `${-duration / (0.25 + speed * 1.75) * phase}s`,
      '--bedlam-direction': config.direction === 'reverse' ? 'reverse' : 'normal',
      '--bedlam-blur': `${kind === 'nebula' ? (1 - distance) * depth * 7 : 0}px`,
      '--bedlam-depth': `${distance * depth * 4}px`,
      '--bedlam-noise-seed': String(Math.round(phase * 65535)),
      '--bedlam-distortion': String(12 + turbulence * 35 + distance * 15),
      '--bedlam-x': `${bounded(config.positionX, 0, -25, 25)}%`,
      '--bedlam-y': `${bounded(config.positionY, 0, -25, 25)}%`,
    };
    if (kind === 'nebula' || kind === 'rays' || kind === 'particles') {
      // Emission starts along the letter band, not at arbitrary points in the navbar.
      // Small independent forms leave open gaps; no enclosing field/fade surface.
      style['inset'] = 'auto';
      style['left'] = `${8 + (index * 23 + phase * 9) % 79}%`;
      style['top'] = `${34 + phase * 20}%`;
      style['width'] = `${(kind === 'rays' ? 10 : 15 + distance * 12) * scale}%`;
      style['height'] = `${(kind === 'rays' ? 75 : 45 + distance * 45) * scale}%`;
      style['transform-origin'] = '50% 50%';
      style['border-radius'] = '38% 66% 42% 60% / 55% 40% 68% 45%';
      style['--bedlam-peak'] = style['opacity'];
      delete style['opacity'];
    }
    if (kind === 'grain') {
      style['background-size'] = '23px 17px, 31px 29px';
      style['clip-path'] =
        'polygon(6% 48%, 24% 30%, 35% 48%, 54% 21%, 73% 38%, 91% 46%, 70% 59%, 43% 65%, 25% 54%)';
    }
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
