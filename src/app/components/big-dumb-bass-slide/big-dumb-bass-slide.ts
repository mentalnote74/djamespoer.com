import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePause, LucidePlay } from '@lucide/angular';
import { PublicTrack } from '../../services/public-track';

interface ArtworkBatch {
  readonly id: number;
  readonly sources: readonly string[];
}

@Component({
  selector: 'app-big-dumb-bass-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './big-dumb-bass-slide.html',
  styleUrls: ['./big-dumb-bass-slide.scss', './big-dumb-bass-slide.motion.scss'],
})
export class BigDumbBassSlide {
  readonly active = input(true);
  readonly hero = input(false);
  readonly priority = input(false);
  readonly motionPaused = signal(false);
  readonly started = signal(false);
  readonly frames = signal<readonly ArtworkBatch[]>([]);
  readonly presented = signal(0);
  readonly failed = signal(false);
  private readonly inView = signal(false);
  private readonly visible = signal(false);
  private readonly reduced = signal(true);
  private readonly forced = signal(true);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private generation = 0;
  private selection = '';
  readonly layers = ['pond', 'bass', 'lure'] as const;
  readonly root = '/assets/registered-slides/big-dumb-bass/desktop/';
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  readonly ready = computed(() => this.presented() !== 0);
  readonly eligible = computed(
    () =>
      this.active() &&
      this.ready() &&
      this.inView() &&
      this.visible() &&
      !this.reduced() &&
      !this.forced(),
  );
  readonly paused = computed(() => !this.eligible() || this.motionPaused() || this.failed());

  srcset(layer: string, format: 'avif' | 'webp'): string {
    return [768, 1440, 2172]
      .map((width) => `${this.root}${layer}-${width}.${format} ${width}w`)
      .join(', ');
  }

  toggleMotion(): void {
    this.motionPaused.update((value) => !value);
  }

  async prepare(): Promise<void> {
    const images = [
      ...this.element.nativeElement.querySelectorAll<HTMLImageElement>('.preparing img'),
    ];
    if (images.length !== 3 || images.some((image) => !image.complete || !image.naturalWidth))
      return;
    const sources = images.map((image) => image.currentSrc),
      selection = sources.join('\n');
    if (selection === this.selection) return;
    this.selection = selection;
    const id = ++this.generation;
    this.failed.set(false);
    try {
      await Promise.all(images.map((image) => image.decode()));
      if (
        this.destroy.destroyed ||
        id !== this.generation ||
        images.some((image, index) => image.currentSrc !== sources[index])
      )
        return;
      const frame = { id, sources };
      this.frames.update((frames) => [
        ...frames.filter((frame) => frame.id === this.presented()),
        frame,
      ]);
      afterNextRender(() => void this.present(frame), { injector: this.injector });
    } catch {
      this.fail(id);
    }
  }

  private async present(frame: ArtworkBatch): Promise<void> {
    const images = [
      ...this.element.nativeElement.querySelectorAll<HTMLImageElement>(
        `[data-bass-frame="${frame.id}"]`,
      ),
    ];
    if (images.length !== 3) return;
    try {
      await Promise.all(images.map((image) => image.decode()));
      const view = this.document.defaultView;
      if (!view || this.destroy.destroyed || frame.id !== this.generation) return;
      view.requestAnimationFrame(() => {
        if (this.destroy.destroyed || frame.id !== this.generation) return;
        this.presented.set(frame.id);
        view.requestAnimationFrame(() => {
          if (!this.destroy.destroyed)
            this.frames.update((frames) => frames.filter((frame) => frame.id >= this.presented()));
        });
      });
    } catch {
      this.fail(frame.id);
    }
  }

  private fail(id: number): void {
    if (this.destroy.destroyed || id !== this.generation) return;
    this.failed.set(true);
    this.frames.update((frames) => frames.filter((frame) => frame.id === this.presented()));
    // Retain the complete fish-free poster (or current complete batch). No retry timer.
  }

  constructor() {
    effect(() => {
      if (!this.active()) {
        this.started.set(false);
        this.motionPaused.set(false);
      } else if (this.eligible()) {
        // Only leaving the slide ends a visit. Visibility/intersection just pause it.
        this.started.set(true);
      }
    });
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
      void this.prepare();
      const observer = new IntersectionObserver((entries) =>
        this.inView.set(entries.some((entry) => entry.isIntersecting)),
      );
      observer.observe(this.element.nativeElement);
      const onError = (event: Event) => {
        if (!(event.target instanceof HTMLImageElement)) return;
        if (event.target.closest('.preparing')) this.fail(++this.generation);
        else if (event.target.dataset['bassFrame'])
          this.fail(Number(event.target.dataset['bassFrame']));
      };
      this.element.nativeElement.addEventListener('error', onError, true);
      this.document.addEventListener('visibilitychange', update);
      reduced.addEventListener('change', update);
      forced.addEventListener('change', update);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        this.element.nativeElement.removeEventListener('error', onError, true);
        this.document.removeEventListener('visibilitychange', update);
        reduced.removeEventListener('change', update);
        forced.removeEventListener('change', update);
      });
    });
  }
}
