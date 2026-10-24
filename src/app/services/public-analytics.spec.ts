import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { ElementRef } from '@angular/core';
import { PublicAnalytics, publicPath } from './public-analytics';
import { PublicTrack } from './public-track';
describe('Public analytics transport', () => {
  const gtag = vi.fn();
  const storage = vi.fn(() => null as string | null);
  const window = {
    location: new URL('https://djamespoer.com/'),
    localStorage: { getItem: storage },
    gtag,
  };
  beforeEach(() => {
    gtag.mockReset();
    storage.mockReset().mockReturnValue(null);
    window.location = new URL('https://djamespoer.com/');
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: window } }],
    });
  });
  it('preserves homepage attribution and legacy fields with normalized typed context', () => {
    TestBed.inject(PublicAnalytics).track('thingamajob_open', {
      location: 'home-thingamajob',
      source: 'homepage',
      destination_path: '/thingamajob',
    });
    expect(gtag).toHaveBeenCalledExactlyOnceWith('event', 'thingamajob_open', {
      location: 'home-thingamajob',
      source: 'homepage',
      destination_path: '/thingamajob',
      page_path: '/',
      cta_location: 'home-thingamajob',
    });
  });
  it('drops arbitrary route data and strips queries/hashes from the browser path', () => {
    expect(publicPath('/private/client-record')).toBe('/other');
    window.location = new URL('https://djamespoer.com/about?email=private@example.invalid#private');
    TestBed.inject(PublicAnalytics).track('contact_click', {
      location: 'primary-navigation',
      contact_method: 'email',
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/private|@|\?|#/);
  });
  it('does not send on dev/protected/other-client hosts or internal traffic', () => {
    const service = TestBed.inject(PublicAnalytics);
    for (const host of [
      'localhost',
      'api-test.djamespoer.com',
      'api.djamespoer.com',
      'nurseericakortz.com',
    ]) {
      window.location = new URL('https://' + host);
      service.track('cookie_settings_open', { location: 'footer' });
    }
    window.location = new URL('https://djamespoer.com');
    storage.mockReturnValue('1');
    service.track('cookie_settings_open', { location: 'footer' });
    expect(gtag).not.toHaveBeenCalled();
  });
  it('swallows GA and storage failures without logging', () => {
    const service = TestBed.inject(PublicAnalytics);
    gtag.mockImplementation(() => {
      throw Error('blocked');
    });
    expect(() => service.track('cookie_settings_open', { location: 'footer' })).not.toThrow();
    storage.mockImplementation(() => {
      throw Error('storage denied');
    });
    expect(() => service.track('cookie_settings_open', { location: 'footer' })).not.toThrow();
  });
  it('joins private follow-up intent without sending correlation IDs or submitted content to GA', async () => {
    const fetch = vi.fn().mockResolvedValue({});
    const data = new Map<string, string>();
    const testWindow = {
      ...window,
      fetch,
      sessionStorage: {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => data.set(key, value),
        removeItem: (key: string) => data.delete(key),
      },
    };
    TestBed.overrideProvider(DOCUMENT, { useValue: { defaultView: testWindow } });
    const service = TestBed.inject(PublicAnalytics);
    const first = service.beginEvaluation('file');
    service.track('evaluation_result_viewed', { location: 'page-content', input_method: 'file' });
    service.track('external_profile_click', { location: 'footer', profile: 'linkedin' });
    expect(fetch).toHaveBeenCalledTimes(2);
    const [, options] = fetch.mock.calls[1];
    expect(options.headers['Idempotency-Key']).toBe(first['Idempotency-Key']);
    expect(options.headers['X-TAMJ-Session']).toBe(first['X-TAMJ-Session']);
    expect(JSON.parse(options.body)).toEqual({
      event: 'external_profile_click',
      context: 'linkedin',
    });
    const next = service.beginEvaluation('text');
    expect(next['Idempotency-Key']).not.toBe(first['Idempotency-Key']);
    expect(next['X-TAMJ-Session']).toBe(first['X-TAMJ-Session']);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(first['X-TAMJ-Session']);
    expect(JSON.stringify(gtag.mock.calls)).not.toContain(first['Idempotency-Key']);
    const saved = JSON.parse(data.get('thingamajob.funnel')!);
    data.set('thingamajob.funnel', JSON.stringify({ ...saved, expires: Date.now() - 1 }));
    expect(service.beginEvaluation('url')['X-TAMJ-Session']).not.toBe(first['X-TAMJ-Session']);
  });
});
describe('Explicit public link hooks', () => {
  const track = vi.fn();
  let anchor: HTMLAnchorElement;
  let hook: PublicTrack;
  beforeEach(() => {
    track.mockReset();
    anchor = document.createElement('a');
    TestBed.configureTestingModule({
      providers: [
        { provide: ElementRef, useValue: new ElementRef(anchor) },
        { provide: DOCUMENT, useValue: { location: new URL('https://djamespoer.com/') } },
        { provide: PublicAnalytics, useValue: { track } },
      ],
    });
    hook = TestBed.runInInjectionContext(() => new PublicTrack());
  });
  const activate = () => hook.activate({ isTrusted: true, type: 'click', button: 0 } as MouseEvent);
  it.each([
    ['https://djamespoer.com/assets/resume/d-james-poer-resume.pdf', 'resume_download'],
    ['mailto:private@example.invalid?body=private', 'contact_click'],
    ['https://djamespoer.com/thingamajob?private=hidden', 'thingamajob_open'],
    ['https://djamespoer.com/work/ips', 'case_study_open'],
    ['https://www.linkedin.com/in/djamespoer', 'external_profile_click'],
  ])('counts %s with safe parameters only', (href, event) => {
    anchor.href = href;
    anchor.download = '';
    activate();
    expect(track).toHaveBeenCalledTimes(1);
    expect(track.mock.calls[0][0]).toBe(event);
    expect(JSON.stringify(track.mock.calls[0][1])).not.toMatch(/private|@|https?:|mailto:|\?/);
  });
  it('does not treat repositories, unrelated downloads or protected destinations as profile/product entries', () => {
    for (const href of [
      'https://github.com/mentalnote74/djamespoer.com',
      'https://djamespoer.com/other.pdf',
      'https://api-test.djamespoer.com/thingamajob',
    ]) {
      anchor.href = href;
      anchor.download = '';
      activate();
    }
    expect(track).not.toHaveBeenCalled();
  });
  it('ignores synthetic/right-click input and counts middle-click once', () => {
    anchor.href = 'https://djamespoer.com/thingamajob';
    hook.activate({ isTrusted: false, type: 'click', button: 0 } as MouseEvent);
    hook.activate({ isTrusted: true, type: 'click', button: 2 } as MouseEvent);
    expect(track).not.toHaveBeenCalled();
    hook.activate({ isTrusted: true, type: 'auxclick', button: 1 } as MouseEvent);
    expect(track).toHaveBeenCalledTimes(1);
  });
});
