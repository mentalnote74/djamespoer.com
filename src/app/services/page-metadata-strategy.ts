import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  PRIMARY_OUTLET,
  RouterStateSnapshot,
  UrlSerializer,
  TitleStrategy,
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PageMetadataStrategy extends TitleStrategy {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly urlSerializer = inject(UrlSerializer);

  override updateTitle(routerState: RouterStateSnapshot): void {
    const url = this.urlSerializer.parse(routerState.url);
    url.queryParams = {};
    url.fragment = null;
    const canonicalUrl = `https://djamespoer.com${this.urlSerializer.serialize(url)}`;
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const title = this.buildTitle(routerState);

    if (title) {
      this.title.setTitle(title);
    }

    const description: unknown = this.findDeepestPrimaryRoute(routerState.root).data['description'];

    if (typeof description === 'string') {
      this.meta.updateTag({ name: 'description', content: description });
    }
  }

  private findDeepestPrimaryRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    const primaryChild = route.children.find((child) => child.outlet === PRIMARY_OUTLET);

    return primaryChild ? this.findDeepestPrimaryRoute(primaryChild) : route;
  }
}
