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
  host: { '[class.hero-view]': 'hero()' },
  selector: 'app-djp-sunset-slide',
  imports: [SlideImage, RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './djp-sunset-slide.html',
  styleUrls: [
    './djp-sunset-slide.art.scss',
    './djp-sunset-slide.copy.scss',
    './djp-sunset-slide.motion.scss',
    '../slide-visual/hero-presentation.scss',
  ],
})
export class DjpSunsetSlide {
  readonly active = input(true);
  readonly hero = input(false);
  readonly priority = input(false);
  readonly sceneId = input('djp-sunset-v2');
  readonly motionPaused = signal(false);
  private readonly visible = signal(false);
  private readonly inView = signal(false);
  private readonly reduced = signal(true);
  readonly running = computed(
    () =>
      this.active() && this.visible() && this.inView() && !this.motionPaused() && !this.reduced(),
  );
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      const media = view.matchMedia('(prefers-reduced-motion: reduce)');
      const updateVisibility = () => this.visible.set(!this.document.hidden);
      const updateMotion = () => {
        this.reduced.set(media.matches);
      };
      updateVisibility();
      updateMotion();
      this.document.addEventListener('visibilitychange', updateVisibility);
      media.addEventListener('change', updateMotion);
      const observer = new IntersectionObserver((entries) =>
        this.inView.set(entries.some((entry) => entry.isIntersecting)),
      );
      observer.observe(this.element.nativeElement);
      this.destroy.onDestroy(() => {
        this.document.removeEventListener('visibilitychange', updateVisibility);
        media.removeEventListener('change', updateMotion);
        observer.disconnect();
      });
    });
  }

  toggleMotion(): void {
    this.motionPaused.update((value) => !value);
  }
}
