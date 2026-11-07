import {
  LucideAccessibility,
  LucideCookie,
  LucidePalette,
  LucideChevronDown,
} from '@lucide/angular';
import { PublicAnalytics } from '../../services/public-analytics';
import { inject } from '@angular/core';
import { CookiePreferencesService } from '../../features/cookie-preferences/cookie-preferences.service';
import { afterNextRender, Component, ElementRef, Injector, model, signal, viewChild } from '@angular/core';

import { ThemeState, type ThemeSelection } from '../../services/theme-state';
import { SOCIAL_PROFILES } from '../../content/social-profiles';
import { PublicTrack } from '../../services/public-track';

@Component({
  imports: [LucideAccessibility, LucideCookie, LucidePalette, LucideChevronDown, PublicTrack],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
  host: { '(document:pointerdown)': 'closeThemeOnPointerOutside($event)' },
})
export class Footer {
  readonly socialProfiles = SOCIAL_PROFILES;
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

  readonly accessibilityStatementOpen = signal(false);
  private readonly injector = inject(Injector);
  private readonly accessibilityHeading = viewChild<ElementRef<HTMLHeadingElement>>('accessibilityHeading');
  private readonly accessibilityTrigger = viewChild<ElementRef<HTMLButtonElement>>('accessibilityTrigger');

  toggleAccessibilityStatement(): void {
    this.accessibilityStatementOpen.update((open) => !open);
    if (this.accessibilityStatementOpen()) {
      afterNextRender(() => {
        const heading = this.accessibilityHeading()?.nativeElement;
        heading?.focus({ preventScroll: true });
        heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, { injector: this.injector });
    }
  }

  closeAccessibilityStatement(): void {
    this.accessibilityStatementOpen.set(false);
    this.accessibilityTrigger()?.nativeElement.focus();
  }
}
