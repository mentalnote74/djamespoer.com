import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucidePause, LucidePlay } from '@lucide/angular';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-buildometer-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './buildometer-slide.html',
  styleUrl: './buildometer-slide.scss',
})
export class BuildometerSlide {
  readonly active = input(true);
  readonly motionPaused = signal(false);
  readonly pageVisible = signal(false);
  readonly enhanced = signal(false);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  private readonly rendered = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      const update = () => this.pageVisible.set(!this.document.hidden);
      update();
      this.rendered.set(true);
      this.document.addEventListener('visibilitychange', update);
      this.destroyRef.onDestroy(() =>
        this.document.removeEventListener('visibilitychange', update),
      );
    });
    effect(() => {
      // Artwork enhancement is first-use only, after hydration; no metric provider is mounted.
      if (this.rendered() && this.active()) this.enhanced.set(true);
    });
  }
}
