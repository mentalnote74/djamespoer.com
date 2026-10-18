import { PublicTrack } from '../../services/public-track';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { PerspectiveMagic } from './perspective-magic';
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
  imports: [PublicTrack, RouterLink, PerspectiveMagic],
  templateUrl: './perspective-slide.html',
  styleUrl: './perspective-slide.scss',
})
export class PerspectiveSlide {
  readonly homepageOptimized = input(false);
  readonly magicReady = signal(false);
  readonly motionPaused = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private scheduled = false;
  private deferOnMobile(): boolean {
    return this.homepageOptimized() && window.matchMedia('(max-width: 600px)').matches;
  }
  constructor() {
    afterNextRender(() => {
      if (!this.deferOnMobile()) this.magicReady.set(true);
    });
  }
  private scheduleMagic(): void {
    if (this.magicReady() || this.scheduled) return;
    this.scheduled = true;
    // Two finite paint callbacks, then idle: base artwork never waits for this import.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const activate = () => {
          if (!this.destroyRef.destroyed) this.magicReady.set(true);
        };
        if ('requestIdleCallback' in window) {
          const idle = window.requestIdleCallback(activate, { timeout: 1500 });
          this.destroyRef.onDestroy(() => window.cancelIdleCallback(idle));
        } else {
          const timer = setTimeout(activate, 150);
          this.destroyRef.onDestroy(() => clearTimeout(timer));
        }
      });
    });
    this.destroyRef.onDestroy(() => cancelAnimationFrame(frame));
  }
  readonly artworkSource = signal('');
  captureArtwork(event: Event): void {
    const image = event.target;
    if (image instanceof HTMLImageElement) {
      this.artworkSource.set(image.currentSrc);
      if (this.deferOnMobile()) this.scheduleMagic();
      else this.magicReady.set(true);
    }
  }
  readonly pageHeading = input(false);
  readonly showExplore = input(true);
  readonly kind = input.required<ArtworkSlide>();
  readonly copy = computed(() => ARTWORK_SLIDES[this.kind()]);
  readonly sizes = '(min-width: 1344px) 1280px, calc(100vw - clamp(1rem, 4vw, 2rem) * 2 - 2px)';
  mobileSrcset(format: 'avif' | 'webp') {
    return [384, 768, 1200]
      .map((width) => `/assets/perspectives/mobile/${this.kind()}-${width}.${format} ${width}w`)
      .join(', ');
  }
  srcset(format: 'avif' | 'webp') {
    return [768, 1200, 2172]
      .map((width) => `/assets/perspectives/overnight/${this.kind()}-${width}.${format} ${width}w`)
      .join(', ');
  }
}
