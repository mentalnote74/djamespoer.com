import type { BedlamRuntime } from './runtime';

/** Small asset-free sky study. The fixed star layer remains CSS, above this canvas. */
export function startSkyPreview(
  host: HTMLElement,
  canvases: readonly HTMLCanvasElement[],
): BedlamRuntime {
  const canvas = canvases[0],
    context = canvas.getContext('2d');
  if (!context) return { configure() {}, destroy() {} };
  let seed = 712;
  const grid = Float32Array.from({ length: 4096 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx),
      sy = fy * fy * (3 - 2 * fy);
    const at = (a: number, b: number) => grid[(a & 63) + (b & 63) * 64];
    return (
      (at(ix, iy) * (1 - sx) + at(ix + 1, iy) * sx) * (1 - sy) +
      (at(ix, iy + 1) * (1 - sx) + at(ix + 1, iy + 1) * sx) * sy
    );
  };
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
  let palette = {
    top: [104, 92, 153],
    mid: [224, 154, 171],
    bottom: [255, 201, 135],
    orb: [255, 231, 174],
    x: 0.78,
    y: 0.78,
    orbOpacity: 1,
    clouds: 0.3,
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
    };
    return true;
  };
  let width = Math.min(384, Math.max(128, Math.round(host.clientWidth / 3))),
    height = Math.max(24, Math.round((width * host.clientHeight) / Math.max(1, host.clientWidth)));
  canvas.width = width;
  canvas.height = height;
  let image = context.createImageData(width, height);
  const draw = () => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const u = (x / height) * 0.7,
          v = (y / height) * 1.8,
          t = time * 0.11;
        const warp = noise(u * 0.55 + t * 0.24, v * 0.8 - t * 0.1);
        const a = u + warp * 2.4 + t,
          b = v + noise(u * 0.65 - t * 0.12, v * 0.6) * 1.9;
        const density =
          (noise(a, b) +
            0.5 * noise(a * 2.1 - t * 0.3, b * 2.1) +
            0.25 * noise(a * 4.2, b * 4.2 + t * 0.2)) /
          1.75;
        const cloud =
          Math.pow(Math.max(0, Math.min(1, (density - 0.38) / 0.35)), 1.6) * palette.clouds;
        const vertical = y / height,
          blend = vertical < 0.58 ? vertical / 0.58 : (vertical - 0.58) / 0.42;
        const from = vertical < 0.58 ? palette.top : palette.mid,
          to = vertical < 0.58 ? palette.mid : palette.bottom;
        const dx = ((x / width - palette.x) * width) / height,
          dy = vertical - palette.y;
        const glow = Math.exp(-(dx * dx + dy * dy) * 3.5) * palette.orbOpacity * 0.65;
        const offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) {
          const sky = from[channel] + (to[channel] - from[channel]) * blend;
          const lit = sky + (palette.orb[channel] - sky) * glow;
          const cloudLight = Math.min(
            255,
            palette.orb[channel] * 0.25 + 195 + (density - 0.5) * 35,
          );
          image.data[offset + channel] = lit * (1 - cloud * 0.82) + cloudLight * cloud * 0.82;
        }
        image.data[offset + 3] = 255;
      }
    context.putImageData(image, 0, 0);
  };
  const sizeObserver = new ResizeObserver(() => {
    const nextWidth = Math.min(384, Math.max(128, Math.round(host.clientWidth / 3)));
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
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      observer.disconnect();
      sizeObserver.disconnect();
      document.removeEventListener('visibilitychange', reconcile);
      motion.removeEventListener('change', reconcile);
    },
  };
}
