export interface InstrumentSkin {
  readonly id: 'night-driver' | 'workshop';
  readonly label: string;
  readonly geometry: 'segmented' | 'analog';
  readonly tokens: Readonly<Record<'panel' | 'face' | 'ink' | 'accent' | 'muted' | 'edge', string>>;
}
