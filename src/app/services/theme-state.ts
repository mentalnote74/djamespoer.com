import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
export type ThemeId = 'teetotaler' | 'tequila-sunrise' | 'mojito' | 'pina-colada';
/** Only accepted palettes are selectable. No color or artwork logic belongs here. */
@Injectable({ providedIn: 'root' })
export class ThemeState {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<ThemeId>('teetotaler');
  readonly activeTheme = this.selected.asReadonly();
  readonly availableThemes: readonly { id: ThemeId; label: string }[] = [
    { id: 'teetotaler', label: 'Teetotaler' },
    { id: 'tequila-sunrise', label: 'Tequila Sunrise' },
    { id: 'mojito', label: 'Mojito' },
    { id: 'pina-colada', label: 'Piña Colada' },
  ];
  constructor() {
    this.setTheme('teetotaler');
  }
  setTheme(theme: ThemeId): void {
    if (!this.availableThemes.some((available) => available.id === theme))
      throw new Error('Unsupported theme');
    this.document.documentElement.setAttribute('data-theme', theme);
    this.selected.set(theme);
  }
}
