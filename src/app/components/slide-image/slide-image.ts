import { Component, computed, input, output } from '@angular/core';

// A picture element with the one registered-canvas export contract. Scene
// components still own composition, effects, active state and motion controls.
@Component({
  selector: 'app-slide-image',
  templateUrl: './slide-image.html',
  styleUrl: './slide-image.scss',
})
export class SlideImage {
  readonly layer = input.required<string>();
  readonly priority = input(false);
  readonly mobileMax = input(1200);
  readonly sizes = input(
    '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)',
  );
  readonly loaded = output<void>();
  readonly root = computed(() => '/assets/registered-slides/' + this.layer().split('/')[0] + '/');
  readonly name = computed(() => this.layer().split('/')[1]);
  srcset(family: 'desktop' | 'mobile', format: 'avif' | 'webp'): string {
    const widths =
      family === 'desktop'
        ? [768, 1440, 2172]
        : [
            ...new Set([
              384,
              768,
              ...[1200, 1440, 2172].filter((w) => w <= this.mobileMax()),
              this.mobileMax(),
            ]),
          ];
    return widths
      .map((w) => `${this.root()}${family}/${this.name()}-${w}.${format} ${w}w`)
      .join(', ');
  }
}
