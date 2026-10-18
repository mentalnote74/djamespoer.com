import type { InstrumentSkin } from './skin.model';
/** Reference cockpit: dark chassis, segmented display, scanner and recessed housings. */
export const NIGHT_DRIVER: InstrumentSkin = {
  id: 'night-driver',
  label: 'Night Driver',
  geometry: 'segmented',
  tokens: {
    panel: '#171b20',
    face: '#0b0e12',
    ink: '#fff2df',
    accent: '#ff826c',
    muted: '#c5bcb2',
    edge: '#777d85',
  },
};
