import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TccPigSlide } from './tcc-pig-slide';

describe('complete pig artwork presentation', () => {
  let fixture: ComponentFixture<TccPigSlide>;
  let images: HTMLImageElement[];
  const originalDecode = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'decode');

  beforeEach(async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
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
    TestBed.configureTestingModule({ imports: [TccPigSlide], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(TccPigSlide);
    fixture.detectChanges();
    await fixture.whenStable();
    images = [...fixture.nativeElement.querySelectorAll('.preparing img')];
    select('a');
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
    if (originalDecode) Object.defineProperty(HTMLImageElement.prototype, 'decode', originalDecode);
    else Reflect.deleteProperty(HTMLImageElement.prototype, 'decode');
  });

  function select(version: string, decode: () => Promise<void> = () => Promise.resolve()): void {
    images.forEach((image, index) => {
      Object.defineProperties(image, {
        complete: { configurable: true, value: true },
        naturalWidth: { configurable: true, value: 768 },
        currentSrc: { configurable: true, value: `https://example.test/${version}-${index}.avif` },
        decode: { configurable: true, value: vi.fn(decode) },
      });
    });
  }

  async function shown(): Promise<void> {
    fixture.detectChanges();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.componentInstance.presented()).toBeGreaterThan(0);
    });
  }

  it('retains a complete inline fallback until both loaders and actual buffered images decode', async () => {
    let releaseLoaders!: () => void;
    let releaseRender!: () => void;
    const loaderDecode = new Promise<void>((resolve) => (releaseLoaders = resolve));
    const renderDecode = new Promise<void>((resolve) => (releaseRender = resolve));
    Object.defineProperty(HTMLImageElement.prototype, 'decode', {
      configurable: true,
      value: vi.fn(() => renderDecode),
    });
    select('a', () => loaderDecode);
    const attempt = fixture.componentInstance.checkReady();
    expect(fixture.nativeElement.querySelector('.static-pig img')?.getAttribute('src')).toMatch(
      /^data:image\/webp;base64,/,
    );
    expect(fixture.componentInstance.frames()).toHaveLength(0);
    expect(fixture.componentInstance.presented()).toBe(0);
    releaseLoaders();
    await attempt;
    fixture.detectChanges();
    expect(fixture.componentInstance.frames()).toHaveLength(1);
    expect(fixture.componentInstance.presented()).toBe(0);
    expect(fixture.nativeElement.querySelector('.layered-pig.current')).toBeNull();
    releaseRender();
    await shown();
    expect(fixture.nativeElement.querySelectorAll('.layered-pig.current img')).toHaveLength(5);
  });

  it('keeps fallback and does not loop after a decode rejection or native load error', async () => {
    select('bad', () => Promise.reject(new Error('decode failed')));
    await fixture.componentInstance.checkReady();
    await fixture.componentInstance.checkReady();
    fixture.detectChanges();
    expect(fixture.componentInstance.preparationFailed()).toBe(true);
    expect(fixture.componentInstance.presented()).toBe(0);
    expect(fixture.nativeElement.querySelector('.static-pig')).not.toBeNull();
    images.forEach((image) => expect(image.decode).toHaveBeenCalledTimes(1));
    images[0].dispatchEvent(new Event('error'));
    expect(fixture.componentInstance.frames()).toHaveLength(0);
    const link = fixture.nativeElement.querySelector('.slide-destination');
    expect(link?.getAttribute('href')).toBe('/case-studies/tcc');
  });

  it('pins the previous complete batch while a new responsive selection is pending or fails', async () => {
    await fixture.componentInstance.checkReady();
    await shown();
    const previous = fixture.componentInstance.presented();
    let fail!: (error: Error) => void;
    const decode = new Promise<void>((_, reject) => (fail = reject));
    select('b', () => decode);
    const attempt = fixture.componentInstance.checkReady();
    fixture.detectChanges();
    expect(fixture.componentInstance.presented()).toBe(previous);
    const sources = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>(
        '.layered-pig.current img',
      ),
    ].map((image) => image.src);
    expect(sources.every((source) => source.includes('/a-'))).toBe(true);
    fail(new Error('replacement failed'));
    await attempt;
    fixture.detectChanges();
    expect(fixture.componentInstance.presented()).toBe(previous);
    expect(fixture.componentInstance.frames()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.pig-scene')?.classList.contains('paused')).toBe(
      true,
    );
  });

  it('does not present stale images after a newer candidate batch has decoded', async () => {
    let releaseOld!: () => void;
    const old = new Promise<void>((resolve) => (releaseOld = resolve));
    select('a', () => old);
    const first = fixture.componentInstance.checkReady();
    select('b');
    await fixture.componentInstance.checkReady();
    await shown();
    const current = fixture.componentInstance.presented();
    releaseOld();
    await first;
    expect(fixture.componentInstance.presented()).toBe(current);
    expect(
      fixture.componentInstance
        .frames()
        .at(-1)
        ?.sources.every((source) => source.includes('/b-')),
    ).toBe(true);
  });
});
