import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
export type ThemeId = 'teetotaler';
/** Only accepted palettes are selectable. No color or artwork logic belongs here. */
@Injectable({ providedIn: 'root' })
export class ThemeState {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<ThemeId>('teetotaler');
  readonly activeTheme = this.selected.asReadonly();
  constructor() {
    this.setTheme('teetotaler');
  }
  setTheme(theme: ThemeId): void {
    if (theme !== 'teetotaler') throw new Error('Unsupported theme');
    this.document.documentElement.setAttribute('data-theme', theme);
    this.selected.set(theme);
  }
}
