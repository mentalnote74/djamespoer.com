import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

const RETRY_KEY = 'portfolio.module-recovery.v1';
export const GREETING_RETRY_KEY = 'rigby.greeting-retry.v1';
const RETRY_WINDOW = 120_000;

export function isModuleLoadFailure(error: unknown, depth = 0): boolean {
  if (!error || depth > 3) return false;
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && 'message' in error
        ? String(error.message)
        : '';
  return (
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\w-]+ failed|ChunkLoadError/i.test(
      message,
    ) ||
    (typeof error === 'object' && 'cause' in error && isModuleLoadFailure(error.cause, depth + 1))
  );
}

/** One full-document recovery per two minutes, shared by routing and Rigby's deferred greeting. */
@Injectable({ providedIn: 'root' })
export class ModuleRecovery {
  private readonly document = inject(DOCUMENT);
  readonly routeFailure = signal<string | null>(null);
  constructor() {
    inject(Router, { optional: true })
      ?.events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationEnd) this.routeFailure.set(null);
      });
  }

  navigationFailed(event: NavigationError): void {
    if (!isModuleLoadFailure(event.error)) return;
    const destination = this.destination(event.url);
    if (!destination) return;
    this.routeFailure.set(destination);
    if (this.canRetry()) this.document.defaultView?.location.assign(destination);
  }

  greetingFailed(): void {
    if (this.canRetry()) this.reloadGreeting();
  }

  reloadGreeting(): void {
    const view = this.document.defaultView;
    if (!view) return;
    try {
      view.sessionStorage.setItem(GREETING_RETRY_KEY, '1');
    } catch {
      /* A manual retry still reloads. */
    }
    view.location.reload();
  }

  private destination(url: string): string | null {
    const view = this.document.defaultView;
    if (!view) return null;
    try {
      const target = new URL(url, this.document.baseURI);
      return target.origin === view.location.origin && /^https?:$/.test(target.protocol)
        ? target.href
        : null;
    } catch {
      return null;
    }
  }

  private canRetry(): boolean {
    const view = this.document.defaultView;
    if (!view || !view.navigator.onLine) return false;
    try {
      const now = Date.now();
      const previous = Number(view.sessionStorage.getItem(RETRY_KEY) || 0);
      if (previous && now - previous < RETRY_WINDOW) return false;
      view.sessionStorage.setItem(RETRY_KEY, String(now));
      return view.sessionStorage.getItem(RETRY_KEY) === String(now);
    } catch {
      return false;
    } // No durable guard: show a manual retry instead of risking a reload loop.
  }
}
