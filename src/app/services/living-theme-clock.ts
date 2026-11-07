/** Theme order and time only. Shared by the lazy renderer and first-paint selection. */
export const livingAnchors = [
  'tequila-sunset',
  'rum-runner',
  'bloody-mary',
  'tequila-sunrise',
  'mojito',
  'pina-colada',
  'mai-tai',
] as const;
export type LivingAnchor = (typeof livingAnchors)[number];
export const livingTiming = { interpolationMs: 24_000, wipeMs: 400, atmosphereRatio: 1.65 };
export interface LivingThemeClock {
  elapsed: () => number;
  refreshMs?: number;
}
export function livingFrame(elapsed: number, timing: { interpolationMs: number; wipeMs: number; atmosphereRatio?: number } = livingTiming) {
  if (
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    !Number.isFinite(timing.interpolationMs) ||
    timing.interpolationMs <= 0 ||
    !Number.isFinite(timing.wipeMs) ||
    timing.wipeMs <= 0
  )
    throw Error('Invalid living theme timing');
  const atmosphereRatio = timing.atmosphereRatio ?? 1;
  if (!Number.isFinite(atmosphereRatio) || atmosphereRatio < 1) throw Error('Invalid atmospheric timing');
  const cycleMs = (3 + 2 * atmosphereRatio) * timing.interpolationMs + 2 * timing.wipeMs;
  let remaining = elapsed % cycleMs;
  for (let index = 0; index < livingAnchors.length; index++) {
    const wipe = index === 0 ? 'sunset' : index === 2 ? 'sunrise' : null;
    const duration = wipe ? timing.wipeMs : timing.interpolationMs * (index === 3 || index === 6 ? atmosphereRatio : 1);
    if (remaining < duration)
      return {
        from: livingAnchors[index],
        to: livingAnchors[(index + 1) % livingAnchors.length],
        progress: remaining / duration,
        wipe,
        remainingMs: duration - remaining,
        cycleMs,
      };
    remaining -= duration;
  }
  throw Error('Unreachable living theme frame');
}
/** Browser-local wall time chooses the entry phase, then the short cycle runs normally. */
export function livingLocalElapsed(date: Date, timing: { interpolationMs: number; wipeMs: number; atmosphereRatio?: number } = livingTiming): number {
  const hour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  if (!Number.isFinite(hour)) throw Error('Invalid local time');
  const span = timing.interpolationMs,
    wipe = timing.wipeMs,
    atmosphere = span * (timing.atmosphereRatio ?? 1);
  if (hour < 6 || hour >= 18) return wipe + (((hour + 6) % 24) / 12) * span;
  const sunrise = span + 2 * wipe;
  if (hour < 10) return sunrise + ((hour - 6) / 4) * atmosphere;
  if (hour < 13) return sunrise + atmosphere + ((hour - 10) / 3) * span;
  if (hour < 16) return sunrise + atmosphere + span + ((hour - 13) / 3) * span;
  return sunrise + atmosphere + 2 * span + ((hour - 16) / 2) * atmosphere;
}

export const SUNRISE_STREAK_LEAD_MS = 1600;
export const SUNRISE_STREAK_DURATION_MS = 1400;
/** One streak ends just before the night-to-sunrise wipe; other phases have none. */
export function sunriseStreakProgress(frame: ReturnType<typeof livingFrame>): number {
  if (frame.from !== 'rum-runner' || frame.wipe) return 0;
  const phaseMs = frame.remainingMs / (1 - frame.progress);
  const lead = Math.min(SUNRISE_STREAK_LEAD_MS, phaseMs * 0.8);
  const duration = (lead * SUNRISE_STREAK_DURATION_MS) / SUNRISE_STREAK_LEAD_MS;
  return Math.max(0, Math.min(1, (lead - frame.remainingMs) / duration));
}

/** A long faint passage and one short counter-travel near its end; quiet between visits. */
export function nightPassage(seconds: number) {
  const phase = ((seconds % 43.7) + 43.7) % 43.7;
  return {
    comet: phase < 21 ? phase / 21 : null,
    shooting: phase >= 17.8 && phase < 19.2 ? (phase - 17.8) / 1.4 : null,
  };
}
