import { afterNextRender, DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Browser capability/scheduling only: never changes prerendered content. */
@Injectable({ providedIn: 'root' })
export class MobileDelivery {
  private readonly viewport =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(max-width: 600px)')
      : null;
  readonly mobile = signal(this.viewport?.matches ?? false);
  readonly settled = signal(false);

  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const changed = () => {
        this.mobile.set(this.viewport?.matches ?? false);
        if (!this.mobile()) this.settled.set(true);
      };
      changed();
      this.viewport?.addEventListener('change', changed);
      // A minimum quiet startup window; idle alone can fire during early boot.
      const timer = this.mobile()
        ? window.setTimeout(() => this.settled.set(true), 5000)
        : undefined;
      destroy.onDestroy(() => {
        window.clearTimeout(timer);
        this.viewport?.removeEventListener('change', changed);
      });
    });
  }
}
