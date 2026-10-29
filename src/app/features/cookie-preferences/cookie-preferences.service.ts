import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, computed, inject, signal } from '@angular/core';
import { COOKIE_RETRY_KEY } from '../../services/module-recovery';
import {
  PREFERENCE_COOKIE,
  PREFERENCE_MAX_AGE,
  decodePreferences,
  encodePreferences,
} from './preferences';
@Injectable({ providedIn: 'root' })
export class CookiePreferencesService {
  private readonly document = inject(DOCUMENT);
  private readonly saved = signal<readonly string[] | null>(this.read());
  readonly selection = computed(() => this.saved() ?? []);
  readonly acknowledged = computed(() => this.saved() !== null);
  readonly opened = signal(false);
  readonly editing = signal(false);
  readonly error = signal('');
  private returnTarget: HTMLElement | null = null;
  constructor() {
    afterNextRender(() => {
      try {
        const session = this.document.defaultView?.sessionStorage;
        const intent = session?.getItem(COOKIE_RETRY_KEY);
        if (intent !== 'settings' && intent !== 'first-visit') return;
        session?.removeItem(COOKIE_RETRY_KEY);
        if (intent === 'settings') this.openSettings();
        else this.openFirstVisit();
      } catch {
        /* Storage is optional; the Cookie Jar button remains available. */
      }
    });
  }
  private read(): readonly string[] | null {
    try {
      const value = this.document.cookie
        .split(';')
        .map((v) => v.trim())
        .find((v) => v.startsWith(PREFERENCE_COOKIE + '='))
        ?.slice(PREFERENCE_COOKIE.length + 1);
      return decodePreferences(value);
    } catch {
      return null;
    }
  }
  openSettings(): void {
    this.open(true);
  }
  openFirstVisit(): void {
    if (!this.acknowledged()) this.open(false);
  }
  private open(editing: boolean): void {
    this.returnTarget =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.editing.set(editing);
    this.error.set('');
    this.opened.set(true);
  }
  save(selected: readonly string[]): void {
    try {
      const value = encodePreferences(selected);
      this.document.cookie =
        PREFERENCE_COOKIE +
        '=' +
        value +
        '; Path=/; Max-Age=' +
        PREFERENCE_MAX_AGE +
        '; SameSite=Lax' +
        (this.document.location.protocol === 'https:' ? '; Secure' : '');
      const stored = this.read();
      if (stored === null || encodePreferences(stored) !== value)
        throw new Error('Preference not saved');
      this.saved.set(stored);
      this.close();
    } catch {
      this.error.set(
        'Your browser could not save this choice. You can close this window and continue without saving.',
      );
    }
  }
  close(): void {
    this.opened.set(false);
    const target = this.returnTarget;
    this.returnTarget = null;
    queueMicrotask(() => {
      if (target?.isConnected) target.focus();
    });
  }
}
