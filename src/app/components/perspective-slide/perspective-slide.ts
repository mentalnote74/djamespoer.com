import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
export const ARTWORK_SLIDES = {
  ai: { title: 'AI & Innovation', line: 'Use the machine. Keep the judgment.', route: '/ai' },
  accessibility: {
    title: 'Accessibility',
    line: 'Build the entrance everyone can use.',
    route: '/accessibility',
  },
  ux: {
    title: 'UX & Product',
    line: 'Turn complexity into something people can use.',
    route: '/ux-product',
  },
  engineering: {
    title: 'Engineering',
    line: 'Build the structure. Solve at the right layer.',
    route: '/engineering',
  },
  impact: { title: 'Impact', line: 'Evidence leaves a mark.', route: '/impact' },
} as const;
export type ArtworkSlide = keyof typeof ARTWORK_SLIDES;
@Component({
  selector: 'app-perspective-slide',
  imports: [RouterLink],
  templateUrl: './perspective-slide.html',
  styleUrl: './perspective-slide.scss',
})
export class PerspectiveSlide {
  readonly kind = input.required<ArtworkSlide>();
  readonly copy = computed(() => ARTWORK_SLIDES[this.kind()]);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  srcset(format: 'avif' | 'webp') {
    return [768, 1200, 2172]
      .map((width) => `/assets/perspectives/overnight/${this.kind()}-${width}.${format} ${width}w`)
      .join(', ');
  }
}
