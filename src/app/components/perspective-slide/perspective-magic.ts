import { Component, computed, input } from '@angular/core';
import { PERSPECTIVE_REGIONS } from './perspective-regions';
import type { ArtworkSlide } from './perspective-slide';
let instanceSequence = 0;
@Component({
  selector: 'app-perspective-magic',
  templateUrl: './perspective-magic.html',
  styleUrl: './perspective-magic.scss',
})
export class PerspectiveMagic {
  readonly kind = input.required<ArtworkSlide>();
  readonly source = input.required<string>();
  readonly paused = input(false);
  readonly regionPrefix = `perspective-region-${++instanceSequence}-`;
  readonly regions = computed(() => PERSPECTIVE_REGIONS[this.kind()]);
}
