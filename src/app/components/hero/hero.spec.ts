import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Hero } from './hero';

describe('Hero reduced-motion lifecycle', () => {
  afterEach(() => { TestBed.resetTestingModule(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('cancels pending particle startup when reduced motion changes before the delay', () => {
    vi.useFakeTimers();
    const media = new EventTarget();
    Object.defineProperty(media, 'matches', { value: false, writable: true });
    vi.stubGlobal('matchMedia', () => media);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
    (media as unknown as { matches: boolean }).matches = true;
    media.dispatchEvent(new Event('change'));
    vi.advanceTimersByTime(600);
    expect(document.querySelector('script[data-particles-js]')).toBeNull();
    fixture.destroy();
  });
  it('cancels existing hero frames without touching other particle instances', () => {
    const media = new EventTarget();
    Object.defineProperty(media, 'matches', { value: true, writable: true });
    vi.stubGlobal('matchMedia', () => media);
    const holder = document.createElement('div'); holder.id = 'hero-particles';
    const canvas = document.createElement('canvas');holder.append(canvas);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const particleWindow = window as Window & { pJSDom?: unknown[] };
    particleWindow.pJSDom = [{ pJS: { canvas: { el: canvas }, fn: { drawAnimFrame: 123, checkAnimFrame: 456, vendors: { draw: vi.fn() } } } }];
    try {
      TestBed.configureTestingModule({ providers: [provideRouter([])] });
      const fixture = TestBed.createComponent(Hero);fixture.detectChanges();
      expect(cancel).toHaveBeenCalledWith(123);expect(cancel).toHaveBeenCalledWith(456);
      fixture.destroy();
    } finally { delete particleWindow.pJSDom; }
  });
});

describe('SCRUM-161 hero resume entry', () => {
  it('offers the selector instead of starting a PDF download', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    try {
      await TestBed.configureTestingModule({
        imports: [Hero],
        providers: [provideRouter([])],
      }).compileComponents();
      const fixture = TestBed.createComponent(Hero);
      fixture.detectChanges();
      const anchor = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
        'a[href="/resume"]',
      );
      expect(anchor).not.toBeNull();
      expect(anchor?.hasAttribute('download')).toBe(false);
      expect(anchor?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Choose Resume');
      fixture.destroy();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
