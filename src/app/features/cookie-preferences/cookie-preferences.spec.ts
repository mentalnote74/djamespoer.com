import { TestBed } from '@angular/core/testing';
import { CookiePreferencesService } from './cookie-preferences.service';
import {
  COOKIE_VARIETIES,
  PREFERENCE_COOKIE,
  decodePreferences,
  encodePreferences,
} from './preferences';
describe('Playful cookie preferences', () => {
  beforeEach(() => {
    document.cookie = PREFERENCE_COOKIE + '=; Path=/; Max-Age=0';
  });
  afterEach(() => vi.restoreAllMocks());
  it('round-trips all, none and a subset in one compact versioned value', () => {
    for (const choices of [
      [],
      COOKIE_VARIETIES.map((v) => v.id),
      ['shortbread', 'chocolate-chip'],
    ]) {
      expect(decodePreferences(encodePreferences(choices))).toEqual(
        COOKIE_VARIETIES.filter((v) => choices.includes(v.id)).map((v) => v.id),
      );
    }
    expect(encodePreferences([])).toBe('1.0');
    expect(encodePreferences(COOKIE_VARIETIES.map((v) => v.id))).toBe('1.63');
  });
  it('rejects unknown versions, malformed values and unknown bits', () => {
    for (const value of [
      undefined,
      '',
      '2.0',
      '1.-1',
      '1.64',
      '1.999',
      '1.01',
      '<script>',
      '1.2extra',
    ])
      expect(decodePreferences(value)).toBeNull();
    expect(() => encodePreferences(['tracking'])).toThrow();
  });
  it('opens first visit, stores reject-all as acknowledged and suppresses later first-visit prompts', () => {
    const service = TestBed.inject(CookiePreferencesService);
    service.openFirstVisit();
    expect(service.opened()).toBe(true);
    service.save([]);
    expect(service.acknowledged()).toBe(true);
    expect(service.opened()).toBe(false);
    expect(document.cookie).toContain(PREFERENCE_COOKIE + '=1.0');
    service.openFirstVisit();
    expect(service.opened()).toBe(false);
  });
  it('restores existing selections and updates the same cookie', () => {
    document.cookie = PREFERENCE_COOKIE + '=1.33; Path=/';
    const service = TestBed.inject(CookiePreferencesService);
    expect(service.selection()).toEqual(['chocolate-chip', 'shortbread']);
    service.openSettings();
    expect(service.editing()).toBe(true);
    service.save(['snickerdoodle']);
    expect(service.selection()).toEqual(['snickerdoodle']);
    expect(
      document.cookie.split(';').filter((c) => c.trim().startsWith(PREFERENCE_COOKIE + '=')),
    ).toHaveLength(1);
  });
  it('closing without saving writes nothing and leaves a new visitor unacknowledged', () => {
    const service = TestBed.inject(CookiePreferencesService);
    service.openFirstVisit();
    service.close();
    expect(service.acknowledged()).toBe(false);
    expect(document.cookie).not.toContain(PREFERENCE_COOKIE);
  });
  it('reports blocked persistence without pretending the choice was saved', () => {
    const service = TestBed.inject(CookiePreferencesService);
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
    service.openSettings();
    service.save([]);
    expect(service.acknowledged()).toBe(false);
    expect(service.opened()).toBe(true);
    expect(service.error()).toContain('could not save');
  });
  it('uses host-only, path-wide, SameSite and 180-day persistence', () => {
    const service = TestBed.inject(CookiePreferencesService);
    const write = vi.spyOn(document, 'cookie', 'set');
    service.save([]);
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('; Path=/; Max-Age=15552000; SameSite=Lax'),
    );
    expect(write.mock.calls[0][0]).not.toMatch(/Domain=/i);
  });
});
