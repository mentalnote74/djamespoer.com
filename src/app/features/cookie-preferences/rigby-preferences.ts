import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, inject, signal } from '@angular/core';
import { GREETING_RETRY_KEY } from '../../services/module-recovery';

import { PublicAnalytics } from '../../services/public-analytics';

const KEY = 'rigby.enabled.v1';
@Injectable({ providedIn: 'root' })
export class RigbyPreferences {
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  readonly enabled = signal(false);
  readonly paused = signal(false);
  readonly anticipating = signal(false);
  readonly saved = signal(true);
  readonly greetingRequest = signal(0);
  readonly greetingOpen = signal(false);
  constructor() {
    afterNextRender(() => {
      try {
        this.enabled.set(this.document.defaultView?.localStorage.getItem(KEY) === 'on');
        if (this.document.defaultView?.localStorage.getItem(KEY) === 'off')
          this.analytics.rigbySessionState('saved_off');
        const session = this.document.defaultView?.sessionStorage;
        if (session?.getItem(GREETING_RETRY_KEY) === '1') {
          session.removeItem(GREETING_RETRY_KEY);
          this.greet();
        }
      } catch {
        /* Browsing and the in-memory choice still work. */
      }
    });
  }
  greet(): void {
    this.greetingRequest.update((value) => value + 1);
  }
  choose(enabled: boolean, greet = true): void {
    const previous = this.enabled();
    let wasOff = false;
    try {
      wasOff = this.document.defaultView?.localStorage.getItem(KEY) === 'off';
    } catch {
      /* optional */
    }
    this.setEnabled(enabled, greet);
    if (enabled) {
      try {
        this.document.defaultView?.sessionStorage.removeItem('rigby.first-encounter.v1');
      } catch {
        /* optional */
      }
    }
    if (!enabled && (previous || !wasOff))
      this.analytics.track('rigby_encounter', { location: 'rigby', action: 'dismissed' });
    if (enabled && !previous)
      this.analytics.track('rigby_encounter', {
        location: 'rigby',
        action: wasOff ? 'brought_back' : 'enabled',
      });
  }
  setEnabled(enabled: boolean, greet = true): void {
    const newlyEnabled = enabled && !this.enabled();
    this.enabled.set(enabled);
    if (newlyEnabled && greet) this.greet();
    try {
      const storage = this.document.defaultView?.localStorage;
      storage?.setItem(KEY, enabled ? 'on' : 'off');
      this.saved.set(storage?.getItem(KEY) === (enabled ? 'on' : 'off'));
    } catch {
      this.saved.set(false);
    }
  }
}
