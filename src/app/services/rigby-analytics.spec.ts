import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { PublicAnalytics } from './public-analytics';
import { AnalyticsPreferences, analyticsConsent } from './analytics-preferences';
import { RigbyPreferences } from '../features/cookie-preferences/rigby-preferences';
import { CookieHuntService } from '../features/cookie-hunt/cookie-hunt.service';

describe('Rigby consented GA session denominators', () => {
  const store = new Map<string, string>();
  let cookie: string, session: string, callbacks: (() => void)[], deferred: boolean;
  const gtag = vi.fn((...args: unknown[]) => {
    if (args[0] === 'get') {
      const callback = () => (args[3] as (value: string) => void)(session);
      if (deferred) callbacks.push(callback);
      else callback();
    }
  });
  const view = {
    location: new URL('https://djamespoer.com/about?private=secret#hidden'),
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    },
    gtag,
    setTimeout: () => 0,
  };
  beforeEach(() => {
    cookie = 'portfolio_analytics_consent=granted';
    session = '1234567890';
    callbacks = [];
    deferred = false;
    store.clear();
    gtag.mockClear();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            get cookie() {
              return cookie;
            },
            defaultView: view,
          },
        },
      ],
    });
  });
  const emissions = () => gtag.mock.calls.filter((args) => args[0] === 'event');
  it('deduplicates visible exposure across surfaces, routes and service recreation/reload using native GA session', () => {
    const analytics = TestBed.inject(PublicAnalytics);
    analytics.rigbySessionState('shown', 'greeting');
    analytics.rigbySessionState('shown', 'companion');
    const reloaded = TestBed.runInInjectionContext(() => new PublicAnalytics());
    reloaded.rigbySessionState('shown', 'encounter');
    expect(emissions()).toHaveLength(1);
    expect(emissions()[0]).toEqual([
      'event',
      'rigby_encounter',
      expect.objectContaining({ action: 'shown', surface: 'greeting', page_path: '/about' }),
    ]);
    expect(JSON.stringify(emissions())).not.toMatch(/secret|hidden|1234567890/);
    session = '1234567891';
    analytics.rigbySessionState('shown', 'companion');
    expect(emissions()).toHaveLength(2);
  });
  it('records saved suppression separately without inventing dismissal or exposure', () => {
    const analytics = TestBed.inject(PublicAnalytics);
    analytics.rigbySessionState('saved_off');
    analytics.rigbySessionState('saved_off');
    expect(emissions()).toHaveLength(1);
    expect(emissions()[0][2]).toMatchObject({ action: 'saved_off' });
  });
  it('does not queue state or actions without consent or on internal browsers, and resumes only new actions', () => {
    const analytics = TestBed.inject(PublicAnalytics);
    cookie = '';
    analytics.rigbySessionState('shown', 'companion');
    analytics.track('rigby_play', { location: 'rigby', action: 'sit' });
    expect(gtag).not.toHaveBeenCalled();
    cookie = 'portfolio_analytics_consent=granted';
    store.set('portfolio.analytics.internal', '1');
    analytics.rigbySessionState('shown', 'greeting');
    analytics.track('rigby_play', { location: 'rigby', action: 'roll' });
    expect(gtag).not.toHaveBeenCalled();
    store.delete('portfolio.analytics.internal');
    analytics.track('rigby_play', { location: 'rigby', action: 'shake' });
    expect(emissions()).toHaveLength(1);
    cookie = 'portfolio_analytics_consent=denied';
    analytics.track('rigby_play', { location: 'rigby', action: 'beg' });
    expect(emissions()).toHaveLength(1);
  });
  it('checks visibility and consent again after a deferred tag callback', () => {
    deferred = true;
    let visible = true;
    const analytics = TestBed.inject(PublicAnalytics);
    analytics.rigbySessionState('shown', 'companion', () => visible);
    analytics.rigbySessionState('shown', 'companion', () => visible);
    expect(callbacks).toHaveLength(1);
    visible = false;
    callbacks.shift()!();
    expect(emissions()).toHaveLength(0);
    visible = true;
    analytics.rigbySessionState('shown', 'companion', () => visible);
    cookie = 'portfolio_analytics_consent=denied';
    callbacks.shift()!();
    expect(emissions()).toHaveLength(0);
  });
  it('never treats an invalid/missing native GA session as a usable denominator', () => {
    session = 'invalid';
    TestBed.inject(PublicAnalytics).rigbySessionState('shown', 'companion');
    expect(emissions()).toHaveLength(0);
    expect(store.size).toBe(0);
  });
});

describe('Independent browser controls', () => {
  it('fails closed when browser cookie access throws', () => {
    expect(
      analyticsConsent({
        get cookie() {
          throw new Error('blocked');
        },
      } as unknown as Document),
    ).toBe(false);
  });
  afterEach(() => vi.unstubAllGlobals());
  let cookie: string;
  const store = new Map<string, string>();
  const reload = vi.fn();
  const view = {
    location: { protocol: 'https:', reload },
    dispatchEvent: vi.fn(),
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
    'ga-disable-G-WQBYGF4Z8F': false,
  };
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', undefined);
    cookie = '';
    store.clear();
    reload.mockClear();
    view['ga-disable-G-WQBYGF4Z8F'] = false;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            get cookie() {
              return cookie;
            },
            set cookie(value: string) {
              cookie = value;
            },
            location: view.location,
            defaultView: view,
          },
        },
      ],
    });
  });
  it('defaults to denied and saves bounded independent consent without Rigby/profile data', () => {
    const p = TestBed.inject(AnalyticsPreferences);
    expect(p.granted()).toBe(false);
    p.setConsent(true);
    expect(cookie).toContain(
      'portfolio_analytics_consent=granted; Path=/; Max-Age=15552000; SameSite=Lax; Secure',
    );
    expect(reload).toHaveBeenCalledOnce();
    expect(store.size).toBe(0);
    store.set('rigby.analytics-session.v1', 'native-session-flags');
    p.setConsent(false);
    expect(p.granted()).toBe(false);
    expect(view['ga-disable-G-WQBYGF4Z8F']).toBe(true);
    expect(store.has('rigby.analytics-session.v1')).toBe(false);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('marks and unmarks reversibly without changing consent, Rigby or progress', () => {
    store.set('rigby.enabled.v1', 'off');
    store.set('rigby.cookie-jar.v1', 'existing-jar');
    const p = TestBed.inject(AnalyticsPreferences);
    p.setInternal(true);
    expect(p.internal()).toBe(true);
    expect(store.get('portfolio.analytics.internal')).toBe('1');
    expect(view['ga-disable-G-WQBYGF4Z8F']).toBe(true);
    p.setInternal(false);
    expect(p.internal()).toBe(false);
    expect(cookie).toBe('');
    expect(store.get('rigby.enabled.v1')).toBe('off');
    expect(store.get('rigby.cookie-jar.v1')).toBe('existing-jar');
    expect(reload).toHaveBeenCalledTimes(2);
  });
});

describe('Rigby real action boundaries', () => {
  const track = vi.fn(),
    rigbySessionState = vi.fn();
  beforeEach(() => {
    localStorage.clear();
    track.mockClear();
    rigbySessionState.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: PublicAnalytics, useValue: { track, rigbySessionState } }],
    });
  });
  afterEach(() => localStorage.clear());
  it('does not turn programmatic restore into actions; explicit dismissal and bring-back each count once', () => {
    const p = TestBed.inject(RigbyPreferences);
    p.setEnabled(true, false);
    expect(track).not.toHaveBeenCalled();
    p.choose(false);
    p.choose(false);
    p.choose(true, false);
    p.choose(true, false);
    expect(track.mock.calls.map((c) => c[1].action)).toEqual(['dismissed', 'brought_back']);
  });
  it('counts a first greeting refusal without counting repeated saved-off selection', () => {
    const p = TestBed.inject(RigbyPreferences);
    p.choose(false);
    p.choose(false);
    expect(track).toHaveBeenCalledExactlyOnceWith('rigby_encounter', {
      location: 'rigby',
      action: 'dismissed',
    });
  });
  it('separates discovery and successful delivery, rejects unknown IDs and duplicates, never emits from restore/reset', () => {
    const hunt = TestBed.inject(CookieHuntService);
    hunt.collected.set(['about']);
    expect(track).not.toHaveBeenCalled();
    expect(hunt.collect('unknown')).toBe(false);
    hunt.fedCookie('unknown');
    hunt.fedCookie('home');
    expect(track).not.toHaveBeenCalled();
    hunt.collect('home');
    hunt.collect('home');
    hunt.fedCookie('home');
    hunt.fedCookie('home');
    expect(track.mock.calls.map((c) => c[1].action)).toEqual(['collected', 'fed']);
    expect(track.mock.calls[1][1]).toMatchObject({ cookie_id: 'home', cookie_flavor: 0 });
    hunt.restart();
    expect(track).toHaveBeenCalledTimes(2);
  });
});
