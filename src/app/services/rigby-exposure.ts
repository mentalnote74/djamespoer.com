import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { PublicAnalytics } from './public-analytics';

/** Observe rendered, on-screen availability, never animation frames or pointer trails. */
@Directive({ selector: '[rigbyExposure]' })
export class RigbyExposure {
  readonly rigbyExposure = input.required<'encounter' | 'companion' | 'greeting'>();
  readonly rigbyAvailable = input(true);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  private readonly destroy = inject(DestroyRef);
  private visible = (): boolean => {
    const view = this.document.defaultView;
    if (
      !view ||
      this.destroy.destroyed ||
      !this.rigbyAvailable() ||
      this.document.hidden ||
      !this.element.isConnected
    )
      return false;
    const rect = this.element.getBoundingClientRect();
    if (
      !rect.width ||
      !rect.height ||
      rect.bottom <= 0 ||
      rect.right <= 0 ||
      rect.top >= view.innerHeight ||
      rect.left >= view.innerWidth
    )
      return false;
    for (let node: HTMLElement | null = this.element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)
        return false;
      if (node instanceof HTMLDialogElement && !node.open) return false;
    }
    return true;
  };
  constructor() {
    const check = () => {
      if (this.visible())
        this.analytics.rigbySessionState('shown', this.rigbyExposure(), this.visible);
    };
    afterRenderEffect(() => {
      this.rigbyAvailable();
      check();
    });
    // IO covers offscreen -> onscreen without tracking scroll positions.
    const view = this.document.defaultView;
    const observer =
      typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(check);
    observer?.observe(this.element);
    this.document.addEventListener?.('visibilitychange', check);
    view?.addEventListener?.('portfolio-analytics-change', check);
    view?.addEventListener?.('portfolio-analytics-activity', check);
    this.destroy.onDestroy(() => {
      observer?.disconnect();
      this.document.removeEventListener?.('visibilitychange', check);
      view?.removeEventListener?.('portfolio-analytics-change', check);
      view?.removeEventListener?.('portfolio-analytics-activity', check);
    });
  }
}
