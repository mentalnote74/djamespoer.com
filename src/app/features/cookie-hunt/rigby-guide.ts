import {
  Component,
  inject,
  signal,
  computed,
  effect,
  untracked,
  afterNextRender,
  DestroyRef,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CookieHuntService } from './cookie-hunt.service';
import { CookieStop } from './cookie-trail';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
import { CookiePreferencesService } from '../cookie-preferences/cookie-preferences.service';
import { distanceToTarget, warmthAtDistance } from './rigby-scent';
import { RigbyArrival } from './rigby-arrival';
import { RigbyGreeting } from './rigby-greeting';
import { companionSpace } from './companion-space';
@Component({
  selector: 'app-rigby-guide',
  imports: [RouterLink, RigbyGreeting],
  templateUrl: './rigby-guide.html',
  styleUrl: './rigby-guide.scss',
})
export class RigbyGuide {
  readonly hunt = inject(CookieHuntService);
  readonly rigby = inject(RigbyPreferences);
  readonly preferences = inject(CookiePreferencesService);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly router = inject(Router, { optional: true });
  readonly scrolling = signal(false);
  readonly warmth = signal(0);
  readonly scent = signal<CookieStop | undefined>(undefined);
  readonly visible = signal(false);
  readonly reduced = signal(true);
  readonly busy = signal(false);
  readonly celebrating = signal(false);
  readonly trick = signal<'sit' | 'shake' | 'beg' | 'roll' | null>(null);
  readonly facing = signal(-1);
  readonly placement = signal<{ x: number; y: number } | null>(null);
  readonly compact = signal(false);
  readonly hopping = signal(false);
  readonly noMotion = computed(
    () => this.rigby.paused() || this.reduced() || !this.visible() || this.busy(),
  );
  readonly mood = computed(() =>
    this.celebrating() || this.hopping()
      ? 'celebrating'
      : this.warmth() > 0.55 || this.rigby.anticipating()
        ? 'excited'
        : this.scrolling()
          ? 'walking'
          : 'bored',
  );
  readonly wagDuration = computed(() =>
    Math.round(
      this.mood() === 'bored'
        ? 2200 - this.warmth() * 1400
        : this.mood() === 'walking'
          ? 540 - this.warmth() * 360
          : 420 - this.warmth() * 280,
    ),
  );
  readonly temperature = computed(() =>
    this.warmth() > 0.85
      ? 'Cookie! Cookie!'
      : this.warmth() > 0.55
        ? 'Very warm!'
        : this.warmth() > 0.2
          ? 'Getting warmer…'
          : 'Cold trail.',
  );
  readonly destination = computed(() => this.scent() ?? this.hunt.next());
  private pointer: { x: number; y: number } | null = null;
  private lastCheck = 0;
  private idleTimer = 0;
  private rewardTimer = 0;
  private trickTimer = 0;
  private routeTimer = 0;
  private hopTimer = 0;
  private hopStep = 0;
  constructor() {
    effect(() => {
      const enabled = this.rigby.enabled();
      const opened = this.preferences.opened();
      const view = this.document.defaultView;
      if (enabled && !opened && view) view.requestAnimationFrame(() => this.checkScent());
    });
    inject(RigbyArrival);
    let count = this.hunt.count();
    effect(() => {
      const next = this.hunt.count(),
        gained = next > count && !!this.hunt.announcement();
      count = next;
      if (gained)
        untracked(() => {
          this.reward();
          this.checkScent();
        });
    });
    this.router?.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.warmth.set(0);
        this.scent.set(undefined);
        this.scrolling.set(false);
        const view = this.document.defaultView;
        if (view) {
          view.clearTimeout(this.routeTimer);
          this.routeTimer = view.setTimeout(() => this.checkScent(), 0);
        }
      }
    });
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      const media = view.matchMedia('(prefers-reduced-motion: reduce)');
      const update = () => {
        this.compact.set(view.matchMedia('(max-width: 600px)').matches);
        this.visible.set(!this.document.hidden);
        this.reduced.set(media.matches);
        this.checkScent();
      };
      const focus = () =>
        queueMicrotask(() => {
          this.busy.set(
            !!this.document.activeElement?.closest(
              'input,textarea,select,[contenteditable="true"]',
            ) || !!this.document.querySelector('dialog[open],[aria-modal="true"]'),
          );
          this.checkScent();
        });
      let previousScroll = view.scrollY;
      const scroll = () => {
        if (!this.rigby.enabled() || this.busy()) return;
        this.facing.set(view.scrollY >= previousScroll ? -1 : 1);
        previousScroll = view.scrollY;
        this.scrolling.set(true);
        if (Date.now() - this.lastCheck >= 100) this.checkScent();
        view.clearTimeout(this.idleTimer);
        this.idleTimer = view.setTimeout(() => {
          this.scrolling.set(false);
          this.checkScent();
        }, 900);
      };
      const pointer = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return;
        this.pointer = { x: event.clientX, y: event.clientY };
        if (Date.now() - this.lastCheck >= 100) this.checkScent();
      };
      const leave = () => {
        this.pointer = null;
        this.checkScent();
      };
      view.addEventListener('scroll', scroll, { passive: true });
      view.addEventListener('resize', update, { passive: true });
      this.document.addEventListener('pointermove', pointer, { passive: true });
      this.document.addEventListener('pointerleave', leave);
      this.document.addEventListener('focusin', focus);
      this.document.addEventListener('focusout', focus);
      this.document.addEventListener('toggle', focus, true);
      this.document.addEventListener('visibilitychange', update);
      media.addEventListener('change', update);
      const layoutObserver = new ResizeObserver(() => this.checkScent());
      const main = this.document.querySelector('main');
      if (main) layoutObserver.observe(main);
      update();
      this.destroy.onDestroy(() => {
        layoutObserver.disconnect();
        view.clearTimeout(this.idleTimer);
        view.clearTimeout(this.rewardTimer);
        view.clearTimeout(this.trickTimer);
        view.clearTimeout(this.routeTimer);
        view.clearTimeout(this.hopTimer);
        view.removeEventListener('scroll', scroll);
        view.removeEventListener('resize', update);
        this.document.removeEventListener('pointermove', pointer);
        this.document.removeEventListener('pointerleave', leave);
        this.document.removeEventListener('focusin', focus);
        this.document.removeEventListener('focusout', focus);
        this.document.removeEventListener('toggle', focus, true);
        this.document.removeEventListener('visibilitychange', update);
        media.removeEventListener('change', update);
      });
    });
  }
  checkScent(): void {
    this.lastCheck = Date.now();
    const view = this.document.defaultView;
    if (
      !view ||
      !this.rigby.enabled() ||
      this.document.hidden ||
      this.preferences.opened() ||
      this.busy()
    )
      return;
    if (this.compact()) this.placeCompanion();
    const remaining = this.hunt.stops.filter((stop) => !this.hunt.has(stop.id));
    let heat = 0,
      target: CookieStop | undefined;
    const path = (this.router?.url ?? this.document.location.pathname).split(/[?#]/)[0],
      current = remaining.find((stop) => stop.path === path);
    if (current) {
      const cookie = this.document.getElementById('hidden-cookie-' + current.id);
      if (cookie) {
        const rect = cookie.getBoundingClientRect();
        heat = warmthAtDistance(
          Math.abs(rect.top + rect.height / 2 - view.innerHeight * 0.55),
          view.innerHeight * 1.4,
        );
        target = heat > 0 ? current : undefined;
      }
    }
    // Ten read-only proximity samples/second at most. CSS owns every animation frame.
    for (const anchor of this.document.querySelectorAll<HTMLAnchorElement>(
      'header a[href], main a[href]',
    )) {
      const url = new URL(anchor.href, this.document.baseURI);
      const stop =
        url.origin === view.location.origin
          ? remaining.find((stop) => stop.path === url.pathname)
          : undefined;
      if (!stop) continue;
      const rect = anchor.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > view.innerHeight) continue;
      const proximity =
        anchor === this.document.activeElement
          ? 1
          : this.pointer
            ? warmthAtDistance(distanceToTarget(this.pointer.x, this.pointer.y, rect), 180)
            : 0;
      if (proximity > heat) {
        heat = proximity;
        target = stop;
      }
    }
    this.warmth.set(Math.round(heat * 100) / 100);
    this.scent.set(target);
  }
  reward(): void {
    const view = this.document.defaultView;
    if (!view || !this.rigby.enabled()) return;
    view.clearTimeout(this.rewardTimer);
    view.clearTimeout(this.trickTimer);
    this.trick.set(null);
    this.celebrating.set(true);
    this.rewardTimer = view.setTimeout(() => this.celebrating.set(false), 2100);
  }
  private placeCompanion(): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (this.noMotion()) {
      view.clearTimeout(this.hopTimer);
      this.hopping.set(false);
    }
    const resting = companionSpace(this.document);
    if (!resting && this.hopping() && !this.noMotion()) return;
    let next = resting;
    if (!next && this.noMotion()) {
      // A paused dog stays with the document's whitespace rather than covering a paragraph.
      next = { x: Math.max(2, view.innerWidth - 80), y: -66 };
    }
    if (!next) {
      this.hopStep++;
      next = {
        x: this.hopStep % 2 ? 8 : Math.max(8, view.innerWidth - 72),
        y: Math.round(view.innerHeight * (this.hopStep % 3 === 0 ? 0.35 : 0.65)),
      };
    }
    const previous = this.placement();
    if (previous && Math.hypot(previous.x - next.x, previous.y - next.y) < 4) return;
    this.placement.set(next);
    if (!this.noMotion() && (previous || !resting)) {
      this.hopping.set(true);
      view.clearTimeout(this.hopTimer);
      this.hopTimer = view.setTimeout(() => {
        this.hopping.set(false);
        this.checkScent();
      }, 700);
    } else {
      view.clearTimeout(this.hopTimer);
      this.hopping.set(false);
    }
  }
  perform(trick: 'sit' | 'shake' | 'beg' | 'roll'): void {
    const view = this.document.defaultView;
    if (!view || !this.rigby.enabled()) return;
    view.clearTimeout(this.trickTimer);
    this.trick.set(trick);
    this.trickTimer = view.setTimeout(() => this.trick.set(null), trick === 'roll' ? 2400 : 4000);
  }
}
