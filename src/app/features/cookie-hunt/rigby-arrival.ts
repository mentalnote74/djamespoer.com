import { afterNextRender, DestroyRef, inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
/** One delayed introduction after genuine browsing, never on the rendering path. */
@Injectable({ providedIn: 'root' })
export class RigbyArrival {
  private readonly document = inject(DOCUMENT);
  private readonly rigby = inject(RigbyPreferences);
  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      try {
        if (
          view.localStorage.getItem('rigby.enabled.v1') === 'off' ||
          view.localStorage.getItem('rigby.greeting.seen.v1') === '1'
        )
          return;
      } catch {
        /* Optional storage. */
      }
      const started = view.performance.now();
      let lastContent = started,
        engaged = false,
        timer = 0,
        idle = 0,
        stopped = false;
      const engage = () => {
        engaged = true;
      };
      const observer = new MutationObserver((records) => {
        if (
          records.some(
            (record) =>
              !(
                record.target instanceof Element ? record.target : record.target.parentElement
              )?.closest('app-rigby-guide,app-cookie-preferences'),
          )
        )
          lastContent = view.performance.now();
      });
      const main = this.document.querySelector('main');
      if (main) observer.observe(main, { childList: true, subtree: true });
      const clean = () => {
        stopped = true;
        view.clearTimeout(timer);
        if (idle && 'cancelIdleCallback' in view) view.cancelIdleCallback(idle);
        observer.disconnect();
        view.removeEventListener('scroll', engage);
        this.document.removeEventListener('pointerdown', engage);
        this.document.removeEventListener('keydown', engage);
      };
      const check = () => {
        if (stopped) return;
        try {
          if (
            view.localStorage.getItem('rigby.enabled.v1') === 'off' ||
            view.localStorage.getItem('rigby.greeting.seen.v1') === '1'
          ) {
            clean();
            return;
          }
        } catch {
          /* Optional storage. */
        }
        const now = view.performance.now();
        const pending = Array.from(this.document.images).some((image) => {
          const r = image.getBoundingClientRect();
          return r.bottom > 0 && r.top < view.innerHeight && !image.complete;
        });
        const recent = view.performance
          .getEntriesByType('resource')
          .some(
            (entry) =>
              entry.startTime + entry.duration > now - 1500 &&
              /\/assets\/|\.js(?:\?|$)|\.css(?:\?|$)|\.woff2/.test(entry.name),
          );
        if (
          !engaged ||
          now - started < 10000 ||
          now - lastContent < 1500 ||
          recent ||
          pending ||
          this.document.readyState !== 'complete' ||
          this.document.fonts.status !== 'loaded' ||
          this.document.hidden ||
          this.document.querySelector('dialog[open]') ||
          this.document.activeElement?.closest('input,textarea,select,[contenteditable="true"]')
        ) {
          timer = view.setTimeout(check, 1000);
          return;
        }
        const arrive = () => {
          if (this.document.hidden) {
            timer = view.setTimeout(check, 1000);
            return;
          }
          clean();
          this.rigby.greet();
        };
        if ('requestIdleCallback' in view)
          idle = view.requestIdleCallback(arrive, { timeout: 2000 });
        else arrive();
      };
      view.addEventListener('scroll', engage, { passive: true });
      this.document.addEventListener('pointerdown', engage, { passive: true });
      this.document.addEventListener('keydown', engage);
      timer = view.setTimeout(check, 10000);
      destroy.onDestroy(clean);
    });
  }
}

