export interface Chatter {
  readonly x: number;
  readonly y: number;
  readonly energy: number;
}

export interface Cartridge {
  step(): void;
  draw(context: CanvasRenderingContext2D): void;
  chatter(): Chatter;
  destroy(): void;
}

export interface Algorithm {
  readonly id: string;
  create(width: number, height: number, random: () => number): Cartridge;
}

export const slots = ['A', 'B', 'C'] as const;
export type Slot = (typeof slots)[number];
export const clamp = (value: number, low = 0, high = 1): number =>
  Number.isFinite(value) ? Math.min(high, Math.max(low, value)) : low;

export function bounded(chatter: Chatter): Chatter {
  return { x: clamp(chatter.x), y: clamp(chatter.y), energy: clamp(chatter.energy) };
}

/** Partial Fisher–Yates: each ordered distinct selection is equally likely. */
export function select(pool: readonly Algorithm[], random = Math.random): Algorithm[] {
  if (pool.length < 3 || new Set(pool.map(({ id }) => id)).size !== pool.length) {
    throw new Error('BEDLAM requires at least three uniquely identified cartridges.');
  }
  const choices = [...pool];
  for (let i = 0; i < 3; i++) {
    const j =
      i + Math.min(choices.length - i - 1, Math.floor(clamp(random()) * (choices.length - i)));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices.slice(0, 3);
}

/** Presentation responsibilities depend only on slot, never cartridge identity. */
export function presentation(slot: Slot, raw: Chatter): Record<string, string> {
  const c = bounded(raw);
  const own = {
    '--layer-x': `${(c.x - 0.5) * 8}%`,
    '--layer-y': `${(c.y - 0.5) * 8}%`,
    '--layer-angle': `${(c.energy - 0.5) * 8}deg`,
    '--layer-scale': `${1.06 + c.energy * 0.06}`,
    '--layer-opacity': `${0.05 + c.energy * 0.05}`,
  };
  return {
    ...own,
    ...(slot === 'A'
      ? { '--mask-color': `hsl(${180 + c.x * 100} 65% ${78 + c.energy * 10}%)` }
      : {}),
    ...(slot === 'B' ? { '--mask-opacity': `${0.9 + c.energy * 0.1}` } : {}),
    ...(slot === 'C' ? { '--mask-depth': `${1 + c.energy * 3}px` } : {}),
  };
}
