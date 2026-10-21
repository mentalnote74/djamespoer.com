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
import { PublicTrack } from '../../services/public-track';

// Existing case-study anchor only. A future dedicated route changes this destination,
// not the artwork, carousel, or application routing.
export const THINGAMAJOB_SLIDE_DESTINATION = {
  route: '/thingamajob',
  fragment: 'case-study-heading',
} as const;

@Component({
  selector: 'app-thingamajob-slide',
  imports: [RouterLink, PublicTrack],
  templateUrl: './thingamajob-slide.html',
  styleUrl: './thingamajob-slide.scss',
})
export class ThingamajobSlide {
  readonly active = input(true);
  readonly destination = THINGAMAJOB_SLIDE_DESTINATION;
  readonly pageVisible = signal(false);
  readonly enhanced = signal(false);
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
      // No SVG cutout requests during initial Engineering startup. Add the
      // absolutely positioned enhancement only after hydration and first use.
      if (this.rendered() && this.active()) this.enhanced.set(true);
    });
  }
}
