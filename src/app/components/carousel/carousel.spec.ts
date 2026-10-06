import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CAROUSEL_INTERVAL_MS, Carousel } from './carousel';
import { CarouselSlide } from './carousel-slide';

@Component({
  imports: [Carousel, CarouselSlide],
  template: `
    <app-carousel
      [showPreviousNext]="showPreviousNext()"
      [showPausePlay]="showPausePlay()"
      [showSlideNavigation]="showSlideNavigation()"
      [autoRotate]="autoRotate()"
      [rotationInterval]="rotationInterval()"
    >
      @for (label of labels(); track label) {
        <ng-template appCarouselSlide [label]="label">
          <h3>{{ label }}</h3>
          <button type="button">{{ label }} action</button>
        </ng-template>
      }
    </app-carousel>
  `,
})
class CarouselTestHost {
  readonly showPreviousNext = signal(true);
  readonly showPausePlay = signal(true);
  readonly autoRotate = signal(true);
  readonly rotationInterval = signal(CAROUSEL_INTERVAL_MS);
  readonly showSlideNavigation = signal(true);
  readonly labels = signal(['First', 'Second', 'Third', 'Fourth']);
}

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

  it('renders supplied slide positions with the first slide active', () => {
    const { root } = createCarousel();
    const slides = Array.from(root.querySelectorAll<HTMLElement>('.carousel__slide'));

    expect(slides).toHaveLength(4);
    expect(slides.map((slide) => slide.querySelector('h3')?.textContent?.trim())).toEqual([
      'First',
      'Second',
      'Third',
      'Fourth',
    ]);
    expect(slides[0]?.hidden).toBe(false);
    expect(slides.slice(1).every((slide) => slide.hidden)).toBe(true);
  });

  it('renders direct navigation by default and when explicitly enabled', () => {
    const { component, fixture, root } = createCarousel();
    expect(component.showSlideNavigation()).toBe(true);
    expect(root.querySelectorAll('.carousel__indicators button')).toHaveLength(
      fixture.componentInstance.labels().length,
    );
    fixture.componentInstance.showSlideNavigation.set(false);
    fixture.detectChanges();
    fixture.componentInstance.showSlideNavigation.set(true);
    fixture.detectChanges();
    expect(root.querySelectorAll('.carousel__indicators button')).toHaveLength(
      fixture.componentInstance.labels().length,
    );
  });

  it('removes direct controls from DOM while retaining functional core controls', () => {
    const { component, fixture, root } = createCarousel();
    fixture.componentInstance.showSlideNavigation.set(false);
    fixture.detectChanges();
    expect(root.querySelector('.carousel__indicators')).toBeNull();
    expect(root.querySelectorAll('button[aria-label^="Show slide"]')).toHaveLength(0);
    const controls = root.querySelectorAll<HTMLButtonElement>('.carousel__controls button');
    expect(controls).toHaveLength(3);
    controls[1]!.click();
    fixture.detectChanges();
    expect(component.isPlaying()).toBe(false);
    expect(root.querySelector('.carousel__viewport')?.getAttribute('aria-live')).toBe('polite');
    controls[2]!.focus();
    controls[2]!.click();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
    expect(document.activeElement).toBe(controls[2]);
    controls[0]!.click();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
    controls[1]!.click();
    fixture.detectChanges();
    expect(component.isPlaying()).toBe(true);
    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
    expect(root.querySelector('.carousel__viewport')?.getAttribute('aria-live')).toBe('off');
    expect(root.querySelector('.carousel__status')?.textContent).toContain('5 seconds');
  });

  it('automatically advances after five seconds', () => {
    const { component, fixture } = createCarousel();

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(1);
  });

  it('automatically wraps after the supplied slide count', () => {
    const { component, fixture } = createCarousel();

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS * fixture.componentInstance.labels().length);
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(0);
  });

  it('shows the previous slide and pauses automatic rotation', () => {
    const { component, fixture, root } = createCarousel();

    root.querySelector<HTMLButtonElement>('button[aria-label="Previous slide"]')?.click();
    fixture.detectChanges();

    expect(component.currentIndex()).toBe(fixture.componentInstance.labels().length - 1);
    expect(component.isPlaying()).toBe(false);

    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(fixture.componentInstance.labels().length - 1);
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
    expect(slides[0]?.getAttribute('aria-label')).toBe(`Slide 1 of ${slides.length}: First`);
    expect(indicators[0]?.getAttribute('aria-current')).toBe('true');
    expect(indicators[0]?.getAttribute('aria-label')).toBe('Show slide 1: First');

    indicators[1]?.click();
    fixture.detectChanges();
    expect(viewport?.getAttribute('aria-live')).toBe('polite');
    expect(indicators[0]?.hasAttribute('aria-current')).toBe(false);
    expect(indicators[1]?.getAttribute('aria-current')).toBe('true');
  });

  it('keeps interactive content in inactive slides hidden', () => {
    const { fixture, root } = createCarousel();
    const inactiveSlides = Array.from(
      root.querySelectorAll<HTMLElement>('.carousel__slide[hidden]'),
    );

    expect(inactiveSlides).toHaveLength(fixture.componentInstance.labels().length - 1);
    expect(inactiveSlides.every((slide) => slide.getAttribute('aria-hidden') === 'true')).toBe(
      true,
    );
    expect(inactiveSlides.every((slide) => slide.querySelector('button') !== null)).toBe(true);
  });

  it.each([1, 2, 7])('navigates and announces %i supplied slides', (count) => {
    const fixture = TestBed.createComponent(CarouselTestHost);
    fixture.componentInstance.labels.set(
      Array.from({ length: count }, (_, index) => `Example ${index + 1}`),
    );
    fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(Carousel))
      .componentInstance as Carousel;
    component.showPreviousSlide();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(count - 1);
    component.showNextSlide();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.carousel__position')?.textContent).toContain(`Slide 1 of ${count}`);
    expect(root.querySelectorAll('.carousel__indicators button')).toHaveLength(count);
    component.showSlide(count);
    component.showSlide(0.5);
    expect(component.currentIndex()).toBe(0);
    if (count === 1) {
      component.toggleRotation();
      fixture.detectChanges();
      expect(component.isPlaying()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      expect(
        root.querySelector<HTMLButtonElement>('.carousel__controls button:nth-child(2)')?.disabled,
      ).toBe(true);
    }
  });

  it('keeps the active index valid when projected slides shrink', () => {
    const { component, fixture } = createCarousel();
    component.showSlide(fixture.componentInstance.labels().length - 1);
    fixture.componentInstance.labels.set(['Remaining']);
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(0);
    expect(component.currentPosition()).toBe(1);
  });

  it('requires a positive slide count', () => {
    const fixture = TestBed.createComponent(CarouselTestHost);
    fixture.componentInstance.labels.set([]);
    expect(() => fixture.detectChanges()).toThrow('Carousel requires at least one slide.');
  });

  it('preserves reusable defaults without consumer configuration', () => {
    TestBed.overrideComponent(CarouselTestHost, {
      set: {
        template: `
      <app-carousel>
        <ng-template appCarouselSlide label="Alpha">Alpha</ng-template>
        <ng-template appCarouselSlide label="Beta">Beta</ng-template>
      </app-carousel>
    `,
      },
    });
    const { component, root } = createCarousel();
    expect(component.showPreviousNext()).toBe(true);
    expect(component.showPausePlay()).toBe(true);
    expect(component.showSlideNavigation()).toBe(true);
    expect(component.autoRotate()).toBe(true);
    expect(component.rotationInterval()).toBe(CAROUSEL_INTERVAL_MS);
    expect(component.isPlaying()).toBe(true);
    expect(root.querySelectorAll('.carousel__controls button')).toHaveLength(3);
    expect(root.querySelectorAll('.carousel__indicators button')).toHaveLength(2);
  });

  it('independently removes Previous/Next and Pause/Play controls from DOM', () => {
    const { fixture, root } = createCarousel();
    fixture.componentInstance.showPreviousNext.set(false);
    fixture.detectChanges();
    expect(root.querySelector('button[aria-label="Previous slide"]')).toBeNull();
    expect(root.querySelector('button[aria-label="Next slide"]')).toBeNull();
    expect(root.querySelector('.carousel__controls button[aria-describedby]')).not.toBeNull();
    fixture.componentInstance.showPreviousNext.set(true);
    fixture.componentInstance.showPausePlay.set(false);
    fixture.detectChanges();
    expect(root.querySelector('.carousel__controls button[aria-describedby]')).toBeNull();
    expect(root.querySelectorAll('.carousel__controls button')).toHaveLength(2);
    fixture.componentInstance.showPreviousNext.set(false);
    fixture.componentInstance.showSlideNavigation.set(false);
    fixture.detectChanges();
    expect(root.querySelector('.carousel__controls')).toBeNull();
    expect(root.querySelector('.carousel__indicators')).toBeNull();
  });

  it('starts paused when autoRotate is false and allows explicit Play', () => {
    const fixture = TestBed.createComponent(CarouselTestHost);
    fixture.componentInstance.autoRotate.set(false);
    fixture.detectChanges();
    const component = fixture.debugElement.query(By.directive(Carousel))
      .componentInstance as Carousel;
    expect(component.isPlaying()).toBe(false);
    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(0);
    component.toggleRotation();
    fixture.detectChanges();
    vi.advanceTimersByTime(CAROUSEL_INTERVAL_MS);
    expect(component.currentIndex()).toBe(1);
  });

  it('reschedules rotation and status when configuration changes', () => {
    const { component, fixture, root } = createCarousel();
    fixture.componentInstance.rotationInterval.set(2000);
    fixture.detectChanges();
    expect(root.querySelector('.carousel__status')?.textContent).toContain('2 seconds');
    vi.advanceTimersByTime(1999);
    expect(component.currentIndex()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(component.currentIndex()).toBe(1);
    fixture.componentInstance.autoRotate.set(false);
    fixture.detectChanges();
    expect(component.isPlaying()).toBe(false);
    vi.advanceTimersByTime(4000);
    expect(component.currentIndex()).toBe(1);
    fixture.componentInstance.autoRotate.set(true);
    fixture.detectChanges();
    vi.advanceTimersByTime(2000);
    expect(component.currentIndex()).toBe(2);
  });

  it('adapts safely through empty content and added slides without a count input', () => {
    const { component, fixture, root } = createCarousel();
    fixture.componentInstance.labels.set([]);
    fixture.detectChanges();
    component.showPreviousSlide();
    component.showNextSlide();
    expect(component.currentIndex()).toBe(0);
    expect(component.currentPosition()).toBe(0);
    expect(root.querySelectorAll('.carousel__indicators button')).toHaveLength(0);
    fixture.componentInstance.labels.set(['New first', 'New second']);
    fixture.detectChanges();
    component.showPreviousSlide();
    fixture.detectChanges();
    expect(component.currentIndex()).toBe(1);
    expect(root.querySelector('.carousel__position')?.textContent).toContain('Slide 2 of 2');
  });

  it('cleans up the motion listener and automatic timer when destroyed', () => {
    const { fixture } = createCarousel();

    expect(vi.getTimerCount()).toBe(1);
    fixture.destroy();
    // Flush Angular's queued teardown work; a leaked rotation interval would remain.
    vi.runOnlyPendingTimers();

    expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
