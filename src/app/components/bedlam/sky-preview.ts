import { nightPassage } from '../../services/living-theme-clock';
import { createSkyNoise, paintSky, type SkyPalette } from './sky-preview.kernel';
import type { BedlamRuntime } from './runtime';

/** Small asset-free sky study. The fixed star layer remains CSS, above this canvas. */
export function startSkyPreview(
  host: HTMLElement,
  canvases: readonly HTMLCanvasElement[],
): BedlamRuntime {
  const canvas = canvases[0],
    context = canvas.getContext('2d');
  if (!context) return { configure() {}, destroy() {} };
  const effects = canvases[1];
  const night = effects?.getContext('2d');
  let stars: { x: number; y: number; phase: number; period: number; warmth: number; radius: number }[] = [];
  let unit = 0.25;
  // SCRUM-219: the cloud field is a per-pixel shader. It runs in a Web Worker so the header
  // sky never blocks the main thread; the same kernel runs inline where workers are unavailable.
  const noise = createSkyNoise();
  let worker: Worker | undefined;
  let busy = false,
    dirty = false;
  if (typeof Worker !== 'undefined')
    try {
      worker = new Worker(new URL('./sky-preview.worker', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent) => {
        busy = false;
        if (destroyed || data.width !== width || data.height !== height) return void (dirty && draw());
        image.data.set(data.pixels as Uint8ClampedArray);
        context.putImageData(image, 0, 0);
        drawNight();
        if (dirty) draw();
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = undefined;
        busy = false;
        draw();
      };
    } catch {
      worker = undefined;
    }
  const rgb = (value: string, fallback: number[]): number[] => {
    const hex = value.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
    if (hex) return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const numbers = value.match(/[\d.]+/g)?.map(Number);
    return numbers?.length === 3 ? numbers : fallback;
  };
  let frame = 0,
    timer = 0,
    previous = 0,
    time = 0,
    lastPalette = 0,
    paused = false,
    visible = true,
    destroyed = false,
    speed = 0.74;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paletteSignature = '';
  let palette: SkyPalette = {
    top: [104, 92, 153],
    mid: [224, 154, 171],
    bottom: [255, 201, 135],
    orb: [255, 231, 174],
    x: 0.78,
    y: 0.78,
    orbOpacity: 1,
    clouds: 0.3,
    stars: 0,
  };
  const read = () => {
    const style = getComputedStyle(document.documentElement),
      value = (key: string) => style.getPropertyValue('--sky-' + key);
    const signature = [
      'top',
      'mid',
      'horizon',
      'orb',
      'sun-x',
      'sun-y',
      'orb-opacity',
      'cloud-opacity',
      'star-opacity',
    ]
      .map(value)
      .join(';');
    if (signature === paletteSignature) return false;
    paletteSignature = signature;
    palette = {
      top: rgb(value('top'), palette.top),
      mid: rgb(value('mid'), palette.mid),
      bottom: rgb(value('horizon'), palette.bottom),
      orb: rgb(value('orb'), palette.orb),
      x: (parseFloat(value('sun-x')) || 0) / 100,
      y: (parseFloat(value('sun-y')) || 0) / 100,
      orbOpacity: parseFloat(value('orb-opacity')) || 0,
      clouds: parseFloat(value('cloud-opacity')) || 0,
      stars: parseFloat(value('star-opacity')) || 0,
    };
    return true;
  };
  // Small reusable fields never rasterize beyond their displayed width. The
  // established navbar profile (128–384px, one third of the field) is unchanged.
  const rasterWidth = () => Math.min(Math.max(1, host.clientWidth), 384, Math.max(128, Math.round(host.clientWidth / 3)));
  let width = rasterWidth(),
    height = Math.max(24, Math.round((width * host.clientHeight) / Math.max(1, host.clientWidth)));
  canvas.width = width;
  canvas.height = height;
  let image = context.createImageData(width, height);
  const layoutNight = () => {
    if (!effects || !night) return;
    const box = host.getBoundingClientRect();
    // Thin tails need a crisp overlay; cloud noise retains its small working buffer.
    effects.width = Math.min(1600, Math.max(1, Math.round(box.width)));
    effects.height = Math.max(1, Math.round(box.height));
    night.setTransform(effects.width / width, 0, 0, effects.height / height, 0, 0);
    unit = width / Math.max(1, box.width);
    const patterns = [
      [16, 19, 83, 61],
      [55, 24, 137, 73],
      [60, 37, 107, 97],
    ];
    stars = Array.from({ length: 24 }, (_, index) => {
      const [x, y, tileX, tileY] = patterns[index % 3];
      return {
        x:
          ((x + Math.floor(Math.random() * Math.max(1, (box.width * 0.6) / tileX)) * tileX) *
            width) /
          Math.max(1, box.width),
        y:
          ((y + Math.floor(Math.random() * Math.max(1, box.height / tileY)) * tileY) * height) /
          Math.max(1, box.height),
        phase: Math.random() * Math.PI * 2,
        period: 7 + Math.random() * 17,
        warmth: Math.random(),
        radius: .7 + Math.random() * .8,
      };
    });
  };
  const drawNight = () => {
    if (!night) return;
    night.clearRect(0, 0, width, height);
    if (paused || motion.matches || speed <= 0 || palette.stars < 0.2) return;
    for (const star of stars) {
      const shimmer = .32 + .28 * Math.sin((time * Math.PI * 2) / star.period + star.phase)
        + .09 * Math.sin(time / (star.period * .37) + star.phase * 2.3);
      const warmth = star.warmth + Math.sin(time / 13 + star.phase) * .08;
      night.fillStyle = `rgba(${218 + warmth * 30},${229 + warmth * 13},${255 - warmth * 25},${shimmer * palette.stars * .65})`;
      night.beginPath();
      night.arc(star.x, star.y, Math.max(.3, unit * star.radius), 0, Math.PI * 2);
      night.fill();
    }
    const streak = (x: number, y: number, dx: number, dy: number, opacity: number, diffuse = false) => {
      const gradient = night.createLinearGradient(x + dx, y + dy, x, y);
      gradient.addColorStop(0, 'rgba(174,204,244,0)');
      gradient.addColorStop(.65, `rgba(191,215,244,${opacity * .2})`);
      gradient.addColorStop(1, `rgba(220,237,255,${opacity})`);
      night.strokeStyle = gradient;
      night.lineWidth = Math.max(0.3, unit * (diffuse ? 4 : .9));
      night.shadowBlur = diffuse ? 5 * unit : 0;
      night.shadowColor = `rgba(198,222,255,${opacity * .5})`;
      night.beginPath();
      night.moveTo(x + dx, y + dy);
      night.lineTo(x, y);
      night.stroke();
      night.fillStyle = `rgba(235,245,255,${opacity})`;
      night.beginPath();
      night.arc(x, y, Math.max(0.3, unit * (diffuse ? 2.4 : .7)), 0, Math.PI * 2);
      night.fill();
      night.shadowBlur = 0;
    };
    // Local preview server owns demonstration controls; no controls ship in client assets.
    const demo = location.hostname === '127.0.0.1' || location.hostname === 'localhost'
      ? Number(document.documentElement.dataset['demoSkySeconds']) : NaN;
    const { comet, shooting } = nightPassage(Number.isFinite(demo) ? demo : time);
    if (comet !== null) streak(
      (.88 - comet * .76) * width, (.12 + comet * .42) * height,
      width * .13, -height * .12,
      Math.sin(comet * Math.PI) ** 2 * palette.stars * .19, true,
    );
    if (shooting !== null) streak(
      (.1 + shooting * .79) * width, (.65 - shooting * .43) * height,
      -width * .055, height * .045,
      Math.sin(shooting * Math.PI) * palette.stars * .48,
    );
  };
  layoutNight();
  const draw = () => {
    if (worker) {
      // Drop, don't queue: one frame in flight; the newest state is drawn when it returns.
      if (busy) return void (dirty = true);
      busy = true;
      dirty = false;
      worker.postMessage({ width, height, time, palette });
      return;
    }
    paintSky(image.data, width, height, time, palette, noise);
    context.putImageData(image, 0, 0);
    drawNight();
  };
  const sizeObserver = new ResizeObserver(() => {
    const nextWidth = rasterWidth();
    const nextHeight = Math.max(
      24,
      Math.round((nextWidth * host.clientHeight) / Math.max(1, host.clientWidth)),
    );
    if (nextWidth === width && nextHeight === height) return;
    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    image = context.createImageData(width, height);
    layoutNight();
    draw();
  });
  sizeObserver.observe(host);
  const tick = (now: number) => {
    frame = 0;
    if (destroyed || !visible || document.hidden) return;
    if (now - previous >= 50) {
      const moving = !paused && !motion.matches && speed > 0;
      if (moving) time += Math.min(0.15, (now - previous) / 1000) * speed;
      previous = now;
      let changed = false;
      if (now - lastPalette >= 100) {
        changed = read();
        lastPalette = now;
      }
      if (moving || changed) draw();
    }
    if (paused || motion.matches || speed <= 0)
      timer = window.setTimeout(() => tick(performance.now()), 250);
    else frame = requestAnimationFrame(tick);
  };
  const reconcile = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    previous = performance.now();
    if (paused || motion.matches || speed <= 0) night?.clearRect(0, 0, width, height);
    if (!destroyed && visible && !document.hidden) frame = requestAnimationFrame(tick);
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? false;
    reconcile();
  });
  observer.observe(host);
  document.addEventListener('visibilitychange', reconcile);
  motion.addEventListener('change', reconcile);
  read();
  draw();
  reconcile();
  return {
    configure(nextSpeed, nextPaused) {
      speed = nextSpeed;
      paused = nextPaused;
      reconcile();
    },
    destroy() {
      destroyed = true;
      worker?.terminate();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener('visibilitychange', reconcile);
      motion.removeEventListener('change', reconcile);
    },
  };
}
