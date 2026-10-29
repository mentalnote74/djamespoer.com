import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeState } from './theme-state';
describe('ThemeState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 12));
  });
  afterEach(() => {
    vi.useRealTimers();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-living-sky');
  });
  it('keeps server rendering free of browser animation APIs', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const state = TestBed.inject(ThemeState);
    expect(state.activeTheme()).toBe('dusk-to-dusk');
    expect(document.documentElement.dataset['theme']).toBe('mojito');
    state.setTheme('teetotaler');
    expect(document.documentElement.hasAttribute('data-living-sky')).toBe(true);
  });
  it('initializes the root from local time in Dusk-to-Dusk without altering local artwork selectors', () => {
    const artwork = document.createElement('div');
    artwork.dataset['theme'] = 'blueprint';
    document.body.append(artwork);
    try {
      const state = TestBed.inject(ThemeState);
      expect(state.activeTheme()).toBe('dusk-to-dusk');
      expect(state.availableThemes.map((theme) => theme.id)).toEqual([
        'teetotaler',
        'tequila-sunrise',
        'mojito',
        'pina-colada',
        'mai-tai',
        'tequila-sunset',
        'rum-runner',
        'bloody-mary',
        'dusk-to-dusk',
      ]);
      expect(document.documentElement.dataset['theme']).toBe('mojito');
      expect(document.documentElement.hasAttribute('data-living-sky')).toBe(true);
      for (const theme of state.availableThemes) {
        state.setTheme(theme.id);
        expect(state.activeTheme()).toBe(theme.id);
        expect(document.documentElement.hasAttribute('data-living-sky')).toBe(true);
        expect(document.documentElement.dataset['theme']).toBe(
          theme.id === 'dusk-to-dusk' ? 'mojito' : theme.id,
        );
        expect(artwork.dataset['theme']).toBe('blueprint');
      }
      state.setTheme('teetotaler');
      expect(artwork.dataset['theme']).toBe('blueprint');
      state.setTheme('dusk-to-dusk');
      expect(document.documentElement.dataset['theme']).toBe('mojito');
      document.documentElement.dataset['theme'] = 'mojito';
      state.setTheme('dusk-to-dusk');
      expect(document.documentElement.dataset['theme']).toBe('mojito');
      state.setTheme('teetotaler');
      expect(() => state.setTheme('unapproved' as 'teetotaler')).toThrow('Unsupported theme');
      expect(state.activeTheme()).toBe('teetotaler');
    } finally {
      artwork.remove();
    }
  });
});
