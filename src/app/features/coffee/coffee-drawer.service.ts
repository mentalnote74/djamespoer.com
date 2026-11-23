import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { PublicAnalytics } from '../../services/public-analytics';

/** Eager and tiny: the header opens the drawer; the drawer itself loads on first open. */
@Injectable({ providedIn: 'root' })
export class CoffeeDrawerService {
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  readonly opened = signal(false);
  private returnTarget: HTMLElement | null = null;

  open(): void {
    this.returnTarget =
      this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
    this.opened.set(true);
    this.analytics.track('coffee_open', { location: 'primary-navigation' });
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
