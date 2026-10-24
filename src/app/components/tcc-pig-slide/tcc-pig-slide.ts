import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePause, LucidePlay } from '@lucide/angular';
import { SlideImage } from '../slide-image/slide-image';
import { PublicTrack } from '../../services/public-track';
import { PIG_KISS_FALLBACK, PIG_REST_FALLBACK } from './tcc-pig-fallback';

interface PigFrame {
  readonly id: number;
  readonly sources: readonly string[];
}

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
  readonly restFallback = PIG_REST_FALLBACK;
  readonly kissFallback = PIG_KISS_FALLBACK;
  readonly frames = signal<readonly PigFrame[]>([]);
  readonly presented = signal(0);
  readonly preparationFailed = signal(false);
  private readonly ready = computed(() => this.presented() !== 0);
  private readonly injector = inject(Injector);
  private preparation = 0;
  private selection = '';
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

  async checkReady(): Promise<void> {
    const images = [
      ...this.element.nativeElement.querySelectorAll<HTMLImageElement>('.preparing img'),
    ];
    if (
      images.length !== this.layers.length ||
      images.some((image) => !image.complete || !image.naturalWidth)
    )
      return;
    const sources = images.map((image) => image.currentSrc);
    const selection = sources.join('\n');
    if (selection === this.selection) return;
    this.selection = selection;
    const id = ++this.preparation;
    this.preparationFailed.set(false);
    try {
      await Promise.all(images.map((image) => image.decode()));
      if (
        this.destroy.destroyed ||
        id !== this.preparation ||
        images.some((image, index) => image.currentSrc !== sources[index])
      )
        return;
      const frame: PigFrame = { id, sources };
      // Pin displayed URLs: responsive picture changes prepare a replacement
      // instead of independently changing the current complete expression.
      this.frames.update((frames) => [
        ...frames.filter((frame) => frame.id === this.presented()),
        frame,
      ]);
      afterNextRender(() => void this.present(frame), { injector: this.injector });
    } catch {
      this.failPreparation(id);
    }
  }

  private async present(frame: PigFrame): Promise<void> {
    const images = [
      ...this.element.nativeElement.querySelectorAll<HTMLImageElement>(
        `[data-pig-frame="${frame.id}"] img`,
      ),
    ];
    if (images.length !== this.layers.length) return;
    try {
      // Decode the actual buffered DOM images as well, not just their loaders.
      await Promise.all(images.map((image) => image.decode()));
      const view = this.document.defaultView;
      if (!view || this.destroy.destroyed || frame.id !== this.preparation) return;
      view.requestAnimationFrame(() => {
        if (this.destroy.destroyed || frame.id !== this.preparation) return;
        this.presented.set(frame.id);
        view.requestAnimationFrame(() => {
          if (!this.destroy.destroyed)
            this.frames.update((frames) => frames.filter((frame) => frame.id >= this.presented()));
        });
      });
    } catch {
      this.failPreparation(frame.id);
    }
  }

  private failPreparation(id: number): void {
    if (this.destroy.destroyed || id !== this.preparation) return;
    this.preparationFailed.set(true);
    this.frames.update((frames) => frames.filter((frame) => frame.id === this.presented()));
    // No retry loop. The inline complete pig, or the last complete frame,
    // remains visible. A genuinely different responsive selection may prepare.
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
      const onImageError = (event: Event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement)) return;
        if (image.closest('.preparing')) this.failPreparation(++this.preparation);
        else {
          const frame = image.closest<HTMLElement>('[data-pig-frame]');
          if (frame) this.failPreparation(Number(frame.dataset['pigFrame']));
        }
      };
      this.element.nativeElement.addEventListener('error', onImageError, true);
      this.document.addEventListener('visibilitychange', update);
      reduced.addEventListener('change', update);
      forced.addEventListener('change', update);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        this.document.removeEventListener('visibilitychange', update);
        reduced.removeEventListener('change', update);
        forced.removeEventListener('change', update);
        this.element.nativeElement.removeEventListener('error', onImageError, true);
      });
    });
  }
}
