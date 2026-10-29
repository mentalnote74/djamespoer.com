import { COOKIE_FLAVORS } from './cookie-trail';

export interface DanceStep {
  readonly pose: number;
  readonly x: number;
  readonly y: number;
  readonly turn: number;
}
export interface RigbyDance {
  readonly flavor: string;
  readonly name: string;
  readonly description: string;
  readonly steps: readonly DanceStep[];
}
export interface DanceRequest {
  readonly token: number;
  readonly flavor: number;
  readonly blue?: boolean;
  readonly hulking?: boolean;
}
const step = (pose: number, x = 0, y = 0, turn = 0): DanceStep => ({ pose, x, y, turn });
// Shared articulated poses with an airborne circus finale. Resting footprint stays
// 128px; transient flights are clamped to available viewport headroom by the player.
const routines = [
  [
    'Cross-paw top rock',
    'Rigby crosses his paws and rocks side to side.',
    [step(0, -10), step(1, 10), step(0, -10, -4), step(1, 10), step(3), step(0)],
  ],
  [
    'Shoulder windmill',
    'Rigby drops to his shoulder, sweeps his paws and freezes.',
    [step(2), step(4, 0, 0, -35), step(5, 0, 0, 40), step(4, 0, 0, 130), step(6), step(0)],
  ],
  [
    'Sticky shuffle',
    'Rigby shuffles, threads a paw underneath and holds a freeze.',
    [step(0, -12), step(1, -4), step(0, 12), step(7, 8), step(6, 0, -6), step(6)],
  ],
  [
    'Cookie moonwalk',
    'Rigby slides backward, plants a paw and glides home.',
    [step(9, 12), step(1, 6), step(9, -2), step(1, -10), step(9, -12), step(0)],
  ],
  [
    'Running pup',
    'Rigby pumps his paws through a running-man step.',
    [step(10, -8, -6), step(1), step(10, 8, -6), step(0), step(10, 0, -8), step(1)],
  ],
  [
    'Biscuit robot',
    'Rigby locks his paws, pivots and holds a robot pose.',
    [step(8, -8, 0, -12), step(8, -8, -8), step(1, 8, -8, 12), step(8, 8), step(3), step(8)],
  ],
  [
    'Snap and lock',
    'Rigby pops his shoulders, snaps low and locks upright.',
    [step(8, 0, -10), step(2), step(8, -10, -4, -12), step(2), step(8, 10, -4, 12), step(0)],
  ],
  [
    'Crab-paw footwork',
    'Rigby kicks sideways, switches support and scoots back.',
    [step(3, -10), step(7), step(3, 10, 0, 12), step(7, 8), step(3, -8, 0, -12), step(2)],
  ],
  [
    'Blue cookie beast',
    'Rigby hulks into his blue cookie alter ego, stomps and returns to orange.',
    [
      step(2),
      step(12, 0, 4),
      step(13, 0, -8),
      step(14, -10),
      step(15, 10),
      step(14, -8, -6),
      step(15, 8),
      step(2),
      step(0),
    ],
  ],
  [
    'Slow body wave',
    'Rigby rolls a slow wave from his shoulders to his tail.',
    [step(11, -8), step(2, -4, 4), step(9, 4), step(8, 8, -8, -8), step(11, 4), step(0)],
  ],
  [
    'Paw-supported freeze',
    'Rigby plants both front paws, lifts his hind legs and holds.',
    [step(2), step(7, -6), step(6, 0, -8, -12), step(6, 0, -8, 8), step(2), step(0)],
  ],
  [
    'Lemon six-step',
    'Rigby circles low through a six-step paw pattern.',
    [
      step(2, -10),
      step(7, -6, 6),
      step(3, 6, 6),
      step(7, 10),
      step(2, 6, -6),
      step(3, -6, -6),
      step(0),
    ],
  ],
  [
    'Rigby victory mix',
    'Rigby top-rocks, drops to the floor, spins and strikes his victory pose.',
    [
      step(0, -10),
      step(1, 10),
      step(2),
      step(4, 0, 0, -45),
      step(5, 0, 0, 80),
      step(6),
      step(10, 0, -10),
      step(0),
    ],
  ],
] as const;
export const RIGBY_DANCES: readonly RigbyDance[] = routines.map(
  ([name, description, steps], index) => ({
    flavor: COOKIE_FLAVORS[index],
    name,
    description,
    steps: [
      ...steps,
      step(10, -12, -72, index % 2 ? -180 : 180),
      step(6, 8, -112, index % 2 ? -540 : 540),
      step(3, 0, -24, index % 2 ? -720 : 720),
      step(0),
    ],
  }),
);
export const DANCE_DURATION = 3600;
export function danceEnvelope(spriteSize: number): number {
  return spriteSize * 2;
}
