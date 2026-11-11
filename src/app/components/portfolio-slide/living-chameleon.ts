/** Pigment changes mapped through the original scales, shading and silhouette. */
export class LivingChameleon {
  private readonly canvas: HTMLCanvasElement;
  private readonly source: HTMLImageElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private texture?: ImageData;
  private pixels?: ImageData;
  private mapping?: Float32Array;
  private lastPaint = -Infinity;
  private sourceUrl = '';

  constructor(private readonly animal: HTMLElement) {
    this.canvas = animal.querySelector<HTMLCanvasElement>('.chameleon-material')!;
    this.source = animal.querySelector<HTMLImageElement>('.chameleon-body')!;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  render(t: number, force = false): void {
    if (!this.ctx || !this.source.complete || !this.source.naturalWidth) return;
    if (!force && t - this.lastPaint < .05) return;
    this.lastPaint = t;
    if (!this.texture || this.sourceUrl !== this.source.currentSrc) this.prepare();
    if (!this.texture || !this.pixels || !this.mapping) return;
    const src = this.texture.data, dst = this.pixels.data, map = this.mapping;
    const phase = (t % 9) / 3;
    const theme = Math.floor(phase), fraction = phase - theme;
    const blend = smooth((fraction - .67) / .33);
    const weights = [0, 0, 0];
    weights[theme] = 1 - blend;
    weights[(theme + 1) % 3] = blend;
    const light = t * .55;
    for (let p = 0, k = 0; p < src.length; p += 4, k += 4) {
      if (!src[p + 3]) { dst[p + 3] = 0; continue; }
      const u = map[k], v = map[k + 1], value = map[k + 2], region = map[k + 3];
      // The animal never becomes transparent. Only its pigmentation changes.
      const strength = region * (.52 + .17 * Math.sin(light + u * 3.4 - v * 2.1));
      let red = 0, green = 0, blue = 0;
      if (weights[0] > 0) {
        const facetX = Math.floor(u * 30), facetY = Math.floor(v * 17);
        const facet = Math.sin(facetX * 2.7 + facetY * 4.1 + t * .65);
        const spotlight = Math.pow(Math.max(0, Math.cos(u * 5 - v * 2 - t * .9)), 14);
        const hue = u * 4 + v * 1.5 + t * .38 + facet * .23;
        const silver = .24 + .25 * spotlight;
        red += weights[0] * (silver + .58 * (.5 + .5 * Math.cos(hue))) * (1 + .12 * facet);
        green += weights[0] * (silver + .58 * (.5 + .5 * Math.cos(hue - 2.1))) * (1 + .12 * facet);
        blue += weights[0] * (silver + .58 * (.5 + .5 * Math.cos(hue - 4.2))) * (1 + .12 * facet);
      }
      if (weights[1] > 0) {
        const x = fract(u * 6.7), y = fract(v * 4.1);
        const navy = stripe(x, .23, .41) + stripe(y, .23, .41);
        const greenBand = stripe(x, .60, .79) + stripe(y, .60, .79);
        const gold = Math.max(stripe(x, .11, .128), stripe(y, .11, .128));
        const ivory = Math.max(stripe(x, .52, .531), stripe(y, .52, .531));
        const weave = ((Math.floor(u * 320) + Math.floor(v * 180)) % 2) * .05;
        let r = .66 - .22 * Math.min(2, navy) - .17 * Math.min(2, greenBand);
        let g = .13 + .035 * navy + .10 * greenBand;
        let b = .22 + .055 * navy - .04 * greenBand;
        r = r * (1 - gold) + .86 * gold; g = g * (1 - gold) + .67 * gold; b = b * (1 - gold) + .2 * gold;
        r = r * (1 - ivory) + .76 * ivory; g = g * (1 - ivory) + .73 * ivory; b = b * (1 - ivory) + .61 * ivory;
        red += weights[1] * (r + weave); green += weights[1] * (g + weave); blue += weights[1] * (b + weave);
      }
      if (weights[2] > 0) {
        const cyanDistance = Math.abs(Math.sin(u * 18 + v * 6 + .6 * Math.sin(v * 8)));
        const pinkDistance = Math.abs(Math.sin(v * 17 - u * 5 + .4 * Math.sin(u * 10)));
        const travellingLight = .60 + .40 * Math.pow(.5 + .5 * Math.sin(u * 8 - v * 5 - t * 1.4), 2);
        const cyan = Math.exp(-cyanDistance * 24) * travellingLight;
        const pink = Math.exp(-pinkDistance * 26) * travellingLight;
        const glow = Math.exp(-Math.min(cyanDistance, pinkDistance) * 5) * .15;
        red += weights[2] * (.22 + pink * 1.32 + glow);
        green += weights[2] * (.30 + cyan * 1.18 + glow * .5);
        blue += weights[2] * (.28 + cyan * .94 + pink * .92 + glow);
      }
      // Retain the source's scale relief, cast shadows and warm architectural light.
      const shade = .20 + value * 1.42;
      dst[p] = src[p] * (1 - strength) + Math.min(255, red * shade * 255) * strength;
      dst[p + 1] = src[p + 1] * (1 - strength) + Math.min(255, green * shade * 255) * strength;
      dst[p + 2] = src[p + 2] * (1 - strength) + Math.min(255, blue * shade * 255) * strength;
      dst[p + 3] = src[p + 3];
    }
    this.ctx.putImageData(this.pixels, 0, 0);
    this.canvas.classList.add('is-painted');
  }

  private prepare(): void {
    if (!this.ctx) return;
    const width = Math.min(640, Math.max(400, Math.round(this.animal.clientWidth * Math.min(devicePixelRatio, 2))));
    const height = Math.round(width / 2);
    this.canvas.width = width; this.canvas.height = height;
    this.ctx.drawImage(this.source, 0, 0, width, height);
    this.texture = this.ctx.getImageData(0, 0, width, height);
    this.pixels = this.ctx.createImageData(width, height);
    this.mapping = new Float32Array(width * height * 4);
    const src = this.texture.data;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const k = (y * width + x) * 4, nx = x / width, ny = y / height;
      // Cylindrical projection bends motifs around the ribcage instead of sliding a flat decal.
      this.mapping[k] = nx + .035 * Math.sin(ny * Math.PI);
      this.mapping[k + 1] = .5 + Math.asin(Math.max(-.98, Math.min(.98, (ny - .46) / .52))) / Math.PI;
      this.mapping[k + 2] = (src[k] * .2126 + src[k + 1] * .7152 + src[k + 2] * .0722) / 255;
      const eye = Math.exp(-(((nx - .155) / .065) ** 2 + ((ny - .416) / .12) ** 2) * 2);
      const feet = smooth((ny - .68) / .25);
      const edge = Math.min(1, src[k + 3] / 210);
      this.mapping[k + 3] = (.95 - .57 * feet) * (1 - .85 * eye) * edge;
    }
    this.sourceUrl = this.source.currentSrc;
  }
}

function smooth(v: number): number { const x = Math.max(0, Math.min(1, v)); return x * x * (3 - 2 * x); }
function fract(v: number): number { return v - Math.floor(v); }
function stripe(v: number, low: number, high: number): number { return smooth((v - low) * 400) * (1 - smooth((v - high) * 400)); }
