import {
  LucideAccessibility,
  LucideCookie,
  LucidePalette,
  LucideChevronDown,
} from '@lucide/angular';
import { PublicAnalytics } from '../../services/public-analytics';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { CookiePreferencesService } from '../../features/cookie-preferences/cookie-preferences.service';
import { Component, ElementRef, model, signal, viewChild } from '@angular/core';

import { ThemeState, type ThemeSelection } from '../../services/theme-state';

@Component({
  imports: [LucideAccessibility, LucideCookie, LucidePalette, LucideChevronDown, RouterLink],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
  host: { '(document:pointerdown)': 'closeThemeOnPointerOutside($event)' },
})
export class Footer {
  readonly themeState = inject(ThemeState);
  readonly themeOpen = signal(false);
  readonly toggleTheme = (open: boolean): boolean => !open;
  private readonly themePanel = viewChild<ElementRef<HTMLElement>>('themePanel');
  selectTheme(theme: ThemeSelection, trigger: HTMLButtonElement): void {
    this.themeState.setTheme(theme);
    this.themeOpen.set(false);
    trigger.focus();
  }
  closeThemeOnFocusLeave(event: FocusEvent): void {
    if (
      event.relatedTarget instanceof Node &&
      !this.themePanel()?.nativeElement.contains(event.relatedTarget)
    )
      this.themeOpen.set(false);
  }
  closeThemeOnPointerOutside(event: Event): void {
    if (event.target instanceof Node && !this.themePanel()?.nativeElement.contains(event.target))
      this.themeOpen.set(false);
  }
  closeThemeFromEscape(event: Event): void {
    if (!this.themeOpen()) return;
    this.themeOpen.set(false);
    this.themePanel()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
    event.preventDefault();
    event.stopPropagation();
  }
  private readonly analytics = inject(PublicAnalytics);
  openCookieSettings(event: MouseEvent): void {
    if (event.isTrusted) this.analytics.track('cookie_settings_open', { location: 'footer' });
    this.cookies.openSettings();
  }
  readonly cookies = inject(CookiePreferencesService);
  readonly identityPaused = model(false);
  readonly toggleIdentity = (paused: boolean): boolean => !paused;
  readonly currentYear = new Date().getFullYear();

  accessibilityStatementOpen = false;

  toggleAccessibilityStatement(): void {
    this.accessibilityStatementOpen = !this.accessibilityStatementOpen;
  }
}
