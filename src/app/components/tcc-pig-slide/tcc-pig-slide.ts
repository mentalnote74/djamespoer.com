import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePause, LucidePlay } from '@lucide/angular';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-tcc-pig-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './tcc-pig-slide.html',
  styleUrls: ['./tcc-pig-slide.scss', './tcc-pig-slide.motion.scss'],
})
export class TccPigSlide {
  readonly active = input(true);
  readonly hero = input(false);
  readonly motionPaused = signal(false);
  private readonly inView = signal(false);
  private readonly visible = signal(false);
  private readonly reduced = signal(true);
  private readonly forced = signal(true);
  private readonly ready = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);

  // Losing eligibility removes the animation, resetting both features to rest.
  // Manual pause instead freezes its timeline and resumes from that same pose.
  readonly eligible = computed(
    () =>
      this.active() &&
      this.inView() &&
      this.visible() &&
      this.ready() &&
      !this.reduced() &&
      !this.forced(),
  );
  readonly running = computed(() => this.eligible() && !this.motionPaused());
  readonly layers = [
    { name: 'base', x: 0, y: 0, w: 2172, h: 724, sx: 0, sy: 0 },
    { name: 'eye-open', x: 1410, y: 185, w: 185, h: 165, sx: 4, sy: 728 },
    { name: 'eye-wink', x: 1410, y: 185, w: 185, h: 165, sx: 197, sy: 728 },
    { name: 'mouth-rest', x: 1500, y: 415, w: 400, h: 200, sx: 390, sy: 728 },
    { name: 'mouth-kiss', x: 1500, y: 415, w: 400, h: 200, sx: 798, sy: 728 },
  ];
  readonly sizes =
    '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  atlasSrcset(format: 'avif' | 'webp'): string {
    return [384, 768, 1200, 1440, 2172]
      .map((width) => `/assets/pig-sprite/atlas-${width}.${format} ${width}w`)
      .join(', ');
  }

  checkReady(): void {
    const images = this.element.nativeElement.querySelectorAll<HTMLImageElement>('.art img');
    this.ready.set(
      images.length === this.layers.length &&
        [...images].every((image) => image.complete && image.naturalWidth > 0),
    );
  }

  toggleMotion(): void {
    this.motionPaused.update((value) => !value);
  }

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
      const forced = view.matchMedia('(forced-colors: active)');
      const update = () => {
        this.visible.set(!this.document.hidden);
        this.reduced.set(reduced.matches);
        this.forced.set(forced.matches);
      };
      update();
      this.checkReady();
      const observer = new IntersectionObserver((entries) =>
        this.inView.set(entries.some((entry) => entry.isIntersecting)),
      );
      observer.observe(this.element.nativeElement);
      this.document.addEventListener('visibilitychange', update);
      reduced.addEventListener('change', update);
      forced.addEventListener('change', update);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        this.document.removeEventListener('visibilitychange', update);
        reduced.removeEventListener('change', update);
        forced.removeEventListener('change', update);
      });
    });
  }
}
