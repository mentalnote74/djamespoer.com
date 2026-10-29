import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
import { RigbyGuide } from './rigby-guide';
describe('Rigby circus sequence', () => {
  const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (hidden) Object.defineProperty(document, 'hidden', hidden);
    else Reflect.deleteProperty(document, 'hidden');
    localStorage.clear();
  });
  it('cycles every routine, wraps and ignores stale completion after stopping', () => {
    const fixture = TestBed.createComponent(RigbyGuide);
    const guide = fixture.componentInstance;
    guide.dance.set({ token: 0, flavor: 0, blue: true, hulking: true });
    for (let flavor = 0; flavor < 13; flavor++) {
      const request = guide.dance()!;
      expect(request.flavor).toBe(flavor);
      expect(request.blue).toBe(true);
      guide.danceFinished(request.token);
      expect(guide.dance()?.token).toBeGreaterThan(request.token);
      expect(guide.dance()?.hulking).toBeUndefined();
      guide.danceFinished(request.token);
      expect(guide.dance()?.flavor).toBe((flavor + 1) % 13);
    }
    const old = guide.dance()!.token;
    guide.endDance();
    guide.danceFinished(old);
    expect(guide.dance()).toBeNull();
  });
  it('takes an unhurried stand, sit, three-circle, rest sequence and restarts on activity', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    const fixture = TestBed.createComponent(RigbyGuide);
    const guide = fixture.componentInstance;
    const rigby = TestBed.inject(RigbyPreferences);
    localStorage.setItem('rigby.greeting.seen.v1', '1');
    rigby.setEnabled(true, false);
    guide.visible.set(true);
    fixture.detectChanges();
    expect(guide.settling()).toBe('standing');
    vi.advanceTimersByTime(4999);
    expect(guide.settling()).toBe('standing');
    vi.advanceTimersByTime(1);
    expect(guide.settling()).toBe('sitting');
    vi.advanceTimersByTime(5000);
    expect(guide.settling()).toBe('circling');
    vi.advanceTimersByTime(2700);
    expect(guide.settling()).toBe('resting');
    guide.scrolling.set(true);
    fixture.detectChanges();
    expect(guide.settling()).toBe('standing');
    vi.advanceTimersByTime(20000);
    expect(guide.settling()).toBe('standing');
    fixture.destroy();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
});
