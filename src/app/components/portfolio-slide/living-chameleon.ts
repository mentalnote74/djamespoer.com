import { paintChameleon, prepareMapping } from './living-chameleon.kernel';

/** The perch box on the 2172x724 stage: left, top, width, height as fractions. */
const PERCH = [0.792, 0.732, 0.16, 0.24] as const;

/**
 * Pigment changes mapped through the original scales, shading and silhouette.
 * SCRUM-219: the per-pixel shader runs in a Web Worker; the main thread only uploads finished
 * frames. While a frame is in flight, new requests are dropped rather than queued, so a slow
 * device paints less often instead of blocking input. Without Worker support the same kernel
 * runs inline, as before.
 */
export class LivingChameleon {
  private readonly canvas: HTMLCanvasElement;
  private readonly source: HTMLImageElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private texture?: ImageData;
  private pixels?: ImageData;
  private mapping?: Float32Array;
  private lastPaint = -Infinity;
  private lastTime = 0;
  private sourceUrl = '';
  private worker?: Worker;
  private generation = 0;
  private ready = false;
  private busy = false;

  constructor(private readonly animal: HTMLElement) {
    this.canvas = animal.querySelector<HTMLCanvasElement>('.chameleon-material')!;
    // SCRUM-219: the body is the registered stage layer; sample only the perch box from it.
    this.source = animal.querySelector<HTMLImageElement>('.chameleon-body img')!;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    // The registered layer loads lazily; a still (reduced-motion) reveal may precede it.
    this.source.addEventListener('load', () => this.render(this.lastTime, true));
    if (typeof Worker !== 'undefined')
      try {
        this.worker = new Worker(new URL('./living-chameleon.worker', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = this.receive;
        this.worker.onerror = () => this.fallBackInline();
      } catch {
        this.worker = undefined;
      }
  }

  render(t: number, force = false): void {
    if (!this.ctx || !this.source.complete || !this.source.naturalWidth) return;
    if (!force && t - this.lastPaint < 0.05) return;
    this.lastPaint = t;
    this.lastTime = t;
    if (!this.texture || this.sourceUrl !== this.source.currentSrc) this.prepare();
    if (!this.texture || !this.pixels) return;
    if (this.worker) {
      if (!this.ready || this.busy) return;
      this.busy = true;
      this.worker.postMessage({ type: 'paint', id: this.generation, t });
      return;
    }
    if (!this.mapping) return;
    paintChameleon(this.texture.data, this.pixels.data, this.mapping, t);
    this.ctx.putImageData(this.pixels, 0, 0);
    this.canvas.classList.add('is-painted');
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = undefined;
  }

  private prepare(): void {
    if (!this.ctx) return;
    const width = Math.min(640, Math.max(400, Math.round(this.animal.clientWidth * Math.min(devicePixelRatio, 2))));
    const height = Math.round(width / 2);
    this.canvas.width = width;
    this.canvas.height = height;
    // drawImage works in the file's real pixels, but naturalWidth is density-corrected for a
    // srcset choice. Registered exports are named <layer>-<width>.<ext> and are always 3:1.
    const w = Number(/-(\d+)\.\w+$/.exec(this.source.currentSrc)?.[1]) || this.source.naturalWidth,
      h = w / 3;
    this.ctx.drawImage(this.source, PERCH[0] * w, PERCH[1] * h, PERCH[2] * w, PERCH[3] * h, 0, 0, width, height);
    this.texture = this.ctx.getImageData(0, 0, width, height);
    this.pixels = this.ctx.createImageData(width, height);
    this.sourceUrl = this.source.currentSrc;
    this.generation++;
    if (this.worker) {
      this.ready = false;
      this.busy = false;
      const src = this.texture.data.slice();
      this.worker.postMessage(
        { type: 'prepare', id: this.generation, src, width, height },
        [src.buffer],
      );
    } else this.mapping = prepareMapping(this.texture.data, width, height);
  }

  private readonly receive = ({ data }: MessageEvent): void => {
    if (data.id !== this.generation || !this.ctx || !this.pixels) return;
    if (data.type === 'ready') {
      this.ready = true;
      this.busy = true;
      this.worker?.postMessage({ type: 'paint', id: this.generation, t: this.lastTime });
    } else if (data.type === 'frame') {
      this.busy = false;
      this.pixels.data.set(data.dst as Uint8ClampedArray);
      this.ctx.putImageData(this.pixels, 0, 0);
      this.canvas.classList.add('is-painted');
    }
  };

  private fallBackInline(): void {
    this.destroy();
    this.ready = this.busy = false;
    if (this.texture)
      this.mapping = prepareMapping(this.texture.data, this.texture.width, this.texture.height);
  }
}
