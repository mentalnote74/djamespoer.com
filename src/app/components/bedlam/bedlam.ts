import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  model,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { BedlamRuntime } from './runtime';
@Component({ selector: 'app-bedlam', templateUrl: './bedlam.html', styleUrl: './bedlam.scss' })
export class Bedlam {
  readonly speed = input(0.12);
  readonly paused = model(false);
  private readonly field = viewChild<ElementRef<HTMLElement>>('field');
  private readonly layers = viewChildren<ElementRef<HTMLCanvasElement>>('layer');
  private runtime?: BedlamRuntime;
  constructor() {
    let destroyed = false;
    const zone = inject(NgZone);
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      this.runtime?.destroy();
    });
    effect(() => {
      const speed = this.speed();
      const paused = this.paused();
      this.runtime?.configure(speed, paused);
    });
    afterNextRender(() => {
      const host = this.field()?.nativeElement;
      if (!host) return;
      void import('./runtime')
        .then(({ startBedlam }) => {
          if (destroyed) return;
          zone.runOutsideAngular(() => {
            this.runtime = startBedlam(
              host,
              this.layers().map((layer) => layer.nativeElement),
            );
            this.runtime.configure(this.speed(), this.paused());
          });
        })
        .catch(() => {
          /* Fixed canonical identity survives unavailable enhancement. */
        });
    });
  }
}
