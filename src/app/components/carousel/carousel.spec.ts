import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CAROUSEL_INTERVAL_MS, Carousel } from './carousel';
import { CarouselSlide } from './carousel-slide';

@Component({
  imports: [Carousel, CarouselSlide],
  template: `
    <app-carousel>
      <ng-template appCarouselSlide label="Engineering">
        <h3>Engineering</h3>
        <button type="button">Engineering action</button>
      </ng-template>
      <ng-template appCarouselSlide label="UX & Product">
        <h3>UX &amp; Product</h3>
        <button type="button">UX &amp; Product action</button>
      </ng-template>
      <ng-template appCarouselSlide label="Accessibility">
        <h3>Accessibility</h3>
        <button type="button">Accessibility action</button>
      </ng-template>
      <ng-template appCarouselSlide label="AI & Innovation">
        <h3>AI &amp; Innovation</h3>
        <button type="button">AI &amp; Innovation action</button>
      </ng-template>
      <ng-template appCarouselSlide label="Creative">
        <h3>Creative</h3>
        <button type="button">Creative action</button>
      </ng-template>
      <ng-template appCarouselSlide label="Impact">
        <h3>Impact</h3>
        <button type="button">Impact action</button>
      </ng-template>
    </app-carousel>
  `,
})
class CarouselTestHost {}

describe('Carousel', () => {
  let reducedMotion = false;
  let mediaQueryList: MediaQueryList;

  beforeEach(async () => {
    vi.useFakeTimers();
    reducedMotion = false;

    mediaQueryList = {
      get matches() {
        return reducedMotion;
      },
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList;

    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mediaQueryList));

    await TestBed.configureTestingModule({
      imports: [CarouselTestHost],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function createCarousel(): {
    component: Carousel;
    fixture: ComponentFixture<CarouselTestHost>;
    root: HTMLElement;
  } {
    const fixture = TestBed.createComponent(CarouselTestHost);
    fixture.detectChanges();

    const component = fixture.debugElement.query(By.directive(Carousel))
      .componentInstance as Carousel;

    return { component, fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('renders the six approved slide positions with the first slide active', () => {
    const { root } = createCarousel();
    const slides = Array.from(root.querySelectorAll<HTMLElement>('.carousel__slide'));

    expect(slides).toHaveLength(6);
    expect(slides.map((slide) => slide.querySelector('h3')?.textContent?.trim())).toEqual([
      'Engineering',
      'UX & Product',
      'Accessibility',
      'AI & Innovation',
      'Creative',
      'Impact',
    ]);
    expect(slides[0]?.hidden).toBe(false);
    expect(slides.slice(1).every((slide) => slide.hidden)).toBe(true);
  });

  it('automatically advances after five seconds', () => {
    const { component, fixture } = createCarousel();

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(1);
  });

  it('automatically wraps from slide six to slide one', () => {
    const { component, fixture } = createCarousel();

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS * 6);
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(0);
  });

  it('shows the previous slide and pauses automatic rotation', () => {
    const { component, fixture, root } = createCarousel();

    root.querySelector<HTMLButtonElement>('button[aria-label="Previous slide"]')?.click();
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(5);
    expect(component.isPlaying()).toBe(false);

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(5);
  });

  it('shows the next slide, pauses rotation, and preserves control focus', () => {
    const { component, fixture, root } = createCarousel();
    const next = root.querySelector<HTMLButtonElement>('button[aria-label="Next slide"]');

    next?.focus();
    next?.click();
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(1);
    expect(component.isPlaying()).toBe(false);
    expect(document.activeElement).toBe(next);

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(1);
  });

  it('selects a slide directly and leaves automatic rotation paused', () => {
    const { component, fixture, root } = createCarousel();
    const indicators = root.querySelectorAll<HTMLButtonElement>('.carousel__indicators button');

    indicators[3]?.click();
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(3);
    expect(component.isPlaying()).toBe(false);
    expect(indicators[3]?.getAttribute('aria-current')).toBe('true');
  });

  it('stops and resumes automatic rotation with Pause and Play', () => {
    const { component, fixture, root } = createCarousel();
    const rotationControl = () =>
      root.querySelector<HTMLButtonElement>('.carousel__controls button:nth-child(2)');

    rotationControl()?.click();
    fixture.detectChanges();
    expect(component.isPlaying()).toBe(false);
    expect(rotationControl()?.textContent?.trim()).toBe('Play');

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(0);

    rotationControl()?.click();
    fixture.detectChanges();
    expect(component.isPlaying()).toBe(true);
    expect(rotationControl()?.textContent?.trim()).toBe('Pause');

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(1);
  });

  it('does not auto-rotate with reduced motion and keeps slide navigation available', () => {
    reducedMotion = true;
    const { component, fixture, root } = createCarousel();
    const rotationControl = root.querySelector<HTMLButtonElement>(
      '.carousel__controls button:nth-child(2)',
    );

    expect(component.isPlaying()).toBe(false);
    expect(rotationControl?.disabled).toBe(true);

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS * 2);
    expect(component.currentIndex()).toBe(0);

    root.querySelector<HTMLButtonElement>('button[aria-label="Next slide"]')?.click();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
  });

  it('communicates carousel, slide, position, and rotation state accessibly', () => {
    const { fixture, root } = createCarousel();
    const carousel = root.querySelector<HTMLElement>('.carousel');
    const viewport = root.querySelector<HTMLElement>('.carousel__viewport');
    const slides = root.querySelectorAll<HTMLElement>('.carousel__slide');
    const indicators = root.querySelectorAll<HTMLButtonElement>('.carousel__indicators button');

    expect(carousel?.getAttribute('aria-labelledby')).toBe('portfolio-carousel-heading');
    expect(carousel?.getAttribute('aria-roledescription')).toBe('carousel');
    expect(viewport?.getAttribute('aria-live')).toBe('off');
    expect(slides[0]?.getAttribute('role')).toBe('group');
    expect(slides[0]?.getAttribute('aria-roledescription')).toBe('slide');
    expect(slides[0]?.getAttribute('aria-label')).toBe('Slide 1 of 6: Engineering');
    expect(indicators[0]?.getAttribute('aria-current')).toBe('true');
    expect(indicators[0]?.getAttribute('aria-label')).toBe('Show slide 1: Engineering');

    indicators[1]?.click();
    fixture.detectChanges();
    expect(viewport?.getAttribute('aria-live')).toBe('polite');
    expect(indicators[0]?.hasAttribute('aria-current')).toBe(false);
    expect(indicators[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('keeps interactive content in inactive slides hidden', () => {
    const { root } = createCarousel();
    const inactiveSlides = Array.from(
      root.querySelectorAll<HTMLElement>('.carousel__slide[hidden]'),
    );

    expect(inactiveSlides).toHaveLength(5);
    expect(inactiveSlides.every((slide) => slide.getAttribute('aria-hidden') === 'true')).toBe(
      true,
    );
    expect(inactiveSlides.every((slide) => slide.querySelector('button') !== null)).toBe(true);
  });

  it('cleans up the motion listener and automatic timer when destroyed', () => {
    const { fixture } = createCarousel();

    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
