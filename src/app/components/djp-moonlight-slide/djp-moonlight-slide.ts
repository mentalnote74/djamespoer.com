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
  selector: 'app-djp-moonlight-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './djp-moonlight-slide.html',
  styleUrls: [
    './djp-moonlight-slide.art.scss',
    './djp-moonlight-slide.copy.scss',
    './djp-moonlight-slide.motion.scss',
  ],
})
export class DjpMoonlightSlide {
  readonly active = input(true);
  readonly sceneId = input('djp-moonlight-v2');
  readonly motionPaused = signal(false);
  readonly depthX = signal(0);
  readonly depthY = signal(0);
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
        if (media.matches) this.resetDepth();
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
    this.resetDepth();
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.running() || event.pointerType !== 'mouse') return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.depthX.set(((event.clientX - rect.left) / rect.width - 0.5) * 18);
    this.depthY.set(((event.clientY - rect.top) / rect.height - 0.5) * 10);
  }

  resetDepth(): void {
    this.depthX.set(0);
    this.depthY.set(0);
  }
}
