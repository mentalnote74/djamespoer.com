import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PERSPECTIVE_CANDIDATES,
  PerspectiveCandidateKey,
  candidateParticleConfig,
} from './perspective-candidate.config';

interface ParticleInstance {
  pJS: {
    canvas: { el: HTMLCanvasElement; w: number; h: number };
    fn: {
      drawAnimFrame?: number;
      checkAnimFrame?: number;
      particlesRefresh: () => void;
      vendors: { draw: () => void };
    };
  };
}
type ParticleWindow = Window & {
  particlesJS?: (id: string, config: unknown) => void;
  pJSDom?: ParticleInstance[];
};
let nextId = 0;

@Component({
  selector: 'app-perspective-candidate',
  imports: [RouterLink],
  templateUrl: './perspective-candidate.html',
  styleUrl: './perspective-candidate.scss',
})
export class PerspectiveCandidate implements AfterViewInit, OnDestroy {
  readonly facet = input.required<PerspectiveCandidateKey>();
  readonly showCopy = input(true);
  readonly candidate = computed(() => PERSPECTIVE_CANDIDATES[this.facet()]);
  readonly paused = signal(false);
  readonly reducedMotion = signal(false);
  readonly particleId = `perspective-particles-${nextId++}`;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private observer?: IntersectionObserver;
  private resizeObserver?: ResizeObserver;
  private instance?: ParticleInstance;
  private visible = false;
  private destroyed = false;
  private pendingScript?: HTMLScriptElement;

  ngAfterViewInit(): void {
    this.reducedMotion.set(this.preference.matches);
    this.preference.addEventListener('change', this.motionChanged);
    document.addEventListener('visibilitychange', this.updateAnimation);
    // Hidden carousel slides must never initialize in a zero-sized viewport.
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.updateAnimation();
    });
    this.observer.observe(this.element.nativeElement);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.instance || !this.visible) return;
        const canvas = this.instance.pJS.canvas;
        canvas.w = canvas.el.offsetWidth;
        canvas.h = canvas.el.offsetHeight;
        this.instance.pJS.fn.particlesRefresh();
        this.updateAnimation();
      });
      this.resizeObserver.observe(this.element.nativeElement);
    }
  }

  toggleAnimation(): void {
    this.paused.update((value) => !value);
    this.updateAnimation();
  }

  private readonly motionChanged = (event: MediaQueryListEvent): void => {
    this.reducedMotion.set(event.matches);
    this.updateAnimation();
  };

  private readonly updateAnimation = (): void => {
    if (this.destroyed) return;
    const shouldRun = this.visible && !document.hidden && !this.paused() && !this.reducedMotion();
    if (this.instance) {
      this.stopFrames();
      if (shouldRun) this.instance.pJS.fn.vendors.draw();
    } else if (shouldRun) this.loadLibrary();
  };

  private loadLibrary(): void {
    if ((window as ParticleWindow).particlesJS) {
      this.initialize();
      return;
    }
    if (this.pendingScript) return;
    const existing = document.querySelector<HTMLScriptElement>('script[data-particles-js]');
    const script = existing ?? document.createElement('script');
    this.pendingScript = script;
    script.addEventListener('load', this.scriptLoaded, { once: true });
    if (!existing) {
      script.src = '/js/particles.min.js';
      script.async = true;
      script.dataset['particlesJs'] = 'true';
      document.body.appendChild(script);
    }
  }

  private readonly scriptLoaded = (): void => {
    this.pendingScript = undefined;
    this.updateAnimation();
  };

  private initialize(): void {
    const particleWindow = window as ParticleWindow;
    particleWindow.particlesJS?.(this.particleId, candidateParticleConfig(this.facet()));
    this.instance = particleWindow.pJSDom?.find(
      ({ pJS }) => pJS.canvas.el.parentElement?.id === this.particleId,
    );
  }

  private stopFrames(): void {
    for (const id of [this.instance?.pJS.fn.drawAnimFrame, this.instance?.pJS.fn.checkAnimFrame]) {
      if (id !== undefined) window.cancelAnimationFrame(id);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopFrames();
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    this.preference.removeEventListener('change', this.motionChanged);
    document.removeEventListener('visibilitychange', this.updateAnimation);
    this.pendingScript?.removeEventListener('load', this.scriptLoaded);
    this.instance?.pJS.canvas.el.remove();
    const registry = (window as ParticleWindow).pJSDom;
    const index = this.instance ? registry?.indexOf(this.instance) : undefined;
    if (index !== undefined && index >= 0) registry?.splice(index, 1);
    // Never call particles.js destroypJS(): it clears the global registry, including Hero.
  }
}
