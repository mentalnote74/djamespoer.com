import { DOCUMENT } from '@angular/common';
import { Injectable, afterNextRender, inject, signal } from '@angular/core';

const KEY = 'rigby.enabled.v1';
@Injectable({ providedIn: 'root' })
export class RigbyPreferences {
  private readonly document = inject(DOCUMENT);
  readonly enabled = signal(false);
  readonly paused = signal(false);
  readonly anticipating = signal(false);
  readonly saved = signal(true);
  readonly greetingRequest = signal(0);
  constructor() {
    afterNextRender(() => {
      try {
        this.enabled.set(this.document.defaultView?.localStorage.getItem(KEY) === 'on');
      } catch {
        /* Browsing and the in-memory choice still work. */
      }
    });
  }
  greet(): void {
    this.greetingRequest.update((value) => value + 1);
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
