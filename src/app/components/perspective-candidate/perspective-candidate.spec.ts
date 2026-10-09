import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PerspectiveCandidate } from './perspective-candidate';
import { candidateParticleConfig, PERSPECTIVE_CANDIDATES } from './perspective-candidate.config';

describe('Perspective review candidates', () => {
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  let motionChanged: (event: { matches: boolean }) => void;
  const draw = vi.fn();
  const disconnect = vi.fn();
  const initialize = vi.fn((id: string) => {
    const canvas = document.createElement('canvas');
    document.getElementById(id)?.appendChild(canvas);
    Object.assign(window, {
      pJSDom: [
        {
          pJS: {
            canvas: { el: canvas, w: 100, h: 100 },
            fn: { drawAnimFrame: 12, particlesRefresh: vi.fn(), vendors: { draw } },
          },
        },
      ],
    });
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: false,
        addEventListener: (_: string, callback: typeof motionChanged) => {
          motionChanged = callback;
        },
        removeEventListener: vi.fn(),
      })),
    );
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: typeof intersect) {
          intersect = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    Object.assign(window, { particlesJS: initialize, pJSDom: [] });
    TestBed.configureTestingModule({
      imports: [PerspectiveCandidate],
      providers: [provideRouter([])],
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as Window & { particlesJS?: unknown }).particlesJS;
    delete (window as Window & { pJSDom?: unknown }).pJSDom;
  });
  const create = () => {
    const fixture = TestBed.createComponent(PerspectiveCandidate);
    fixture.componentRef.setInput('facet', 'engineering');
    fixture.detectChanges();
    return fixture;
  };
  it('keeps the five existing facet destinations and distinct particle treatments', () => {
    expect(Object.values(PERSPECTIVE_CANDIDATES).map((x) => x.path)).toEqual([
      '/engineering',
      '/ux-product',
      '/accessibility',
      '/ai',
      '/impact',
    ]);
    const configs = Object.keys(PERSPECTIVE_CANDIDATES).map((key) =>
      candidateParticleConfig(key as keyof typeof PERSPECTIVE_CANDIDATES),
    );
    expect(new Set(configs.map((config) => JSON.stringify(config)))).toHaveProperty('size', 5);
    for (const config of configs) expect(config.particles.number.value).toBeLessThanOrEqual(28);
  });
  it('provides a real destination and decorative, non-focusable artwork', () => {
    const fixture = create();
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Engineering');
    expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toBe('/engineering');
    expect(fixture.nativeElement.querySelector('.candidate__art').getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(fixture.nativeElement.querySelector('.candidate__art [tabindex]')).toBeNull();
  });
  it('does not initialize hidden slides and pauses/resumes the visible animation', () => {
    const fixture = create();
    expect(initialize).not.toHaveBeenCalled();
    intersect([{ isIntersecting: true }]);
    expect(initialize).toHaveBeenCalledTimes(1);
    fixture.componentInstance.toggleAnimation();
    expect(draw).not.toHaveBeenCalled();
    fixture.componentInstance.toggleAnimation();
    expect(draw).toHaveBeenCalledTimes(1);
    intersect([{ isIntersecting: false }]);
    expect(draw).toHaveBeenCalledTimes(1);
    intersect([{ isIntersecting: true }]);
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledTimes(2);
    fixture.destroy();
    expect(disconnect).toHaveBeenCalled();
    expect((window as Window & { pJSDom?: unknown[] }).pJSDom).toHaveLength(0);
  });
  it('suppresses animation when reduced motion changes and keeps static content', () => {
    const fixture = create();
    motionChanged({ matches: true });
    intersect([{ isIntersecting: true }]);
    fixture.detectChanges();
    expect(initialize).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.querySelector('h3')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a')).not.toBeNull();
  });
  it('allocates different particle container IDs for multiple instances', () => {
    const first = create();
    const second = create();
    expect(first.componentInstance.particleId).not.toBe(second.componentInstance.particleId);
  });
});
