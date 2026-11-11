import { LivingChameleon } from './living-chameleon';

/** Browser-only scene renderer. Keeps frame updates outside Angular change detection. */
export class ConservatoryMotion {
  private frame = 0;
  private previous = 0;
  private elapsed = 0;
  private painted = 0;
  private readonly skin: LivingChameleon;
  private readonly canvas: HTMLCanvasElement;
  private readonly water: HTMLImageElement;
  private readonly animal: HTMLElement;
  private readonly strikeSvg: SVGSVGElement;
  private target = { x: -310, y: 180 };
  private targetLocked = false;
  private catchPoint: { x: number; y: number } | null = null;
  private readonly tongue: SVGPathElement;
  private readonly tip: SVGEllipseElement;
  private readonly fly: SVGGElement;
  private readonly context: CanvasRenderingContext2D | null;

  constructor(private readonly root: HTMLElement, private readonly transitionAt: () => number | null,
    private readonly hero: () => boolean) {
    this.canvas = root.querySelector<HTMLCanvasElement>('.water-ripples')!;
    this.water = root.querySelector<HTMLImageElement>('.reflections-material img')!;
    this.animal = root.querySelector<HTMLElement>('.chameleon-perch')!;
    this.skin = new LivingChameleon(this.animal);
    this.strikeSvg = root.querySelector<SVGSVGElement>('.chameleon-strike')!;
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
    this.targetLocked = false;
    this.catchPoint = null;
    this.animal.dataset['skin'] = 'disco';
    this.animal.style.setProperty('--breath', '1');
    this.animal.style.setProperty('--eye-turn', '0px');
    this.skin.render(0, true);
    this.tongue.style.opacity = this.tip.style.opacity = this.fly.style.opacity = '0';
  }

  private readonly tick = (now: number): void => {
    this.elapsed += Math.min((now - this.previous) / 1000, .1);
    this.previous = now;
    const t = this.elapsed;
    const deadline = this.transitionAt();
    const remaining = deadline === null ? (this.hero() ? 9 - t % 9 : Infinity) : (deadline - Date.now()) / 1000;
    const skinPhase = t % 9;
    this.animal.dataset['skin'] = skinPhase < 3 ? 'disco' : skinPhase < 6 ? 'tartan' : 'neon';
    this.animal.style.setProperty('--breath', String(1 + Math.sin(t * 1.65) * .003));
    this.animal.style.setProperty('--eye-turn', `${remaining < 1.65 ? -.55 : Math.sin(t * .7) * .32}px`);
    this.skin.render(t);
    if (remaining > 1.65) {
      this.targetLocked = false;
      this.catchPoint = null;
    } else if (!this.targetLocked) {
      this.aimTongue();
      this.targetLocked = true;
    }
    const strike = .66 - remaining;
    const flyX = this.target.x + 8 * Math.sin(t * 8);
    const flyY = this.target.y + 7 * Math.sin(t * 11);
    if (strike >= 0 && !this.catchPoint) this.catchPoint = { x: flyX, y: flyY };
    const target = this.catchPoint ?? { x: flyX, y: flyY };
    // Full reach holds for 35ms, making the catch legible without slowing the flick.
    const extension = strike < 0 || strike >= .165 ? 0
      : strike < .055 ? 1 - (1 - strike / .055) ** 2
      : strike < .09 ? 1 : (1 - (strike - .09) / .075) ** 1.35;
    const x = 16 + (target.x - 16) * extension, y = 270 + (target.y - 270) * extension;
    const dx = x - 16, dy = y - 270, length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length, ny = dx / length;
    const bend = length * .018 * Math.sin(Math.PI * extension) * (strike < .09 ? .6 : 1);
    const c1x = 16 + dx * .34 + nx * bend, c1y = 270 + dy * .34 + ny * bend;
    const c2x = 16 + dx * .72 + nx * bend, c2y = 270 + dy * .72 + ny * bend;
    this.tongue.setAttribute('d',
      `M${16 + nx * 8} ${270 + ny * 8} C${c1x + nx * 12} ${c1y + ny * 12} ${c2x + nx * 8} ${c2y + ny * 8} ${x + nx * 5} ${y + ny * 5} L${x - nx * 5} ${y - ny * 5} C${c2x - nx * 8} ${c2y - ny * 8} ${c1x - nx * 12} ${c1y - ny * 12} ${16 - nx * 8} ${270 - ny * 8}Z`);
    this.tongue.style.opacity = this.tip.style.opacity = extension > 0 ? '1' : '0';
    this.tip.setAttribute('cx', String(x));
    this.tip.setAttribute('cy', String(y));
    this.tip.setAttribute('transform', `rotate(${Math.atan2(dy, dx) * 180 / Math.PI} ${x} ${y})`);
    this.fly.style.opacity = remaining < 1.65 && remaining > .2 && strike < .165 ? '1' : '0';
    this.fly.setAttribute('transform', strike < .055 ? `translate(${target.x} ${target.y})` : `translate(${x} ${y})`);
    if (now - this.painted >= 33) {
      this.drawWater(t);
      this.painted = now;
    }
    this.frame = requestAnimationFrame(this.tick);
  };

  private aimTongue(): void {
    const matrix = this.strikeSvg.getScreenCTM();
    if (!matrix) return;
    const mouth = new DOMPoint(16, 270).matrixTransform(matrix);
    const button = this.root.querySelector<HTMLElement>('.slide-explore')?.getBoundingClientRect();
    const scene = this.root.getBoundingClientRect();
    const buttonX = button?.width ? button.left + button.width / 2 : scene.left + scene.width * .1;
    const buttonY = button?.height ? button.top + button.height / 2 : scene.top + scene.height * .63;
    const goal = new DOMPoint(mouth.x + (buttonX - mouth.x) * 2 / 3,
      mouth.y + (buttonY - mouth.y) * 2 / 3).matrixTransform(matrix.inverse());
    this.target = { x: goal.x, y: goal.y };
  }

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
