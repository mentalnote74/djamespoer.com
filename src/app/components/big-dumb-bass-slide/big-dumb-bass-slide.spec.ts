import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { BigDumbBassSlide } from './big-dumb-bass-slide';

describe('Big Dumb Bass complete artwork and visit lifecycle', () => {
  let fixture: ComponentFixture<BigDumbBassSlide>;
  let images: HTMLImageElement[];
  let intersect: (entries: IntersectionObserverEntry[]) => void;
  const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');
  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
          intersect = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })),
    );
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    TestBed.configureTestingModule({ imports: [BigDumbBassSlide], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BigDumbBassSlide);
    fixture.detectChanges();
    await fixture.whenStable();
    images = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>(
        '.preparing img',
      ),
    ];
    select('a');
  });
  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
    else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
  });
  function select(version: string, decode: () => Promise<void> = () => Promise.resolve()) {
    images.forEach((image, index) =>
      Object.defineProperties(image, {
        complete: { configurable: true, value: true },
        naturalWidth: { configurable: true, value: 768 },
        currentSrc: { configurable: true, value: `https://example.test/${version}-${index}.avif` },
        decode: { configurable: true, value: vi.fn(decode) },
      }),
    );
  }
  async function shown() {
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.presented()).toBeGreaterThan(0);
    });
  }
  it('keeps the fish-free poster until the actual three-image batch decodes, with native tracked HTML', async () => {
    // Each buffered image must resolve, not only the last image.
    const pending: Array<() => void> = [];
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: () => new Promise<void>((resolve) => pending.push(resolve)),
    });
    await fixture.componentInstance.prepare();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.presented()).toBe(0);
    expect(fixture.nativeElement.querySelector('.poster img').getAttribute('src')).toContain(
      'opening-1440.webp',
    );
    pending.splice(0).forEach((resolve) => resolve());
    await shown();
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelectorAll('.plate.current')).toHaveLength(3);
    expect(root.querySelector('h2')?.textContent).toBe('Whatever You Do, Do Not Click Here');
    expect(root.querySelector('a')?.getAttribute('href')).toBe(
      '/blognostisphere/like-a-big-dumb-bass',
    );
    expect(root.querySelector('a')?.getAttribute('trackSlide')).toBe('big-dumb-bass');
    expect(root.querySelector('button')?.hasAttribute('publicTrack')).toBe(false);
    expect(root.querySelector('.art')?.getAttribute('aria-hidden')).toBe('true');
  });
  it('retains the poster on decode rejection and does not retry the same selection', async () => {
    select('failed', () => Promise.reject(new Error('unavailable')));
    await fixture.componentInstance.prepare();
    await fixture.componentInstance.prepare();
    fixture.detectChanges();
    expect(fixture.componentInstance.failed()).toBe(true);
    expect(fixture.componentInstance.ready()).toBe(false);
    expect(fixture.componentInstance.started()).toBe(false);
    images.forEach((image) => expect(image.decode).toHaveBeenCalledTimes(1));
    expect(fixture.nativeElement.querySelector('.poster')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe(
      '/blognostisphere/like-a-big-dumb-bass',
    );
  });
  it('starts once per active visit, preserves started state across offscreen/user pause, resets on departure', async () => {
    await fixture.componentInstance.prepare();
    await shown();
    intersect([{ isIntersecting: true } as IntersectionObserverEntry]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.started()).toBe(true);
    fixture.componentInstance.toggleMotion();
    intersect([{ isIntersecting: false } as IntersectionObserverEntry]);
    fixture.detectChanges();
    expect(fixture.componentInstance.started()).toBe(true);
    expect(fixture.componentInstance.paused()).toBe(true);
    intersect([{ isIntersecting: true } as IntersectionObserverEntry]);
    fixture.detectChanges();
    expect(fixture.componentInstance.motionPaused()).toBe(true);
    fixture.componentRef.setInput('active', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.started()).toBe(false);
    expect(fixture.componentInstance.motionPaused()).toBe(false);
  });
  it('keeps current pinned plates during responsive replacement and ignores a stale decode', async () => {
    await fixture.componentInstance.prepare();
    await shown();
    const current = fixture.componentInstance.presented();
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => (release = resolve));
    select('b', () => barrier);
    const stale = fixture.componentInstance.prepare();
    expect(fixture.componentInstance.presented()).toBe(current);
    expect(fixture.componentInstance.frames()[0].sources.every((src) => src.includes('/a-'))).toBe(
      true,
    );
    select('c');
    await fixture.componentInstance.prepare();
    release();
    await stale;
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        fixture.componentInstance
          .frames()
          .at(-1)
          ?.sources.every((src) => src.includes('/c-')),
      ).toBe(true);
    });
  });
});
