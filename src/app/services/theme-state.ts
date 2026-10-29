import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, NgZone, PLATFORM_ID, signal } from '@angular/core';
import type { LivingThemeClock } from './living-theme';
import { livingFrame, livingLocalElapsed } from './living-theme-clock';
export type ThemeId =
  | 'teetotaler'
  | 'tequila-sunrise'
  | 'mojito'
  | 'pina-colada'
  | 'mai-tai'
  | 'tequila-sunset'
  | 'rum-runner'
  | 'bloody-mary';
export type ThemeSelection = ThemeId | 'dusk-to-dusk';
/** Only accepted palettes are selectable. No color or artwork logic belongs here. */
@Injectable({ providedIn: 'root' })
export class ThemeState {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly selected = signal<ThemeSelection>('dusk-to-dusk');
  private readonly zone = inject(NgZone);
  private stopLiving?: () => void;
  private selectionVersion = 0;
  readonly activeTheme = this.selected.asReadonly();
  readonly previewing = signal(false);
  readonly availableThemes: readonly { id: ThemeSelection; label: string }[] = [
    { id: 'teetotaler', label: 'Teetotaler' },
    { id: 'tequila-sunrise', label: 'Tequila Sunrise' },
    { id: 'mojito', label: 'Mojito' },
    { id: 'pina-colada', label: 'Piña Colada' },
    { id: 'mai-tai', label: 'Mai Tai' },
    { id: 'tequila-sunset', label: 'Tequila Sunset' },
    { id: 'rum-runner', label: 'Rum Runner' },
    { id: 'bloody-mary', label: 'Bloody Mary' },
    { id: 'dusk-to-dusk', label: 'Dusk-to-Dusk' },
  ];
  constructor() {
    this.setTheme('dusk-to-dusk');
    inject(DestroyRef).onDestroy(() => {
      this.selectionVersion++;
      this.stopLiving?.();
      this.document.documentElement.removeAttribute('data-living-sky');
    });
  }
  setTheme(
    theme: ThemeSelection,
    preview?: { timing: { interpolationMs: number; wipeMs: number }; clock: LivingThemeClock },
  ): void {
    if (!this.availableThemes.some((available) => available.id === theme))
      throw new Error('Unsupported theme');
    this.document.documentElement.setAttribute('data-living-sky', '');
    const version = ++this.selectionVersion;
    this.stopLiving?.();
    this.stopLiving = undefined;
    this.previewing.set(!!preview && theme === 'dusk-to-dusk');
    if (theme === 'dusk-to-dusk') {
      const view = this.browser ? this.document.defaultView : null;
      const initial = preview ? preview.clock.elapsed() : livingLocalElapsed(new Date());
      const startTime = view?.performance.now() ?? 0;
      this.document.documentElement.setAttribute(
        'data-theme',
        livingFrame(initial, preview?.timing).from,
      );
      if (view)
        void import('./living-theme')
          .then(({ startLivingTheme }) => {
            if (version === this.selectionVersion)
              this.zone.runOutsideAngular(() => {
                this.stopLiving = startLivingTheme(
                  this.document,
                  preview?.timing,
                  preview?.clock,
                  initial + view.performance.now() - startTime,
                );
              });
          })
          .catch(() => {
            if (version === this.selectionVersion) this.setTheme('tequila-sunrise');
          });
    } else {
      this.document.documentElement.setAttribute('data-theme', theme);
    }
    this.selected.set(theme);
  }
}
