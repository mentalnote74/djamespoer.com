import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  PRIMARY_OUTLET,
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

@Injectable({ providedIn: 'root' })
export class PageMetadataStrategy extends TitleStrategy {
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  override updateTitle(routerState: RouterStateSnapshot): void {
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
