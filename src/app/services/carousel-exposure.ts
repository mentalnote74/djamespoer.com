import { DOCUMENT } from '@angular/common';
import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { PublicAnalytics } from './public-analytics';

/** Viewable exposure, not iframe preload/readiness or an interaction. */
@Directive({ selector: '[carouselExposure]' })
export class CarouselExposure {
  readonly carouselExposure = input.required<'shady-white-van'>();
  readonly exposureActive = input(false);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(PublicAnalytics);
  private readonly destroy = inject(DestroyRef);
  private intersecting = false;

  private visible(): boolean {
    const view = this.document.defaultView;
    if (
      !view ||
      this.destroy.destroyed ||
      !this.exposureActive() ||
      !this.intersecting ||
      this.document.hidden ||
      !this.element.isConnected
    )
      return false;
    const rect = this.element.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const visibleWidth = Math.max(
      0,
      Math.min(rect.right, view.innerWidth) - Math.max(rect.left, 0),
    );
    const visibleHeight = Math.max(
      0,
      Math.min(rect.bottom, view.innerHeight) - Math.max(rect.top, 0),
    );
    if ((visibleWidth * visibleHeight) / (rect.width * rect.height) < 0.5) return false;
    for (let node: HTMLElement | null = this.element; node; node = node.parentElement) {
      const style = view.getComputedStyle(node);
      if (
        node.hidden ||
        node.hasAttribute('inert') ||
        node.getAttribute('aria-hidden') === 'true' ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        (style.opacity !== '' && Number(style.opacity) === 0)
      )
        return false;
    }
    return true;
  }

  constructor() {
    const check = () => {
      if (this.visible()) this.analytics.carouselExposure(this.carouselExposure());
    };
    afterRenderEffect(() => {
      this.exposureActive();
      check();
    });
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(
            (entries) => {
              this.intersecting = entries.some(
                (entry) =>
                  entry.target === this.element &&
                  entry.isIntersecting &&
                  entry.intersectionRatio >= 0.5,
              );
              check();
            },
            { threshold: [0, 0.5, 1] },
          );
    observer?.observe(this.element);
    const view = this.document.defaultView;
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
