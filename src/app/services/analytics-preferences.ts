import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const ANALYTICS_CONSENT_COOKIE = 'portfolio_analytics_consent';
export const INTERNAL_BROWSER_KEY = 'portfolio.analytics.internal';
export function analyticsConsent(document: Document): boolean {
  try {
    const saved = document.cookie
      .split(';')
      .map((value) => value.trim())
      .filter((value) => value.startsWith(ANALYTICS_CONSENT_COOKIE + '='));
    // Owner policy: unset is enabled; a saved denial remains authoritative.
    return (
      saved.length === 0 || saved.every((value) => value === ANALYTICS_CONSENT_COOKIE + '=granted')
    );
  } catch {
    return false;
  }
}
/** Independent of playful preferences. Reload ends the old tag/queue on every change. */
@Injectable({ providedIn: 'root' })
export class AnalyticsPreferences {
  private readonly document = inject(DOCUMENT);
  readonly granted = signal(analyticsConsent(this.document));
  readonly internal = signal(this.readInternal());
  readonly error = signal('');
  private readInternal(): boolean {
    try {
      return this.document.defaultView?.localStorage.getItem(INTERNAL_BROWSER_KEY) === '1';
    } catch {
      return true;
    } // Fail closed; no collection when the opt-out cannot be checked.
  }
  setConsent(granted: boolean): void {
    if (!granted) this.disableTag();
    try {
      this.document.cookie =
        ANALYTICS_CONSENT_COOKIE +
        '=' +
        (granted ? 'granted' : 'denied') +
        '; Path=/; Max-Age=15552000; SameSite=Lax' +
        (this.document.location.protocol === 'https:' ? '; Secure' : '');
      if (analyticsConsent(this.document) !== granted) throw new Error('Not saved');
      if (!granted) {
        try {
          this.document.defaultView?.localStorage.removeItem('rigby.analytics-session.v1');
        } catch {
          /* Consent is still saved. */
        }
      }
      this.granted.set(granted);
      this.reload();
    } catch {
      this.error.set(
        'This browser could not save the analytics choice. Collection remains blocked when preferences cannot be read.',
      );
    }
  }
  setInternal(internal: boolean): void {
    if (internal) this.disableTag();
    try {
      const storage = this.document.defaultView?.localStorage;
      if (!storage) throw new Error('No storage');
      if (internal) storage.setItem(INTERNAL_BROWSER_KEY, '1');
      else storage.removeItem(INTERNAL_BROWSER_KEY);
      if (this.readInternal() !== internal) throw new Error('Not saved');
      this.internal.set(internal);
      this.reload();
    } catch {
      this.error.set('This browser could not save the internal marker. No change was confirmed.');
    }
  }
  private disableTag(): void {
    const view = this.document.defaultView as
      (Window & { 'ga-disable-G-WQBYGF4Z8F'?: boolean }) | null;
    if (view) view['ga-disable-G-WQBYGF4Z8F'] = true;
  }
  private reload(): void {
    this.error.set('');
    // Tell other open tabs to end their old tag/queue too; no visitor identifier or history.
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('portfolio-analytics-preferences');
        channel.postMessage('changed');
        channel.close();
      }
    } catch {
      /* Reload still applies the saved choice in this tab. */
    }
    this.document.defaultView?.dispatchEvent(new Event('portfolio-analytics-change'));
    this.document.defaultView?.location.reload();
  }
}
