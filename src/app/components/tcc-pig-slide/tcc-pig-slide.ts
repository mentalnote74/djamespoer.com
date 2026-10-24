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
import { SlideImage } from '../slide-image/slide-image';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-tcc-pig-slide',
  imports: [SlideImage, RouterLink, PublicTrack, LucidePause, LucidePlay],
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
    { name: 'base', x: 0, y: 0, w: 2172, h: 724, small: 768, large: 1440 },
    { name: 'eye-open', x: 1410, y: 185, w: 185, h: 165, small: 96, large: 185 },
    { name: 'eye-wink', x: 1410, y: 185, w: 185, h: 165, small: 96, large: 185 },
    { name: 'mouth-rest', x: 1500, y: 415, w: 400, h: 200, small: 192, large: 400 },
    { name: 'mouth-kiss', x: 1500, y: 415, w: 400, h: 200, small: 192, large: 400 },
  ];

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
