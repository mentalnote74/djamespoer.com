import {
  Component,
  computed,
  inject,
  effect,
  afterNextRender,
  Injector,
  input,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { signal } from '@angular/core';
import { CookieHuntService } from './cookie-hunt.service';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
import { cookiePlacement } from './cookie-trail';
import { CookieSprite } from './cookie-sprite';

@Component({
  selector: 'app-hidden-cookie',
  imports: [CookieSprite],
  templateUrl: './hidden-cookie.html',
  styleUrl: './hidden-cookie.scss',
})
export class HiddenCookie {
  readonly placement = input<'inline' | 'page-end'>('inline');
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  readonly hunt = inject(CookieHuntService);
  readonly rigby = inject(RigbyPreferences);
  private readonly router = inject(Router, { optional: true });
  readonly path = signal((this.router?.url ?? '/').split(/[?#]/)[0]);
  readonly stop = computed(() =>
    this.hunt.stops.find(
      (stop) => stop.path === this.path() && cookiePlacement(stop.path) === this.placement(),
    ),
  );
  constructor() {
    effect(() => {
      const cookie = this.stop();
      if (
        cookie &&
        this.rigby.enabled() &&
        this.router?.url.endsWith('#hidden-cookie-' + cookie.id)
      ) {
        afterNextRender(
          () => {
            const target = this.document.getElementById('hidden-cookie-' + cookie.id);
            target?.scrollIntoView({ block: 'center', behavior: 'instant' });
            target?.focus({ preventScroll: true });
          },
          { injector: this.injector },
        );
      }
    });
    this.router?.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.path.set(event.urlAfterRedirects.split(/[?#]/)[0]);
    });
  }
}
