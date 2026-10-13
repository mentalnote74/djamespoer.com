import {
  livingAnchors,
  livingFrame,
  livingTiming,
  interpolatePalette,
  startLivingTheme,
} from './living-theme';

describe('Living theme controlled clock', () => {
  it('follows all seven anchors and wraps after roughly four hours', () => {
    let time = 0;
    livingAnchors.forEach((anchor, index) => {
      const frame = livingFrame(time);
      expect(frame.from).toBe(anchor);
      expect(frame.to).toBe(livingAnchors[(index + 1) % 7]);
      expect(frame.progress).toBe(0);
      time += frame.wipe ? livingTiming.wipeMs : livingTiming.interpolationMs;
    });
    expect(time).toBe(4 * 60 * 60 * 1000 + 800);
    expect(livingFrame(time).from).toBe('tequila-sunrise');
    expect(livingFrame(time + 1000).progress).toBeCloseTo(1000 / livingTiming.interpolationMs);
  });
  it('moves extremely slowly and never interpolates either polarity boundary', () => {
    expect(livingFrame(1000).progress).toBeLessThan(0.0004);
    const sunset = 4 * livingTiming.interpolationMs;
    expect(livingFrame(sunset - 1).to).toBe('tequila-sunset');
    expect(livingFrame(sunset).wipe).toBe('sunset');
    expect(livingFrame(sunset + 399).wipe).toBe('sunset');
    expect(livingFrame(sunset + 400).from).toBe('rum-runner');
    const dawn = 5 * livingTiming.interpolationMs + 400;
    expect(livingFrame(dawn - 1).to).toBe('bloody-mary');
    expect(livingFrame(dawn).wipe).toBe('sunrise');
    expect(livingFrame(dawn + 400).from).toBe('tequila-sunrise');
  });
  it('supports explicit timing without a control panel and rejects invalid values', () => {
    expect(livingTiming.wipeMs).toBe(400);
    expect(livingFrame(40, { interpolationMs: 10, wipeMs: 600 }).wipe).toBe('sunset');
    expect(livingFrame(639, { interpolationMs: 10, wipeMs: 600 }).wipe).toBe('sunset');
    expect(livingFrame(640, { interpolationMs: 10, wipeMs: 600 }).from).toBe('rum-runner');
    expect(() => livingFrame(-1)).toThrow();
    expect(() => livingFrame(0, { interpolationMs: 0, wipeMs: 400 })).toThrow();
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
    for (let i = 0; i < 4; i++) await advance(1000);
    expect(snapshots[0]).toEqual({
      direction: 'sunset',
      old: 'tequila-sunset',
      next: 'rum-runner',
    });
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).toBe('');
    await advance(400);
    await advance(1000);
    expect(snapshots[1]).toEqual({
      direction: 'sunrise',
      old: 'bloody-mary',
      next: 'tequila-sunrise',
    });
    await advance(400);
    expect(document.documentElement.dataset['theme']).toBe('tequila-sunrise');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
    expect(document.querySelectorAll('main').length).toBe(mainCount);
  });
  it('reduced motion changes anchors atomically without interpolation or snapshots', async () => {
    reduced = true;
    const wipe = vi.spyOn(document, 'startViewTransition');
    stop = startLivingTheme(document, timing);
    await advance(1000);
    expect(document.documentElement.dataset['theme']).toBe('mojito');
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).toBe('');
    await advance(3000);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
    expect(wipe).not.toHaveBeenCalled();
  });
  it('unsupported browsers use atomic polarity changes', async () => {
    Object.defineProperty(document, 'startViewTransition', {
      configurable: true,
      value: undefined,
    });
    stop = startLivingTheme(document, timing);
    await advance(3000);
    await advance(1000);
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
    for (let i = 0; i < 4; i++) await advance(1000);
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
    for (let i = 0; i < 4; i++) await advance(1000);
    expect(document.documentElement.dataset['theme']).toBe('rum-runner');
    expect(document.documentElement.dataset['themeWipe']).toBeUndefined();
    await advance(400);
    expect(document.documentElement.style.getPropertyValue('--page-foreground')).not.toBe('');
  });
});
