import { MobileDelivery } from '../../services/mobile-delivery';
import { PublicTrack } from '../../services/public-track';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
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
  readonly active = input(true);
  private readonly delivery = inject(MobileDelivery);
  private readonly rendered = signal(false);
  readonly magicReady = signal(false);
  readonly motionPaused = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private scheduled = false;
  private readonly artwork = viewChild<ElementRef<HTMLImageElement>>('artwork');
  private deferOnMobile(): boolean {
    return this.homepageOptimized() && this.delivery.mobile();
  }
  constructor() {
    afterNextRender(() => {
      this.rendered.set(true);
      // A parser-discovered image can finish before hydration attaches its load listener.
      const image = this.artwork()?.nativeElement;
      if (image?.complete && image.naturalWidth) this.activateArtwork(image);
      else if (!this.deferOnMobile()) this.magicReady.set(true);
    });
    effect(() => {
      if (
        this.rendered() &&
        this.deferOnMobile() &&
        this.delivery.settled() &&
        this.active() &&
        this.artworkSource()
      ) {
        this.scheduleMagic();
      }
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
      this.activateArtwork(image);
    }
  }
  private activateArtwork(image: HTMLImageElement): void {
    this.artworkSource.set(image.currentSrc);
    if (this.deferOnMobile()) {
      if (this.delivery.settled() && this.active()) this.scheduleMagic();
    } else this.magicReady.set(true);
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
