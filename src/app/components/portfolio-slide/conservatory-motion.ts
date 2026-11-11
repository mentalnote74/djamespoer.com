/** Browser-only scene renderer. Keeps frame updates outside Angular change detection. */
export class ConservatoryMotion {
  private frame = 0;
  private previous = 0;
  private elapsed = 0;
  private painted = 0;
  private readonly canvas: HTMLCanvasElement;
  private readonly water: HTMLImageElement;
  private readonly animal: HTMLElement;
  private readonly tongue: SVGPathElement;
  private readonly tip: SVGEllipseElement;
  private readonly fly: SVGGElement;
  private readonly context: CanvasRenderingContext2D | null;

  constructor(private readonly root: HTMLElement, private readonly transitionAt: () => number | null,
    private readonly hero: () => boolean) {
    this.canvas = root.querySelector<HTMLCanvasElement>('.water-ripples')!;
    this.water = root.querySelector<HTMLImageElement>('.reflections-material img')!;
    this.animal = root.querySelector<HTMLElement>('.chameleon-perch')!;
    this.tongue = root.querySelector<SVGPathElement>('.chameleon-tongue')!;
    this.tip = root.querySelector<SVGEllipseElement>('.chameleon-tongue-tip')!;
    this.fly = root.querySelector<SVGGElement>('.chameleon-fly')!;
    this.context = this.canvas.getContext('2d');
  }

  start(): void {
    if (this.frame) return;
    this.previous = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  reset(): void {
    this.elapsed = 0;
    this.reveal();
  }

  reveal(): void {
    this.animal.dataset['skin'] = 'disco';
    this.animal.style.setProperty('--crawl-x', '-14%');
    this.animal.style.setProperty('--crawl-y', '5%');
    this.animal.style.setProperty('--gait', '0deg');
    this.tongue.style.opacity = this.tip.style.opacity = this.fly.style.opacity = '0';
  }

  private readonly tick = (now: number): void => {
    this.elapsed += Math.min((now - this.previous) / 1000, .1);
    this.previous = now;
    const t = this.elapsed;
    const deadline = this.transitionAt();
    const remaining = deadline === null ? (this.hero() ? 9 - t % 9 : Infinity) : (deadline - Date.now()) / 1000;
    // Solid patterned skin throughout: disco mirror tiles, woven tartan, neon tubes.
    const skinPhase = t % 9;
    this.animal.dataset['skin'] = skinPhase < 3 ? 'disco' : skinPhase < 6 ? 'tartan' : 'neon';
    const crawl = Math.min(t / 3.2, 1);
    const steps = crawl < 1 ? Math.sin(t * 9) : 0;
    this.animal.style.setProperty('--crawl-x', `${-14 * crawl}%`);
    this.animal.style.setProperty('--crawl-y', `${5 * crawl - Math.abs(steps) * .8}%`);
    this.animal.style.setProperty('--gait', `${steps * .7}deg`);
    this.animal.style.setProperty('--skin-angle', `${t * 75}deg`);
    this.animal.style.setProperty('--skin-travel', `${t * 17}px`);
    const strike = .66 - remaining;
    const extension = strike < 0 || strike >= .13 ? 0 : strike < .055 ? strike / .055 : 1 - (strike - .055) / .075;
    const targetX = -310 + (strike < .055 ? 8 * Math.sin(t * 8) : 0);
    const targetY = 180 + (strike < .055 ? 7 * Math.sin(t * 11) : 0);
    const x = 16 + (targetX - 16) * extension, y = 270 + (targetY - 270) * extension;
    this.tongue.setAttribute('d', `M16 270L${x} ${y}`);
    this.tongue.style.opacity = this.tip.style.opacity = extension > 0 ? '1' : '0';
    this.tip.setAttribute('cx', String(x));
    this.tip.setAttribute('cy', String(y));
    this.fly.style.opacity = remaining < 1.65 && remaining > .53 ? '1' : '0';
    this.fly.setAttribute('transform', strike < .055 ? `translate(${targetX} ${targetY})` : `translate(${x} ${y})`);
    if (now - this.painted >= 33) {
      this.drawWater(t);
      this.painted = now;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private drawWater(t: number): void {
    const ctx = this.context;
    if (!ctx || !this.water.complete || !this.water.naturalWidth) return;
    const width = Math.min(1440, Math.max(600, Math.round(this.root.clientWidth)));
    if (this.canvas.width !== width) {
      this.canvas.width = width;
      this.canvas.height = Math.round(width / 3);
    }
    const w = this.canvas.width, h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(this.water, 0, 0, w, h);
    // Narrow horizontal refraction bands: amplitude increases toward the viewer.
    // The shoreline, architecture and rocks never translate with the water.
    for (let y = Math.floor(h * .627); y < h; y += 2) {
      const depth = (y / h - .627) / .373;
      const dx = (Math.sin(y * .48 - t * 2.3) + .47 * Math.sin(y * .91 + t * 1.7)
        + .3 * Math.sin(y * .17 - t * 1.1)) * depth * w * .0018;
      const dy = Math.sin(y * .24 - t * 2) * depth * .65;
      ctx.drawImage(this.water, 0, (y + dy) / h * this.water.naturalHeight,
        this.water.naturalWidth, 2 / h * this.water.naturalHeight, dx, y, w, 2);
    }
    this.canvas.classList.add('is-painted');
  }
}
