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
  selector: 'app-blognostisphere-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './blognostisphere-slide.html',
  styleUrls: ['./blognostisphere-slide.scss', './blognostisphere-slide.motion.scss'],
})
export class BlognostisphereSlide {
  readonly active = input(true);
  readonly motionPaused = signal(false);
  private readonly visible = signal(false);
  private readonly inView = signal(false);
  private readonly reduced = signal(true);
  private readonly forced = signal(true);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  readonly running = computed(
    () =>
      this.active() &&
      this.visible() &&
      this.inView() &&
      !this.reduced() &&
      !this.forced() &&
      !this.motionPaused(),
  );

  // Coordinates and crop dimensions are registered to the approved 2172 × 724 master.
  readonly layers = [
    { name: 'sky', x: 0, y: 0, w: 2172, h: 724, small: 480, large: 960 },
    { name: 'cloud-far', x: 0, y: 365, w: 1010, h: 235, small: 320, large: 640 },
    { name: 'cloud-near', x: 0, y: 455, w: 1030, h: 269, small: 320, large: 640 },
    { name: 'wisp', x: 1370, y: 445, w: 802, h: 279, small: 256, large: 512 },
    { name: 'foreground', x: 0, y: 0, w: 2172, h: 724, small: 768, large: 1440 },
    { name: 'spectral', x: 520, y: 0, w: 790, h: 415, small: 240, large: 480 },
    { name: 'amber', x: 1320, y: 228, w: 213, h: 179, small: 96, large: 192 },
    { name: 'cyan', x: 1607, y: 268, w: 62, h: 131, small: 48, large: 96 },
    { name: 'reflection', x: 1670, y: 540, w: 502, h: 184, small: 192, large: 384 },
    { name: 'brass', x: 1165, y: 176, w: 650, h: 323, small: 192, large: 384 },
  ];
  readonly stars = [
    { x: 9, y: 14, delay: '-1.7s', duration: '5.9s' },
    { x: 14.7, y: 7.3, delay: '-4s', duration: '8.3s' },
    { x: 26.6, y: 23.6, delay: '-2.9s', duration: '6.7s' },
    { x: 87.2, y: 5.2, delay: '-5.1s', duration: '9.1s' },
  ];

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
