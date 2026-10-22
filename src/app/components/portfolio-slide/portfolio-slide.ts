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
  selector: 'app-portfolio-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './portfolio-slide.html',
  styleUrl: './portfolio-slide.scss',
})
export class PortfolioSlide {
  readonly active = input(true);
  readonly motionPaused = signal(false);
  readonly pageVisible = signal(false);
  readonly enhanced = signal(false);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  readonly frontSizes =
    '(max-width: 600px) calc(70vw - 2rem), (min-width: 1344px) 602px, calc(48vw - 2rem)';
  readonly echoSizes = '(max-width: 600px) 180px, (min-width: 1344px) 500px, 40vw';
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
