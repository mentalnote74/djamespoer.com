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
import { SlideImage } from '../slide-image/slide-image';
import { PublicTrack } from '../../services/public-track';

@Component({
  host: { '[class.hero-view]': 'hero()' },
  selector: 'app-ips-slide',
  imports: [SlideImage, RouterLink, PublicTrack, LucidePause, LucidePlay],
  templateUrl: './ips-slide.html',
  styleUrls: ['./ips-slide.scss', '../slide-visual/hero-presentation.scss'],
})
export class IpsSlide {
  readonly active = input(true);
  readonly hero = input(false);
  readonly motionPaused = signal(false);
  readonly pageVisible = signal(false);
  readonly enhanced = signal(false);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  readonly mechanismSizes =
    '(max-width: 600px) calc(78vw - 2rem), (min-width: 1344px) 778px, calc(61vw - 2rem)';
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
