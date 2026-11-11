import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CarouselExposure } from './carousel-exposure';
import { PublicAnalytics } from './public-analytics';

@Component({
  imports: [CarouselExposure],
  template: `<div carouselExposure="shady-white-van" [exposureActive]="active()"></div>`,
})
class Host {
  readonly active = signal(false);
}

describe('SWV actual carousel exposure', () => {
  let callback: IntersectionObserverCallback;
  let hidden = false;
  const exposure = vi.fn();
  const disconnect = vi.fn();
  beforeEach(() => {
    hidden = false;
    exposure.mockClear();
    disconnect.mockClear();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = vi.fn();
        disconnect = disconnect;
      },
    );
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [{ provide: PublicAnalytics, useValue: { carouselExposure: exposure } }],
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as unknown as Record<string, unknown>)['hidden'];
  });
  function fixture() {
    const f = TestBed.createComponent(Host);
    f.detectChanges();
    const element = f.nativeElement.querySelector('[carouselExposure]') as HTMLElement;
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      right: 300,
      bottom: 100,
      width: 300,
      height: 100,
    } as DOMRect);
    const intersect = (ratio: number) =>
      callback(
        [
          {
            target: element,
            isIntersecting: ratio > 0,
            intersectionRatio: ratio,
            time: 0,
            rootBounds: null,
            boundingClientRect: element.getBoundingClientRect(),
            intersectionRect: element.getBoundingClientRect(),
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    return { f, element, intersect };
  }
  it('never treats preload, readiness, an inactive slide or less than half visibility as exposure', () => {
    const { f, element, intersect } = fixture();
    intersect(1);
    element.dispatchEvent(new Event('load'));
    expect(exposure).not.toHaveBeenCalled();
    f.componentInstance.active.set(true);
    intersect(0.49);
    f.detectChanges();
    expect(exposure).not.toHaveBeenCalled();
    intersect(0.5);
    expect(exposure).toHaveBeenCalledWith('shady-white-van');
  });
  it('requires an unhidden document and visible, non-inert ancestors', () => {
    const { f, element, intersect } = fixture();
    f.componentInstance.active.set(true);
    hidden = true;
    f.detectChanges();
    intersect(1);
    expect(exposure).not.toHaveBeenCalled();
    hidden = false;
    const parent = element.parentElement!;
    parent.style.opacity = '0';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(exposure).not.toHaveBeenCalled();
    parent.style.opacity = '1';
    parent.setAttribute('inert', '');
    intersect(1);
    expect(exposure).not.toHaveBeenCalled();
    parent.removeAttribute('inert');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(exposure).toHaveBeenCalledTimes(1);
  });
  it('rechecks analytics changes only while actually viewable and disconnects on destruction', () => {
    const { f, intersect } = fixture();
    f.componentInstance.active.set(true);
    f.detectChanges();
    intersect(0);
    window.dispatchEvent(new Event('portfolio-analytics-change'));
    expect(exposure).not.toHaveBeenCalled();
    intersect(1);
    exposure.mockClear();
    window.dispatchEvent(new Event('portfolio-analytics-change'));
    expect(exposure).toHaveBeenCalledTimes(1);
    f.destroy();
    exposure.mockClear();
    window.dispatchEvent(new Event('portfolio-analytics-change'));
    expect(exposure).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
  it('does not count an observer intersection if less than half the rendered area is on-screen', () => {
    const { f, element, intersect } = fixture();
    f.componentInstance.active.set(true);
    f.detectChanges();
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: -75,
      right: 300,
      bottom: 25,
      width: 300,
      height: 100,
    } as DOMRect);
    intersect(1);
    expect(exposure).not.toHaveBeenCalled();
  });
});
