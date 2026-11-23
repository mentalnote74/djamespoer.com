/**
 * SCRUM-219: the header sky's per-pixel cloud field, as pure functions. It runs in a Web Worker
 * (sky-preview.worker.ts) and is the inline fallback where workers are unavailable. The visual
 * result is unchanged.
 */

export interface SkyPalette {
  top: number[];
  mid: number[];
  bottom: number[];
  orb: number[];
  x: number;
  y: number;
  orbOpacity: number;
  clouds: number;
  stars: number;
}

/** Deterministic value noise (seed 712), identical on every thread. */
export function createSkyNoise(): (x: number, y: number) => number {
  let seed = 712;
  const grid = Float32Array.from({ length: 4096 }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  return (x: number, y: number) => {
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
}

/** Gradient sky, sun glow and drifting cloud density for one frame. */
export function paintSky(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  time: number,
  palette: SkyPalette,
  noise: (x: number, y: number) => number,
): void {
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const u = (x / height) * 0.7,
        v = (y / height) * 1.8,
        t = time * 0.15;
      const warp = noise(u * 0.55 + t * 0.24, v * 0.8 - t * 0.1);
      const a = u + warp * 2.7 + t,
        b = v + noise(u * 0.65 - t * 0.12, v * 0.6) * 1.9;
      const density =
        (noise(a, b) + 0.5 * noise(a * 2.1 - t * 0.3, b * 2.1) + 0.25 * noise(a * 4.2, b * 4.2 + t * 0.2)) /
        1.75;
      const atmosphere = 1 - Math.min(1, Math.abs(palette.y - 0.8) * 2);
      const veil = noise(u * 0.36 - t * 0.16, v * 0.42 + t * 0.13);
      const cloud =
        Math.pow(Math.max(0, Math.min(1, (density - 0.38) / 0.35)), 1.6) * palette.clouds * (1 - palette.stars);
      const vertical = y / height,
        blend = vertical < 0.58 ? vertical / 0.58 : (vertical - 0.58) / 0.42;
      const from = vertical < 0.58 ? palette.top : palette.mid,
        to = vertical < 0.58 ? palette.mid : palette.bottom;
      const dx = ((x / width - palette.x) * width) / height,
        dy = vertical - palette.y;
      const glow = Math.exp(-(dx * dx + dy * dy) * 3.5) * palette.orbOpacity * 0.65 * (1 - palette.stars);
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const sky = from[channel] + (to[channel] - from[channel]) * blend;
        const lit = sky + (palette.orb[channel] - sky) * glow;
        const cloudLight = Math.min(255, palette.orb[channel] * 0.25 + 195 + (density - 0.5) * 35);
        const layered = lit * (1 - cloud * 0.65) + cloudLight * cloud * 0.65;
        const tint = palette.mid[channel] * 0.65 + palette.orb[channel] * 0.35;
        const swirl = Math.max(0, veil - 0.3) * 0.24 * atmosphere * (1 - palette.stars);
        data[offset + channel] = layered * (1 - swirl) + tint * swirl;
      }
      data[offset + 3] = 255;
    }
}
