/** Timing/state only; palette values remain authored in Sass. */
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
export const livingTiming = { interpolationMs: 48 * 60 * 1000, wipeMs: 400 };
export function livingFrame(elapsed: number, timing = livingTiming) {
  if (
    !Number.isFinite(elapsed) ||
    elapsed < 0 ||
    !Number.isFinite(timing.interpolationMs) ||
    timing.interpolationMs <= 0 ||
    !Number.isFinite(timing.wipeMs) ||
    timing.wipeMs <= 0
  )
    throw new Error('Invalid living theme timing');
  const cycleMs = 5 * timing.interpolationMs + 2 * timing.wipeMs;
  let remaining = elapsed % cycleMs;
  for (let index = 0; index < livingAnchors.length; index++) {
    const wipe = index === 0 ? 'sunset' : index === 2 ? 'sunrise' : null;
    const duration = wipe ? timing.wipeMs : timing.interpolationMs;
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
  throw new Error('Unreachable living theme frame');
}

type Palette = Record<string, string>;
const lightingRoles = new Set([
  '--shadow-x',
  '--shadow-y',
  '--shadow-blur',
  '--shadow-spread',
  '--shadow-opacity',
]);
function interpolateLighting(from: string, to: string, progress: number) {
  const a = /^(-?[\d.]+)(px)?$/.exec(from),
    b = /^(-?[\d.]+)(px)?$/.exec(to);
  if (!a || !b || a[2] !== b[2]) return from;
  return String(Number(a[1]) + (Number(b[1]) - Number(a[1])) * progress) + (a[2] ?? '');
}
function color(value: string): number[] | null {
  const hex = value.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (hex)
    return (hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex)
      .match(/../g)!
      .map((v) => parseInt(v, 16));
  const rgb = value.trim().match(/^rgb\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)\s*\)$/);
  return rgb ? rgb.slice(1).map(Number) : null;
}
export function interpolatePalette(from: Palette, to: Palette, progress: number): Palette {
  if (progress < 0 || progress > 1 || !Number.isFinite(progress))
    throw new Error('Invalid palette progress');
  return Object.fromEntries(
    Object.entries(from).map(([role, value]) => {
      if (lightingRoles.has(role))
        return [role, interpolateLighting(value, to[role] ?? value, progress)];
      const a = color(value),
        b = color(to[role] ?? '');
      return [
        role,
        a && b ? `rgb(${a.map((v, i) => v + (b[i] - v) * progress).join(', ')})` : value,
      ];
    }),
  );
}

/** Progressive enhancement; native snapshots never clone accessible DOM. */
export function startLivingTheme(document: Document, timing = livingTiming): () => void {
  livingFrame(0, timing);
  const root = document.documentElement;
  const window = document.defaultView!;
  const original = root.getAttribute('data-theme')!;
  // Read generated scopes synchronously before the browser can paint. No duplicate
  // authored palette or runtime request is needed.
  const palettes = {} as Record<LivingAnchor, Palette>;
  let roles: string[] = [];
  for (const anchor of livingAnchors) {
    root.setAttribute('data-theme', anchor);
    const styles = window.getComputedStyle(root);
    if (!roles.length)
      roles = Array.from(styles).filter(
        (role) =>
          role.startsWith('--') &&
          (color(styles.getPropertyValue(role)) !== null ||
            role === '--disabled-opacity' ||
            lightingRoles.has(role)),
      );
    palettes[anchor] = Object.fromEntries(
      roles.map((role) => [role, styles.getPropertyValue(role).trim()]),
    );
  }
  root.setAttribute('data-theme', original);
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const started = window.performance.now();
  let timer = 0,
    stopped = false,
    transition: ViewTransition | undefined;
  let lastTarget: LivingAnchor | undefined;
  const clearTokens = () => roles.forEach((role) => root.style.removeProperty(role));
  const applyAnchor = (anchor: LivingAnchor) => {
    clearTokens();
    root.setAttribute('data-theme', anchor);
  };
  const tick = () => {
    if (stopped) return;
    const elapsed = window.performance.now() - started;
    const frame = livingFrame(elapsed, timing);
    if (transition) return;
    // The selected cycle begins at dusk, including a controlled exact t=0.
    if (elapsed === 0) {
      applyAnchor(livingAnchors[0]);
      lastTarget = livingAnchors[0];
      timer = window.setTimeout(tick, 1);
      return;
    }
    if (
      frame.wipe &&
      (lastTarget === frame.from || lastTarget === undefined) &&
      !motion.matches &&
      !document.hidden &&
      document.startViewTransition
    ) {
      // Freeze at the exact compliant endpoint before capturing the outgoing scene.
      applyAnchor(frame.from);
      lastTarget = frame.to;
      root.dataset['themeWipe'] = frame.wipe;
      root.style.setProperty('--theme-wipe-duration', `${timing.wipeMs}ms`);
      try {
        transition = document.startViewTransition(() => {
          if (!stopped) applyAnchor(frame.to);
        });
      } catch {
        // Snapshot capture is optional; the compliant endpoint is not.
        delete root.dataset['themeWipe'];
        root.style.removeProperty('--theme-wipe-duration');
        applyAnchor(frame.to);
        timer = window.setTimeout(tick, Math.min(1000, frame.remainingMs));
        return;
      }
      void transition.ready.catch(() => {});
      void transition.finished
        .catch(() => {})
        .finally(() => {
          transition = undefined;
          if (stopped) return;
          delete root.dataset['themeWipe'];
          root.style.removeProperty('--theme-wipe-duration');
          tick();
        });
      return;
    }
    lastTarget = frame.to;
    if (frame.wipe) applyAnchor(frame.to);
    else {
      applyAnchor(frame.from);
      if (!motion.matches)
        for (const [role, value] of Object.entries(
          interpolatePalette(palettes[frame.from], palettes[frame.to], frame.progress),
        ))
          root.style.setProperty(role, value);
    }
    timer = window.setTimeout(tick, Math.min(1000, frame.remainingMs));
  };
  const changedMotion = () => {
    window.clearTimeout(timer);
    transition?.skipTransition();
    if (!transition) tick();
  };
  motion.addEventListener('change', changedMotion);
  tick();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    transition?.skipTransition();
    motion.removeEventListener('change', changedMotion);
    clearTokens();
    delete root.dataset['themeWipe'];
    root.style.removeProperty('--theme-wipe-duration');
  };
}
