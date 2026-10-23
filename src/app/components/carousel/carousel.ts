import { MobileDelivery } from '../../services/mobile-delivery';
import { LucideChevronLeft, LucideChevronRight, LucidePause, LucidePlay } from '@lucide/angular';
import {
  afterNextRender,
  AfterContentInit,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CarouselSlide } from './carousel-slide';

export const CAROUSEL_INTERVAL_MS = 5_000;

@Component({
  imports: [LucideChevronLeft, LucideChevronRight, LucidePause, LucidePlay, NgTemplateOutlet],
  selector: 'app-carousel',
  styleUrl: './carousel.scss',
  templateUrl: './carousel.html',
})
export class Carousel implements AfterContentInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly browserReady = signal(false);

  readonly delivery = inject(MobileDelivery);
  readonly mobileProfile = input(false);
  private readonly explicitPlay = signal(false);

  readonly showPreviousNext = input(true);
  readonly showPausePlay = input(true);
  readonly autoRotate = input(true);
  /** Milliseconds; reject values that cannot safely schedule a browser timer. */
  readonly rotationInterval = input(CAROUSEL_INTERVAL_MS, {
    transform: (value: number) => {
      if (!Number.isInteger(value) || value <= 0 || value > 2_147_483_647) {
        throw new RangeError('Carousel rotationInterval must be a positive timer-safe integer.');
      }
      return value;
    },
  });
  readonly showSlideNavigation = input(true);
  readonly slides = contentChildren(CarouselSlide);
  readonly slideOrder = input<readonly string[]>([]);
  readonly orderedSlides = computed(() => {
    const slides = this.slides();
    const order = this.slideOrder();
    if (!order.length) return slides;
    const byId = new Map(slides.map((slide) => [slide.id(), slide]));
    const requested = order
      .map((id) => byId.get(id))
      .filter((slide): slide is CarouselSlide => !!slide);
    return [...new Set([...requested, ...slides])];
  });
  readonly currentIndex = linkedSignal<number, number>({
    source: () => this.slides().length,
    computation: (count, previous) => Math.max(0, Math.min(previous?.value ?? 0, count - 1)),
  });
  readonly prefersReducedMotion = signal(false);
  readonly currentSlide = computed(() => this.orderedSlides()[this.currentIndex()]);
  private readonly rotationRequested = linkedSignal(() => this.autoRotate());
  readonly isPlaying = computed(
    () => this.rotationRequested() && !this.prefersReducedMotion() && this.slides().length > 1,
  );
  readonly currentPosition = computed(() => (this.slides().length ? this.currentIndex() + 1 : 0));

  private readonly rotationEffect = effect((onCleanup) => {
    const slideCount = this.slides().length;

    if (
      !this.browserReady() ||
      (this.mobileProfile() &&
        this.delivery.mobile() &&
        !this.delivery.settled() &&
        !this.explicitPlay()) ||
      !this.isPlaying() ||
      this.prefersReducedMotion() ||
      slideCount < 2
    ) {
      return;
    }

    const timer = window.setInterval(() => this.advance(), this.rotationInterval());
    onCleanup(() => window.clearInterval(timer));
  });

  constructor() {
    afterNextRender(() => {
      const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion.set(motionPreference.matches);
      this.browserReady.set(true);
      motionPreference.addEventListener('change', this.handleMotionPreferenceChange);
      this.destroyRef.onDestroy(() => {
        motionPreference.removeEventListener('change', this.handleMotionPreferenceChange);
      });
    });
  }

  ngAfterContentInit(): void {
    if (this.slides().length === 0) {
      throw new Error('Carousel requires at least one slide.');
    }
  }

  showPreviousSlide(): void {
    this.pause();
    const count = this.slides().length;
    if (count) this.currentIndex.update((index) => (index - 1 + count) % count);
  }

  showNextSlide(): void {
    this.pause();
    this.advance();
  }

  showSlide(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.slides().length) {
      return;
    }

    this.pause();
    this.currentIndex.set(index);
  }

  toggleRotation(): void {
    if (this.isPlaying()) {
      this.pause();
      return;
    }

    if (!this.prefersReducedMotion() && this.slides().length > 1) {
      this.explicitPlay.set(true);
      this.rotationRequested.set(true);
    }
  }

  private readonly handleMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    this.prefersReducedMotion.set(event.matches);

    if (event.matches) {
      this.pause();
    }
  };

  private pause(): void {
    this.rotationRequested.set(false);
  }

  private advance(): void {
    const count = this.slides().length;
    if (count) this.currentIndex.update((index) => (index + 1) % count);
  }
}
