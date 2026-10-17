import { PublicAnalytics } from '../../services/public-analytics';
import { RouterLink } from '@angular/router';
import { inject } from '@angular/core';
import { CookiePreferences } from '../../features/cookie-preferences/cookie-preferences';
import { CookiePreferencesService } from '../../features/cookie-preferences/cookie-preferences.service';
import { Component, model } from '@angular/core';

@Component({
  imports: [RouterLink, CookiePreferences],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
})
export class Footer {
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
