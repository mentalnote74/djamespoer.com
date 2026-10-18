export interface InstrumentSkin {
  readonly id: 'night-driver' | 'workshop';
  readonly label: string;
  readonly geometry: 'segmented' | 'analog';
  readonly tokens: Readonly<Record<'panel' | 'face' | 'ink' | 'accent' | 'muted' | 'edge', string>>;
}
export const SKIN_OPTIONS = [
  {
    id: 'night-driver',
    label: 'Night Driver',
    load: () => import('./night-driver.skin').then((m) => m.NIGHT_DRIVER),
  },
  {
    id: 'workshop',
    label: 'Workshop',
    load: () => import('./workshop.skin').then((m) => m.WORKSHOP),
  },
] as const;
