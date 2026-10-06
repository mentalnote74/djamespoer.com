import {
  AfterContentInit,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CarouselSlide } from './carousel-slide';

export const CAROUSEL_INTERVAL_MS = 5_000;
const REQUIRED_SLIDE_COUNT = 6;

@Component({
  imports: [NgTemplateOutlet],
  selector: 'app-carousel',
  styleUrl: './carousel.scss',
  templateUrl: './carousel.html',
})
export class Carousel implements AfterContentInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  readonly slides = contentChildren(CarouselSlide);
  readonly currentIndex = signal(0);
  readonly prefersReducedMotion = signal(this.motionPreference.matches);
  readonly isPlaying = signal(!this.motionPreference.matches);
  readonly currentPosition = computed(() => this.currentIndex() + 1);

  private readonly rotationEffect = effect((onCleanup) => {
    const slideCount = this.slides().length;

    if (!this.isPlaying() || this.prefersReducedMotion() || slideCount < 2) {
      return;
    }

    const timer = window.setInterval(() => this.advance(), CAROUSEL_INTERVAL_MS);
    onCleanup(() => window.clearInterval(timer));
  });

  constructor() {
    this.motionPreference.addEventListener('change', this.handleMotionPreferenceChange);
    this.destroyRef.onDestroy(() => {
      this.motionPreference.removeEventListener('change', this.handleMotionPreferenceChange);
    });
  }

  ngAfterContentInit(): void {
    if (this.slides().length !== REQUIRED_SLIDE_COUNT) {
      throw new Error(`Carousel requires exactly ${REQUIRED_SLIDE_COUNT} slides.`);
    }
  }

  showPreviousSlide(): void {
    this.pause();
    this.currentIndex.update((index) => (index - 1 + REQUIRED_SLIDE_COUNT) % REQUIRED_SLIDE_COUNT);
  }

  showNextSlide(): void {
    this.pause();
    this.advance();
  }

  showSlide(index: number): void {
    if (index < 0 || index >= REQUIRED_SLIDE_COUNT) {
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

    if (!this.prefersReducedMotion()) {
      this.isPlaying.set(true);
    }
  }

  private readonly handleMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    this.prefersReducedMotion.set(event.matches);

    if (event.matches) {
      this.pause();
    }
  };

  private pause(): void {
    this.isPlaying.set(false);
  }

  private advance(): void {
    this.currentIndex.update((index) => (index + 1) % REQUIRED_SLIDE_COUNT);
  }
}
