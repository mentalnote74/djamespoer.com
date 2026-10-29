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
  signal,
} from '@angular/core';
import type { BedlamRuntime } from './runtime';
@Component({
  selector: 'app-bedlam',
  templateUrl: './bedlam.html',
  styleUrl: './bedlam.scss',
  host: { '[class.sky-preview]': 'skyPreview()' },
})
export class Bedlam {
  readonly speed = input(0.74);
  readonly skyPreview = input(false);
  readonly paused = model(false);
  private readonly field = viewChild<ElementRef<HTMLElement>>('field');
  private readonly layers = viewChildren<ElementRef<HTMLCanvasElement>>('layer');
  private runtime?: BedlamRuntime;
  constructor() {
    let destroyed = false;
    let generation = 0;
    const ready = signal(false);
    const zone = inject(NgZone);
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      generation++;
      this.runtime?.destroy();
    });
    effect(() => {
      const speed = this.speed();
      const paused = this.paused();
      this.runtime?.configure(speed, paused);
    });
    afterNextRender(() => ready.set(true));
    effect(() => {
      const sky = this.skyPreview();
      if (!ready()) return;
      const host = this.field()?.nativeElement;
      if (!host) return;
      const version = ++generation;
      this.runtime?.destroy();
      this.runtime = undefined;
      const loader = sky
        ? import('./sky-preview').then((m) => m.startSkyPreview)
        : import('./runtime').then((m) => m.startBedlam);
      void loader
        .then((start) => {
          if (destroyed || version !== generation) return;
          zone.runOutsideAngular(() => {
            this.runtime = start(
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
