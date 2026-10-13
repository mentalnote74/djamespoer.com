import { TestBed } from '@angular/core/testing';
import { ThemeState } from './theme-state';
describe('ThemeState', () => {
  afterEach(() => document.documentElement.removeAttribute('data-theme'));
  it('initializes the root to Teetotaler without altering local artwork selectors', () => {
    const artwork = document.createElement('div');
    artwork.dataset['theme'] = 'blueprint';
    document.body.append(artwork);
    try {
      const state = TestBed.inject(ThemeState);
      expect(state.activeTheme()).toBe('teetotaler');
      expect(document.documentElement.dataset['theme']).toBe('teetotaler');
      for (const theme of state.availableThemes) {
        state.setTheme(theme.id);
        expect(state.activeTheme()).toBe(theme.id);
        expect(document.documentElement.dataset['theme']).toBe(
          theme.id === 'dusk-to-dusk' ? 'tequila-sunrise' : theme.id,
        );
        expect(artwork.dataset['theme']).toBe('blueprint');
      }
      state.setTheme('teetotaler');
      expect(artwork.dataset['theme']).toBe('blueprint');
      expect(() => state.setTheme('unapproved' as 'teetotaler')).toThrow('Unsupported theme');
      expect(state.activeTheme()).toBe('teetotaler');
    } finally {
      artwork.remove();
    }
  });
});
