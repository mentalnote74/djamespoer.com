import { TestBed } from '@angular/core/testing';
import { CookieHuntService, decodeJar } from './cookie-hunt.service';
import { PORTFOLIO_SLIDES } from '../../content/portfolio-slides';
import { COOKIE_TRAIL } from './cookie-trail';

describe('Rigby cookie hunt', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  it('covers every distinct slide destination without duplicating variant slides or losing old IDs', () => {
    const paths = COOKIE_TRAIL.map((stop) => stop.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const slide of PORTFOLIO_SLIDES) expect(paths).toContain(slide.destination);
    expect(COOKIE_TRAIL.find((stop) => stop.id === 'portfolio')?.path).toBe('/work/djamespoer');
    expect(COOKIE_TRAIL.length).toBeGreaterThan(10);
  });
  it('uses the placement list for its total and advances clues only after collecting', () => {
    const hunt = TestBed.inject(CookieHuntService);
    expect(hunt.total).toBe(COOKIE_TRAIL.length);
    expect(hunt.count()).toBe(0);
    expect(hunt.next()?.id).toBe(COOKIE_TRAIL[0].id);
    expect(hunt.collect('not-a-cookie')).toBe(false);
    for (const stop of COOKIE_TRAIL) {
      expect(hunt.collect(stop.id)).toBe(true);
      expect(hunt.collect(stop.id)).toBe(false);
    }
    expect(hunt.count()).toBe(hunt.total);
    expect(hunt.next()).toBeUndefined();
    expect(hunt.announcement()).toContain('found them all');
  });
  it('stores durable progress and resets only the game jar', () => {
    const hunt = TestBed.inject(CookieHuntService);
    localStorage.setItem('rigby.enabled.v1', 'off');
    document.cookie = 'portfolio_cookie_preferences=1.3; Path=/';
    hunt.collect(COOKIE_TRAIL[0].id);
    expect(decodeJar(localStorage.getItem('rigby.cookie-jar.v1'))).toEqual([COOKIE_TRAIL[0].id]);
    hunt.restart();
    expect(decodeJar(localStorage.getItem('rigby.cookie-jar.v1'))).toEqual([]);
    expect(hunt.next()?.id).toBe(COOKIE_TRAIL[0].id);
    expect(localStorage.getItem('rigby.enabled.v1')).toBe('off');
    expect(document.cookie).toContain('portfolio_cookie_preferences=1.3');
  });
  it('rejects corrupt versions, ignores unknown ids and deduplicates restored cookies', () => {
    for (const value of [null, '<script>', '{}', '{"version":2,"collected":["home"]}'])
      expect(decodeJar(value)).toEqual([]);
    expect(decodeJar('{"version":1,"collected":["home","home","unknown",null]}')).toEqual(['home']);
  });
  it('keeps collecting in memory and reports blocked storage honestly', () => {
    const hunt = TestBed.inject(CookieHuntService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hunt.collect('home')).toBe(true);
    expect(hunt.count()).toBe(1);
    expect(hunt.saved()).toBe(false);
  });
});
