import { inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { publicPageForPath, SITE_ORIGIN, structuredDataForPage } from '../content/public-pages';
import { JOURNAL_DATES } from '../generated/journal-routes';
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
    const page = publicPageForPath(this.urlSerializer.serialize(url));
    const path = page ? `/${page.path}` : this.urlSerializer.serialize(url);
    const canonicalUrl = `${SITE_ORIGIN}${path}`;
    let canonical = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = this.document.createElement('link');
      canonical.rel = 'canonical';
      this.document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const title = page?.title ?? this.buildTitle(routerState);

    if (title) {
      this.title.setTitle(title);
    }

    const route = this.findDeepestPrimaryRoute(routerState.root);
    const description: unknown = page?.description ?? route.data['description'];
    const published =
      !!page &&
      (!page.path.startsWith('product-journal/') ||
        JOURNAL_DATES.includes(page.path.slice('product-journal/'.length)));
    const indexable = published && route.data['robots'] !== 'noindex, nofollow';
    this.meta.updateTag({
      name: 'robots',
      content: indexable ? 'index, follow' : 'noindex, nofollow',
    });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:title', content: title ?? 'D. James Poer' });
    this.meta.updateTag({ name: 'twitter:title', content: title ?? 'D. James Poer' });

    if (typeof description === 'string') {
      this.meta.updateTag({ name: 'description', content: description });
      this.meta.updateTag({ property: 'og:description', content: description });
      this.meta.updateTag({ name: 'twitter:description', content: description });
    } else {
      this.meta.removeTag('name="description"');
      this.meta.removeTag('property="og:description"');
      this.meta.removeTag('name="twitter:description"');
    }
    this.document.getElementById('portfolio-structured-data')?.remove();
    if (page && indexable) {
      const script = this.document.createElement('script');
      script.id = 'portfolio-structured-data';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredDataForPage(page)).replace(/</g, '\\u003c');
      this.document.head.appendChild(script);
    }
  }

  private findDeepestPrimaryRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    const primaryChild = route.children.find((child) => child.outlet === PRIMARY_OUTLET);

    return primaryChild ? this.findDeepestPrimaryRoute(primaryChild) : route;
  }
}
