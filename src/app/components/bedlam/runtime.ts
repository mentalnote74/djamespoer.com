import {
  Algorithm,
  bounded,
  Cartridge,
  Chatter,
  clamp,
  presentation,
  select,
  slots,
} from './contract';
import { pool } from './pool';
export interface BedlamRuntime {
  configure(speed: number, paused: boolean): void;
  destroy(): void;
}
/** Slot controller depends only on the replaceable cartridge contract. */
export function startBedlam(
  host: HTMLElement,
  canvases: readonly HTMLCanvasElement[],
  registry: readonly Algorithm[] = pool,
): BedlamRuntime {
  const active: {
    cartridge: Cartridge;
    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    chatter: Chatter;
  }[] = [];
  let frame = 0,
    previous = 0,
    accumulator = 0,
    speed = 0.12,
    paused = false,
    visible = true,
    destroyed = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    select(registry).forEach((algorithm, i) => {
      const canvas = canvases[i];
      canvas.width = 96;
      canvas.height = 32;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      const cartridge = algorithm.create(96, 32, Math.random);
      active.push({ cartridge, context, canvas, chatter: bounded(cartridge.chatter()) });
      cartridge.draw(context);
    });
  } catch {
    active.forEach(({ cartridge }) => cartridge.destroy());
    return { configure() {}, destroy() {} };
  }
  const running = () =>
    !destroyed && !paused && speed > 0 && !motion.matches && visible && !document.hidden;
  const apply = () =>
    active.forEach((layer, i) => {
      for (const [key, value] of Object.entries(presentation(slots[i], layer.chatter)))
        (key.startsWith('--mask') ? host : layer.canvas).style.setProperty(key, value);
    });
  apply();
  const tick = (now: number) => {
    frame = 0;
    if (!running()) return;
    const elapsed = previous ? Math.min(0.1, (now - previous) / 1000) : 0;
    if (previous && elapsed < 1 / 30) {
      frame = requestAnimationFrame(tick);
      return;
    }
    previous = now;
    accumulator += elapsed * speed * 8;
    while (accumulator >= 1) {
      active.forEach(({ cartridge }) => cartridge.step());
      accumulator--;
    }
    active.forEach((layer) => {
      layer.cartridge.draw(layer.context);
      const target = bounded(layer.cartridge.chatter()),
        mix = Math.min(1, elapsed * 0.25);
      layer.chatter = {
        x: layer.chatter.x + (target.x - layer.chatter.x) * mix,
        y: layer.chatter.y + (target.y - layer.chatter.y) * mix,
        energy: layer.chatter.energy + (target.energy - layer.chatter.energy) * mix,
      };
    });
    apply();
    frame = requestAnimationFrame(tick);
  };
  const reconcile = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
    if (running()) frame = requestAnimationFrame(tick);
  };
  motion.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  const observer =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver((entries) => {
          visible = entries[0]?.isIntersecting ?? false;
          reconcile();
        })
      : undefined;
  observer?.observe(host);
  reconcile();
  return {
    configure(nextSpeed, nextPaused) {
      speed = clamp(nextSpeed, 0, 1);
      paused = nextPaused;
      reconcile();
    },
    destroy() {
      destroyed = true;
      reconcile();
      observer?.disconnect();
      motion.removeEventListener('change', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
      active.forEach(({ cartridge }) => cartridge.destroy());
    },
  };
}
