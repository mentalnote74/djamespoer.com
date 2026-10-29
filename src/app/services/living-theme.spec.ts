import {
  livingAnchors,
  livingFrame,
  livingTiming,
  livingLocalElapsed,
  interpolatePalette,
  startLivingTheme,
} from './living-theme';

describe('Living theme controlled clock', () => {
  it('follows all seven anchors and wraps after exactly 180 seconds', () => {
    expect(livingAnchors).toEqual([
      'tequila-sunset',
      'rum-runner',
      'bloody-mary',
      'tequila-sunrise',
      'mojito',
      'pina-colada',
      'mai-tai',
    ]);
    let time = 0;
    livingAnchors.forEach((anchor, index) => {
      const frame = livingFrame(time);
      expect(frame.from).toBe(anchor);
      expect(frame.to).toBe(livingAnchors[(index + 1) % 7]);
      expect(frame.progress).toBe(0);
      time += frame.wipe ? livingTiming.wipeMs : livingTiming.interpolationMs;
    });
    expect(time).toBe(180_000);
    expect(livingFrame(time).from).toBe('tequila-sunset');
    expect(livingFrame(time + 1000).progress).toBeCloseTo(600 / livingTiming.interpolationMs);
  });
  it('uses the approved pace without interpolating either polarity boundary', () => {
    expect(livingFrame(1000).progress).toBeCloseTo(600 / livingTiming.interpolationMs);
    const sunset = 0;
    expect(livingFrame(sunset).from).toBe('tequila-sunset');
    expect(livingFrame(sunset).wipe).toBe('sunset');
    expect(livingFrame(sunset + 399).wipe).toBe('sunset');
    expect(livingFrame(sunset + 400).from).toBe('rum-runner');
    const dawn = livingTiming.interpolationMs + 400;
    expect(livingFrame(dawn - 1).to).toBe('bloody-mary');
    expect(livingFrame(dawn).wipe).toBe('sunrise');
    expect(livingFrame(dawn + 400).from).toBe('tequila-sunrise');
  });
  it('supports explicit timing without a control panel and rejects invalid values', () => {
    expect(livingTiming.wipeMs).toBe(400);
    expect(livingFrame(40, { interpolationMs: 10, wipeMs: 600 }).wipe).toBe('sunset');
    expect(livingFrame(599, { interpolationMs: 10, wipeMs: 600 }).wipe).toBe('sunset');
    expect(livingFrame(600, { interpolationMs: 10, wipeMs: 600 }).from).toBe('rum-runner');
    expect(() => livingFrame(-1)).toThrow();
    expect(() => livingFrame(0, { interpolationMs: 0, wipeMs: 400 })).toThrow();
  });
  it('seeds the cycle from the visitor local clock', () => {
    for (const [hour, anchor] of [
      [0, 'rum-runner'],
      [5, 'rum-runner'],
      [6, 'tequila-sunrise'],
      [10, 'mojito'],
      [13, 'pina-colada'],
      [16, 'mai-tai'],
      [18, 'rum-runner'],
      [23, 'rum-runner'],
    ] as const) {
      expect(livingFrame(livingLocalElapsed(new Date(2026, 9, 29, hour))).from).toBe(anchor);
    }
    expect(livingFrame(livingLocalElapsed(new Date(2026, 9, 29, 11, 30))).progress).toBeCloseTo(
      0.5,
    );
    expect(() => livingLocalElapsed(new Date(NaN))).toThrow();
  });
  it('interpolates shared light geometry and opacity without inventing another clock', () => {
    expect(
      interpolatePalette(
        { '--shadow-x': '9px', '--shadow-y': '8px', '--shadow-opacity': '0.13' },
        { '--shadow-x': '-9px', '--shadow-y': '3px', '--shadow-opacity': '0.10' },
        0.5,
      ),
    ).toEqual({ '--shadow-x': '0px', '--shadow-y': '5.5px', '--shadow-opacity': '0.115' });
    expect(
      interpolatePalette({ '--shadow-x': '9px' }, { '--shadow-x': '-9px' }, 1)['--shadow-x'],
    ).toBe('-9px');
    expect(
      interpolatePalette({ '--unrelated': '9px' }, { '--unrelated': '-9px' }, 0.5)['--unrelated'],
    ).toBe('9px');
  });
  it('interpolates semantic colors only and preserves non-color values', () => {
    expect(
      interpolatePalette({ '--a': '#000', '--b': 'light' }, { '--a': '#fff', '--b': 'dark' }, 0.5),
    ).toEqual({ '--a': 'rgb(127.5, 127.5, 127.5)', '--b': 'light' });
  });
});

describe('Living theme runtime', () => {
  let now = 0;
  let reduced = false;
  let stop: (() => void) | undefined;
  const transitionDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  beforeEach(() => {
    vi.useFakeTimers();
    now = 0;
    reduced = false;
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      writable: true,
      value: () => {},
    });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reduced;
      },
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          0: '--page-background',
          1: '--page-foreground',
          length: 2,
          getPropertyValue: (role: string) => (role === '--page-background' ? '#fff' : '#111'),
        }) as unknown as CSSStyleDeclaration,
    );
    document.documentElement.dataset['theme'] = 'teetotaler';
  });
  afterEach(() => {
    stop?.();
    stop = undefined;
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
    if (transitionDescriptor)
      Object.defineProperty(document, 'startViewTransition', transitionDescriptor);
    else Reflect.deleteProperty(document, 'startViewTransition');
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    else Reflect.deleteProperty(document, 'hidden');
  });
  const timing = { interpolationMs: 1000, wipeMs: 400 };
  async function advance(ms: number) {
    now += ms;
    await vi.advanceTimersByTimeAsync(ms);
  }
  it('allows a demo clock to hold, seek and reset without changing the normal timing', async () => {
    Reflect.deleteProperty(document, 'startViewTransition');
    let position = 0;
    stop = startLivingTheme(document, timing, { elapsed: () => position, refreshMs: 50 });
    await advance(500);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunset');
    position = 2000;
    await advance(50);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunrise');
    position = 0;
    await advance(50);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunset');
    expect(livingTiming.interpolationMs).toBe(35_840);
  });
  it('discovers, updates and clears lighting tokens through the existing runtime', async () => {
    Reflect.deleteProperty(document, 'startViewTransition');
    vi.mocked(window.getComputedStyle).mockImplementation(
      () =>
        ({
          0: '--shadow-x',
          1: '--page-background',
          length: 2,
          getPropertyValue: (role: string) =>
            role === '--page-background'
              ? '#fff'
              : document.documentElement.dataset['theme'] === 'tequila-sunrise'
                ? '9px'
                : document.documentElement.dataset['theme'] === 'mojito'
                  ? '4px'
                  : '0px',
        }) as unknown as CSSStyleDeclaration,
    );
    stop = startLivingTheme(document, { interpolationMs: 2000, wipeMs: 400 });
    await advance(3800);
    expect(document.documentElement.style.getPropertyValue('--shadow-x')).toBe('6.5px');
    stop();
    stop = undefined;
    expect(document.documentElement.style.getPropertyValue('--shadow-x')).toBe('');
  });
  it('uses distinct complete-state wipes and resumes/wraps without DOM copies', async () => {
    const snapshots: { direction: string; old: string; next: string }[] = [];
    vi.spyOn(document, 'startViewTransition').mockImplementation((update) => {
      const callback = update as () => void;
      const root = document.documentElement;
      const old = root.dataset['theme']!;
      callback();
      snapshots.push({ direction: root.dataset['themeWipe']!, old, next: root.dataset['theme']! });
      return {
        ready: Promise.resolve(),
        finished: new Promise<void>((resolve) => setTimeout(resolve, 400)),
        skipTransition() {},
      } as ViewTransition;
    });
    const mainCount = document.querySelectorAll('main').length;
    stop = startLivingTheme(document, timing);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunset');
    await advance(1);
    expect(snapshots[0]).toEqual({
      direction: 'sunset',
      old: 'tequila-sunset',
      next: 'rum-runner',
    });
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).toBe('');
    await advance(400);
    await advance(999);
    expect(snapshots[1]).toEqual({
      direction: 'sunrise',
      old: 'bloody-mary',
      next: 'tequila-sunrise',
    });
    await advance(400);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunrise');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
    for (let i = 0; i < 4; i++) await advance(1000);
    expect(snapshots[2]).toEqual({
      direction: 'sunset',
      old: 'tequila-sunset',
      next: 'rum-runner',
    });
    expect(document.querySelectorAll('main').length).toBe(mainCount);
  });
  it('reduced motion changes anchors atomically without interpolation or snapshots', async () => {
    reduced = true;
    const wipe = vi.spyOn(document, 'startViewTransition');
    stop = startLivingTheme(document, timing);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunset');
    await advance(400);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).toBe('');
    await advance(1000);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunrise');
    expect(wipe).not.toHaveBeenCalled();
  });
  it('starting a fresh runtime resets elapsed time to Sunset rather than the prior position', async () => {
    reduced = true;
    stop = startLivingTheme(document, timing);
    await advance(400);
    await advance(1000);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunrise');
    stop();
    stop = startLivingTheme(document, timing);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunset');
    await advance(400);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
  });
  it('unsupported browsers use atomic polarity changes', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    stop = startLivingTheme(document, timing);
    await advance(400);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
  });
  it('cancellation prevents a delayed snapshot callback from overwriting a static selection', async () => {
    let update: (() => void) | undefined;
    vi.spyOn(document, 'startViewTransition').mockImplementation((callback) => {
      update = callback as () => void;
      return {
        ready: Promise.resolve(),
        finished: new Promise(() => {}),
        skipTransition() {},
      } as ViewTransition;
    });
    stop = startLivingTheme(document, timing);
    await advance(1);
    stop();
    document.documentElement.dataset['theme'] = 'teetotaler';
    update!();
    await advance(1000);
    expect(document.documentElement.dataset['theme']).toBe('teetotaler');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
    expect(document.documentElement.style.length).toBe(0);
  });
  it('a failed snapshot capture falls back to the compliant endpoint and continues', async () => {
    vi.spyOn(document, 'startViewTransition').mockImplementation(() => {
      throw new Error('Capture unavailable');
    });
    stop = startLivingTheme(document, timing);
    await advance(1);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
    await advance(400);
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).not.toBe('');
  });
});
