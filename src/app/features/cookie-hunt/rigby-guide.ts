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
import { distanceToTarget, facingTarget, warmthAtDistance } from './rigby-scent';
import { RigbyArrival } from './rigby-arrival';
import { RigbyGreeting } from './rigby-greeting';
import { companionSpace } from './companion-space';
import { RigbyDance as RigbyDanceComponent } from './rigby-dance';
import { DanceRequest, danceEnvelope } from './rigby-dances';
import { RigbyLoadError } from './rigby-load-error';
@Component({
  selector: 'app-rigby-guide',
  imports: [RouterLink, RigbyGreeting, RigbyDanceComponent, RigbyLoadError],
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
  readonly settling = signal<'standing' | 'sitting' | 'circling' | 'resting'>('standing');
  private settleTimer = 0;
  readonly trick = signal<'sit' | 'shake' | 'beg' | 'roll' | null>(null);
  readonly facing = signal(-1);
  readonly placement = signal<{ x: number; y: number } | null>(null);
  readonly hopping = signal(false);
  readonly dance = signal<DanceRequest | null>(null);
  private danceToken = 0;
  private readonly spriteScale = signal(1);
  readonly air = computed(() =>
    Math.min(112, Math.max(0, (this.placement()?.y ?? 0) / this.spriteScale())),
  );
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
  private placementDirty = true;
  constructor() {
    effect(() => {
      const enabled = this.rigby.enabled();
      const opened = this.preferences.opened();
      const view = this.document.defaultView;
      if (enabled && !opened && view) {
        this.placementDirty = true;
        view.requestAnimationFrame(() => this.checkScent());
      }
    });
    effect(() => {
      const active =
        this.scrolling() ||
        this.hopping() ||
        this.celebrating() ||
        !!this.dance() ||
        !!this.trick() ||
        this.warmth() > 0.55 ||
        this.rigby.anticipating();
      const blocked =
        !this.rigby.enabled() ||
        this.rigby.paused() ||
        !this.visible() ||
        this.busy() ||
        this.rigby.greetingOpen() ||
        this.preferences.opened();
      untracked(() => {
        const view = this.document.defaultView;
        view?.clearTimeout(this.settleTimer);
        this.settling.set('standing');
        if (active || blocked || !view) return;
        this.settleTimer = view.setTimeout(() => {
          this.settling.set('sitting');
          this.settleTimer = view.setTimeout(() => {
            this.settling.set('circling');
            this.settleTimer = view.setTimeout(() => this.settling.set('resting'), 2700);
          }, 5000);
        }, 5000);
      });
    });
    this.destroy.onDestroy(() => this.document.defaultView?.clearTimeout(this.settleTimer));
    inject(RigbyArrival);
    this.hunt.collections.pipe(takeUntilDestroyed()).subscribe((stop) => {
      this.playDance(stop.flavor);
    });
    effect(() => {
      const blocked =
        !this.rigby.enabled() || this.rigby.greetingOpen() || this.preferences.opened();
      this.hunt.resetVersion();
      untracked(() => {
        if (blocked || this.hunt.resetVersion()) this.endDance();
      });
    });
    this.router?.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.endDance();
        this.placementDirty = true;
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
        this.placementDirty = true;
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
      const scroll = () => {
        if (this.dance()) this.endDance();
        if (!this.rigby.enabled() || this.busy()) return;
        this.placementDirty = true;
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
      const resize = () => {
        this.endDance();
        update();
      };
      view.addEventListener('resize', resize, { passive: true });
      this.document.addEventListener('pointermove', pointer, { passive: true });
      this.document.addEventListener('pointerleave', leave);
      this.document.addEventListener('focusin', focus);
      this.document.addEventListener('focusout', focus);
      const toggle = () => {
        this.endDance();
        this.placementDirty = true;
        focus();
      };
      this.document.addEventListener('toggle', toggle, true);
      this.document.addEventListener('visibilitychange', update);
      media.addEventListener('change', update);
      const layoutObserver = new ResizeObserver(() => {
        if (this.dance()) this.endDance();
        this.placementDirty = true;
        this.checkScent();
      });
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
        view.removeEventListener('resize', resize);
        this.document.removeEventListener('pointermove', pointer);
        this.document.removeEventListener('pointerleave', leave);
        this.document.removeEventListener('focusin', focus);
        this.document.removeEventListener('focusout', focus);
        this.document.removeEventListener('toggle', toggle, true);
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
    const remaining = this.hunt.stops.filter((stop) => !this.hunt.has(stop.id));
    let heat = 0,
      target: CookieStop | undefined;
    let cookiePoint: { x: number; y: number } | undefined;
    let linkPoint: { x: number; y: number } | undefined;
    const path = (this.router?.url ?? this.document.location.pathname).split(/[?#]/)[0],
      current = remaining.find((stop) => stop.path === path);
    if (current) {
      const cookie = this.document.getElementById('hidden-cookie-' + current.id);
      if (cookie) {
        const rect = cookie.getBoundingClientRect();
        cookiePoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
        linkPoint = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    this.warmth.set(Math.round(heat * 100) / 100);
    this.scent.set(target);
    const point = cookiePoint ?? linkPoint;
    if (this.placementDirty) {
      this.placementDirty = false;
      this.placeCompanion(point);
    }
    const dog = this.document.querySelector('.companion')?.getBoundingClientRect();
    const facingPoint = this.pointer ?? point;
    if (facingPoint && dog)
      this.facing.set(facingTarget(dog.left + dog.width / 2, facingPoint.x, this.facing()));
  }
  reward(): void {
    this.endDance();
    const view = this.document.defaultView;
    if (!view || !this.rigby.enabled()) return;
    view.clearTimeout(this.rewardTimer);
    view.clearTimeout(this.trickTimer);
    this.trick.set(null);
    this.celebrating.set(true);
    this.rewardTimer = view.setTimeout(() => this.celebrating.set(false), 2100);
  }
  private placeCompanion(target?: { x: number; y: number }): void {
    const view = this.document.defaultView;
    if (!view) return;
    if (this.noMotion()) {
      view.clearTimeout(this.hopTimer);
      this.hopping.set(false);
    }
    const companion = this.document.querySelector<HTMLElement>('.companion');
    const size =
      64 *
      (companion
        ? parseFloat(view.getComputedStyle(companion).getPropertyValue('--rigby-scale')) || 1
        : 1);
    this.spriteScale.set(size / 64);
    const dancing = !!this.dance();
    const movingDance = dancing && !this.noMotion();
    let next = companionSpace(this.document, target, movingDance ? danceEnvelope(size) : size);
    if (dancing && !movingDance && next) {
      // A static pose needs only its real sprite footprint, not empty choreography space.
      next = { x: next.x - size / 2, y: next.y - size / 2 };
    } else if (movingDance && !next) {
      const envelope = danceEnvelope(size);
      if (view.innerWidth >= envelope + 4 && view.innerHeight >= envelope + 4)
        next = { x: (view.innerWidth - envelope) / 2, y: (view.innerHeight - envelope) * 0.68 };
      // A deliberate celebration may cross ink; scrolling cancels it immediately.
      // Ordinary settling still requires whitespace and never rests over content.
    }
    if (!next) {
      // Dense content has no safe resting place. Wait out of sight, never lie over it.
      view.clearTimeout(this.hopTimer);
      this.hopping.set(false);
      this.placement.set(null);
      return;
    }
    const previous = this.placement();
    if (previous && Math.hypot(previous.x - next.x, previous.y - next.y) < 4) return;
    this.placement.set(next);
    if (!this.noMotion() && previous && !this.dance()) {
      this.hopping.set(true);
      view.clearTimeout(this.hopTimer);
      this.hopTimer = view.setTimeout(() => {
        this.hopping.set(false);
        this.placementDirty = true;
        this.checkScent();
      }, 700);
    } else {
      view.clearTimeout(this.hopTimer);
      this.hopping.set(false);
    }
  }
  playDance(flavor: number): void {
    if (
      !Number.isInteger(flavor) ||
      flavor < 0 ||
      flavor >= 13 ||
      !this.rigby.enabled() ||
      this.rigby.greetingOpen() ||
      this.preferences.opened() ||
      this.busy() ||
      this.document.hidden
    )
      return;
    // Latest successful collection wins: one player, no queue, no stale rewards.
    const view = this.document.defaultView;
    view?.clearTimeout(this.rewardTimer);
    view?.clearTimeout(this.trickTimer);
    view?.clearTimeout(this.hopTimer);
    this.hopping.set(false);
    this.celebrating.set(false);
    this.trick.set(null);
    this.dance.set({ token: ++this.danceToken, flavor, blue: true, hulking: true });
    this.placeCompanion();
    // A static pose without any safe resting spot stays out of sight.
    if (!this.placement()) this.endDance();
  }
  danceFinished(token: number): void {
    const current = this.dance();
    if (!current || current.token !== token) return;
    // One player, cached atlas, no queue: run every routine until browsing resumes.
    this.dance.set({
      token: ++this.danceToken,
      flavor: (current.flavor + 1) % 13,
      blue: current.blue,
    });
  }
  endDance(token?: number): void {
    if (token !== undefined && token !== this.dance()?.token) return;
    this.dance.set(null);
    this.placementDirty = true;
    this.document.defaultView?.requestAnimationFrame(() => this.checkScent());
  }
  perform(trick: 'sit' | 'shake' | 'beg' | 'roll'): void {
    this.endDance();
    const view = this.document.defaultView;
    if (!view || !this.rigby.enabled()) return;
    view.clearTimeout(this.trickTimer);
    this.trick.set(trick);
    this.trickTimer = view.setTimeout(() => this.trick.set(null), trick === 'roll' ? 2400 : 4000);
  }
}
