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
  selector: 'app-exl-lifepro-slide',
  imports: [RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './exl-lifepro-slide.html',
  styleUrl: './exl-lifepro-slide.scss',
})
export class ExlLifeproSlide {
  readonly active = input(true);
  readonly motionPaused = signal(false);
  readonly pageVisible = signal(false);
  readonly enhanced = signal(false);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  readonly baySizes =
    '(max-width: 600px) calc(89vw - 2rem), (min-width: 1344px) 548px, calc(43vw - 2rem)';
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
      // Enhancement never participates in initial Engineering paint/hydration.
      if (this.rendered() && this.active()) this.enhanced.set(true);
    });
  }
}
