/**
 * SCRUM-219: the chameleon's per-pixel pigment shader, as pure functions. They run in a Web
 * Worker (living-chameleon.worker.ts) so the hero never blocks the main thread; the same code is
 * the inline fallback where workers are unavailable. The visual result is unchanged.
 */

/** Per-pixel surface coordinates, lighting and pigment strength, computed once per texture. */
export function prepareMapping(src: Uint8ClampedArray, width: number, height: number): Float32Array {
  const mapping = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4,
        nx = x / width,
        ny = y / height;
      // Cylindrical projection bends motifs around the ribcage instead of sliding a flat decal.
      mapping[k] = nx + 0.035 * Math.sin(ny * Math.PI);
      mapping[k + 1] = 0.5 + Math.asin(Math.max(-0.98, Math.min(0.98, (ny - 0.46) / 0.52))) / Math.PI;
      mapping[k + 2] = (src[k] * 0.2126 + src[k + 1] * 0.7152 + src[k + 2] * 0.0722) / 255;
      const eye = Math.exp(-(((nx - 0.155) / 0.065) ** 2 + ((ny - 0.416) / 0.12) ** 2) * 2);
      const feet = smooth((ny - 0.68) / 0.25);
      const edge = Math.min(1, src[k + 3] / 210);
      mapping[k + 3] = (0.95 - 0.57 * feet) * (1 - 0.85 * eye) * edge;
    }
  return mapping;
}

/** Pigment changes mapped through the original scales, shading and silhouette. */
export function paintChameleon(
  src: Uint8ClampedArray,
  dst: Uint8ClampedArray,
  map: Float32Array,
  t: number,
): void {
  const phase = (t % 9) / 3;
  const theme = Math.floor(phase),
    fraction = phase - theme;
  const blend = smooth((fraction - 0.67) / 0.33);
  const weights = [0, 0, 0];
  weights[theme] = 1 - blend;
  weights[(theme + 1) % 3] = blend;
  const light = t * 0.55;
  for (let p = 0, k = 0; p < src.length; p += 4, k += 4) {
    if (!src[p + 3]) {
      dst[p + 3] = 0;
      continue;
    }
    const u = map[k],
      v = map[k + 1],
      value = map[k + 2],
      region = map[k + 3];
    // The animal never becomes transparent. Only its pigmentation changes.
    const strength = region * (0.64 + 0.16 * Math.sin(light + u * 3.4 - v * 2.1));
    let red = 0,
      green = 0,
      blue = 0;
    if (weights[0] > 0) {
      const facetX = Math.floor(u * 30),
        facetY = Math.floor(v * 17);
      const facet = Math.sin(facetX * 2.7 + facetY * 4.1 + t * 0.65);
      const spotlight = Math.pow(Math.max(0, Math.cos(u * 5 - v * 2 - t * 0.9)), 14);
      const hue = u * 4 + v * 1.5 + t * 0.38 + facet * 0.23;
      const silver = 0.24 + 0.25 * spotlight;
      red += weights[0] * (silver + 0.58 * (0.5 + 0.5 * Math.cos(hue))) * (1 + 0.12 * facet);
      green += weights[0] * (silver + 0.58 * (0.5 + 0.5 * Math.cos(hue - 2.1))) * (1 + 0.12 * facet);
      blue += weights[0] * (silver + 0.58 * (0.5 + 0.5 * Math.cos(hue - 4.2))) * (1 + 0.12 * facet);
    }
    if (weights[1] > 0) {
      const x = fract(u * 6.7),
        y = fract(v * 4.1);
      const navy = stripe(x, 0.23, 0.41) + stripe(y, 0.23, 0.41);
      const greenBand = stripe(x, 0.6, 0.79) + stripe(y, 0.6, 0.79);
      const gold = Math.max(stripe(x, 0.11, 0.128), stripe(y, 0.11, 0.128));
      const ivory = Math.max(stripe(x, 0.52, 0.531), stripe(y, 0.52, 0.531));
      const weave = ((Math.floor(u * 320) + Math.floor(v * 180)) % 2) * 0.05;
      let r = 0.66 - 0.22 * Math.min(2, navy) - 0.17 * Math.min(2, greenBand);
      let g = 0.13 + 0.035 * navy + 0.1 * greenBand;
      let b = 0.22 + 0.055 * navy - 0.04 * greenBand;
      r = r * (1 - gold) + 0.86 * gold;
      g = g * (1 - gold) + 0.67 * gold;
      b = b * (1 - gold) + 0.2 * gold;
      r = r * (1 - ivory) + 0.76 * ivory;
      g = g * (1 - ivory) + 0.73 * ivory;
      b = b * (1 - ivory) + 0.61 * ivory;
      red += weights[1] * (r + weave);
      green += weights[1] * (g + weave);
      blue += weights[1] * (b + weave);
    }
    if (weights[2] > 0) {
      const cyanDistance = Math.abs(Math.sin(u * 18 + v * 6 + 0.6 * Math.sin(v * 8)));
      const pinkDistance = Math.abs(Math.sin(v * 17 - u * 5 + 0.4 * Math.sin(u * 10)));
      const travellingLight = 0.6 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(u * 8 - v * 5 - t * 1.4), 2);
      const cyan = Math.exp(-cyanDistance * 24) * travellingLight;
      const pink = Math.exp(-pinkDistance * 26) * travellingLight;
      const glow = Math.exp(-Math.min(cyanDistance, pinkDistance) * 5) * 0.15;
      red += weights[2] * (0.22 + pink * 1.32 + glow);
      green += weights[2] * (0.3 + cyan * 1.18 + glow * 0.5);
      blue += weights[2] * (0.28 + cyan * 0.94 + pink * 0.92 + glow);
    }
    // Raise pigment chroma without changing the original scale lighting.
    const pigmentValue = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    red = Math.max(0, pigmentValue + (red - pigmentValue) * 1.22);
    green = Math.max(0, pigmentValue + (green - pigmentValue) * 1.22);
    blue = Math.max(0, pigmentValue + (blue - pigmentValue) * 1.22);
    // Retain the source's scale relief, cast shadows and warm architectural light.
    const shade = 0.2 + value * 1.42;
    dst[p] = src[p] * (1 - strength) + Math.min(255, red * shade * 255) * strength;
    dst[p + 1] = src[p + 1] * (1 - strength) + Math.min(255, green * shade * 255) * strength;
    dst[p + 2] = src[p + 2] * (1 - strength) + Math.min(255, blue * shade * 255) * strength;
    dst[p + 3] = src[p + 3];
  }
}

function smooth(v: number): number {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
}
function fract(v: number): number {
  return v - Math.floor(v);
}
function stripe(v: number, low: number, high: number): number {
  return smooth((v - low) * 400) * (1 - smooth((v - high) * 400));
}
