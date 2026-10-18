import type { InstrumentSkin } from './skin.model';
/** Neutral baseline uses the host theme and analog gauge geometry. */
export const WORKSHOP: InstrumentSkin = {
  id: 'workshop',
  label: 'Workshop',
  geometry: 'analog',
  tokens: {
    panel: 'var(--surface-feature)',
    face: 'var(--surface-inset)',
    ink: 'var(--page-foreground)',
    accent: 'var(--page-foreground)',
    muted: 'var(--page-foreground)',
    edge: 'var(--border-separator)',
  },
};
