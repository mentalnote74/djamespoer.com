import { afterNextRender, Directive, output } from '@angular/core';

/** Fires from the actual hydrated artwork view, never the prerendering pass. */
@Directive({ selector: '[slideVisualReady]' })
export class SlideVisualReady {
  readonly slideVisualReady = output<void>();
  constructor() {
    afterNextRender(() => this.slideVisualReady.emit());
  }
}
