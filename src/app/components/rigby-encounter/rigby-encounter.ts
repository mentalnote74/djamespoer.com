import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicAnalytics } from '../../services/public-analytics';
import { PublicTrack } from '../../services/public-track';
import {
  along,
  Box,
  clearAt,
  clearPath,
  FOOTPRINT,
  measureWhitespace,
  Point,
  routeBetween,
} from './rigby-space';

type Pose = 'dormant' | 'roaming' | 'noticing' | 'begging' | 'celebrating' | 'resting';
const SESSION_KEY = 'rigby.first-encounter.v1';
@Component({
  selector: 'app-rigby-encounter',
  imports: [RouterLink, PublicTrack],
  templateUrl: './rigby-encounter.html',
  styleUrl: './rigby-encounter.scss',
})
export class RigbyEncounter {
  readonly ready = signal(false);
  readonly failed = signal(false);
  readonly dismissed = signal(false);
  readonly pose = signal<Pose>('dormant');
  readonly elapsed = signal(0);
  readonly paused = signal(false);
  readonly reduced = signal(true);
  readonly forced = signal(false);
  readonly visible = signal(false);
  readonly inView = signal(false);
  readonly busy = signal(false);
  readonly held = signal(false);
  readonly placed = signal(false);
  readonly position = signal<Point>({ x: 0, y: 0 });
  readonly excited = signal(false);
  readonly feedback = signal('');
  readonly offer = signal(false);
  readonly available = computed(() => this.ready() || this.forced());
  readonly canFeed = computed(
    () =>
      this.available() &&
      !this.dismissed() &&
      !this.busy() &&
      (this.pose() === 'begging' || this.forced() || !this.placed()),
  );
  readonly shown = computed(
    () => this.ready() && this.placed() && !this.dismissed() && !this.forced() && !this.busy(),
  );
  readonly frame = computed(() =>
    this.pose() === 'celebrating' ? (this.elapsed() % 700 < 350 ? 1 : 2) : this.excited() ? 2 : 0,
  );
  readonly lift = computed(() =>
    this.reduced() || this.forced()
      ? 0
      : this.pose() === 'celebrating'
        ? -Math.round(Math.sin(((this.elapsed() % 700) / 700) * Math.PI) * 14)
        : this.pose() === 'roaming'
          ? -Math.round(Math.abs(Math.sin((this.elapsed() / 180) * Math.PI)) * 4)
          : 0,
  );
  readonly running = computed(
    () =>
      this.ready() &&
      this.placed() &&
      this.visible() &&
      this.inView() &&
      !this.paused() &&
      !this.busy() &&
      !this.reduced() &&
      !this.forced() &&
      !(this.held() && this.pose() === 'roaming'),
  );
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private readonly analytics = inject(PublicAnalytics);
  private home: HTMLElement | null = null;
  private spots: Point[] = [];
  private blockers: Box[] = [];
  private width = 0;
  private path: Point[] = [];
  private travelTime = 900;
  private interactions = 0;
  private waypoint = 0;
  private exposure = false;

  constructor() {
    effect((cleanup) => {
      const view = this.document.defaultView,
        state = this.pose();
      if (
        !view ||
        !this.running() ||
        !['roaming', 'noticing', 'celebrating', 'resting'].includes(state)
      )
        return;
      let previous: number | undefined,
        request = 0;
      const tick = (now: number) => {
        if (previous !== undefined) this.advance(now - previous);
        previous = now;
        if (this.pose() === state) request = view.requestAnimationFrame(tick);
      };
      request = view.requestAnimationFrame(tick);
      cleanup(() => view.cancelAnimationFrame(request));
    });
    afterNextRender(() => {
      const view = this.document.defaultView;
      this.home = this.element.nativeElement.closest('app-home');
      if (!view || !this.home) return;
      try {
        this.dismissed.set(view.sessionStorage.getItem(SESSION_KEY) === 'dismissed');
      } catch {
        /* optional */
      }
      const reduced = view.matchMedia('(prefers-reduced-motion: reduce)'),
        forced = view.matchMedia('(forced-colors: active)');
      const update = () => {
        this.visible.set(!this.document.hidden);
        this.reduced.set(reduced.matches);
        this.forced.set(forced.matches);
        this.refreshInteraction();
        if ((reduced.matches || forced.matches) && this.pose() !== 'dormant')
          this.pose.set('begging');
        if (!this.busy()) this.refreshSpace();
      };
      let request = 0;
      const measure = () => {
        view.cancelAnimationFrame(request);
        request = view.requestAnimationFrame(() => this.refreshSpace());
      };
      const resize = new ResizeObserver(measure);
      resize.observe(this.home);
      const mutations = new MutationObserver((records) => {
        if (
          records.some(
            (r) =>
              !(r.target instanceof Element ? r.target : r.target.parentElement)?.closest(
                'app-rigby-encounter',
              ),
          )
        )
          measure();
      });
      mutations.observe(this.home, { childList: true, characterData: true, subtree: true });
      const menus = new MutationObserver(() => {
        this.refreshInteraction();
        measure();
      });
      const header = this.document.querySelector('header');
      if (header)
        menus.observe(header, {
          attributes: true,
          subtree: true,
          attributeFilter: ['aria-expanded'],
        });
      const scroll = () => {
        this.refreshViewport();
        if (!this.placed()) measure();
      };
      this.document.addEventListener('visibilitychange', update);
      this.document.addEventListener('focusin', update);
      this.document.addEventListener('focusout', update);
      this.document.addEventListener('click', measure);
      this.document.addEventListener('toggle', update, true);
      view.addEventListener('scroll', scroll, { passive: true });
      view.addEventListener('resize', measure);
      reduced.addEventListener('change', update);
      forced.addEventListener('change', update);
      update();
      measure();
      void this.document.fonts.ready.then(measure);
      const sprite = this.element.nativeElement.querySelector('img');
      if (sprite?.complete && sprite.naturalWidth) void this.decoded(sprite);
      this.destroy.onDestroy(() => {
        view.cancelAnimationFrame(request);
        resize.disconnect();
        mutations.disconnect();
        menus.disconnect();
        this.document.removeEventListener('visibilitychange', update);
        this.document.removeEventListener('focusin', update);
        this.document.removeEventListener('focusout', update);
        this.document.removeEventListener('click', measure);
        this.document.removeEventListener('toggle', update, true);
        view.removeEventListener('scroll', scroll);
        view.removeEventListener('resize', measure);
        reduced.removeEventListener('change', update);
        forced.removeEventListener('change', update);
      });
    });
  }
  refreshInteraction(): void {
    const active = this.document.activeElement;
    this.busy.set(
      !!active?.closest('input,textarea,select,[contenteditable="true"],form') ||
        !!this.document.querySelector(
          'dialog[open],[aria-modal="true"],header [aria-expanded="true"]',
        ),
    );
    this.held.set(!!active?.matches('.local-biscuit:focus-visible'));
  }
  refreshSpace(): void {
    if (!this.home || this.destroy.destroyed) return;
    const space = measureWhitespace(this.home);
    this.spots = space.spots;
    this.blockers = space.blockers;
    this.width = space.width;
    if (this.pose() === 'roaming' && !clearPath(this.path, this.blockers, this.width))
      this.pose.set('begging');
    if (this.placed() && !clearAt(this.position(), this.blockers, this.width)) {
      this.placed.set(false);
      this.pose.set('dormant');
    }
    if (!this.placed() && this.visible() && !this.busy() && !this.dismissed() && this.available()) {
      const start = this.spots.find((p) => this.onScreen(p));
      if (start) {
        this.position.set(start);
        this.placed.set(true);
        this.pose.set('begging');
        if (!this.exposure) {
          this.exposure = true;
          this.analytics.track('rigby_encounter', { location: 'page-content', action: 'shown' });
        }
        if (!this.paused()) this.relocate();
      }
    }
    this.refreshViewport();
  }
  private onScreen(point: Point): boolean {
    if (!this.home) return false;
    const home = this.home.getBoundingClientRect(),
      view = this.document.defaultView;
    const header = this.document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    return (
      !!view &&
      point.y + home.top >= Math.max(8, header + 8) &&
      point.y + home.top + FOOTPRINT.height <= view.innerHeight - 8
    );
  }
  refreshViewport(): void {
    this.inView.set(this.onScreen(this.position()));
  }
  relocate(): void {
    if (this.paused() || this.busy() || this.held() || !this.placed()) {
      this.pose.set('begging');
      return;
    }
    const current = this.position();
    for (let n = 0; n < this.spots.length; n++) {
      const next = this.spots[(this.waypoint + n) % this.spots.length];
      if (Math.hypot(next.x - current.x, next.y - current.y) < 40 || !this.onScreen(next)) continue;
      const path = routeBetween(current, next, this.blockers, this.width);
      if (!path) continue;
      this.waypoint = (this.waypoint + n + 1) % this.spots.length;
      this.excited.set(false);
      this.elapsed.set(0);
      if (this.reduced() || this.forced()) {
        this.position.set(next);
        this.pose.set('begging');
      } else {
        this.path = path;
        const distance = path
          .slice(1)
          .reduce((sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y), 0);
        this.travelTime = Math.max(900, Math.min(3000, distance * 9));
        this.pose.set('roaming');
      }
      return;
    }
    this.pose.set('begging'); // No clear corridor: repeat in place, never cross content.
  }
  advance(milliseconds: number): void {
    if (!this.running()) return;
    this.elapsed.update((t) => t + Math.min(100, milliseconds));
    const time = this.elapsed(),
      state = this.pose();
    if (state === 'roaming') {
      this.position.set(along(this.path, Math.min(1, time / this.travelTime)));
      if (time >= this.travelTime) {
        this.elapsed.set(0);
        this.pose.set('noticing');
      }
    } else if (state === 'noticing' && time >= 600) {
      this.elapsed.set(0);
      this.pose.set('begging');
    } else if (state === 'celebrating' && time >= 2100) {
      this.elapsed.set(0);
      this.pose.set('resting');
    } else if (state === 'resting' && time >= 900) {
      this.refreshSpace();
      this.relocate();
    }
  }
  async decoded(image: HTMLImageElement): Promise<void> {
    try {
      await image.decode();
      if (!this.destroy.destroyed && !this.failed()) {
        this.ready.set(true);
        this.refreshSpace();
      }
    } catch {
      this.fail();
    }
  }
  fail(): void {
    this.failed.set(true);
    this.ready.set(false);
    this.feedback.set(
      'Rigby’s picture could not load. Normal portfolio navigation is still available.',
    );
  }
  feed(): void {
    if (!this.canFeed()) return;
    this.interactions++;
    this.excited.set(true);
    this.elapsed.set(0);
    this.feedback.set(
      this.interactions % 2 ? 'Rigby loved that biscuit!' : 'Another biscuit! Rigby is delighted.',
    );
    this.offer.set(this.interactions % 2 === 0);
    this.analytics.track('rigby_encounter', { location: 'page-content', action: 'fed' });
    // Focusing the stable controls can scroll before the passive scroll event runs.
    const onScreen = this.home ? this.onScreen(this.position()) : this.inView();
    if (!onScreen) {
      this.pose.set('begging'); // Stable offscreen keyboard feedback, never an unseen journey.
    } else if (this.reduced() || this.forced() || this.paused()) {
      this.relocate();
      this.excited.set(true);
    } else this.pose.set('celebrating');
  }
  dismiss(): void {
    if (this.dismissed()) return;
    this.dismissed.set(true);
    this.placed.set(false);
    this.feedback.set('Rigby is dismissed for this visit.');
    try {
      this.document.defaultView?.sessionStorage.setItem(SESSION_KEY, 'dismissed');
    } catch {
      /* optional */
    }
    this.analytics.track('rigby_encounter', { location: 'page-content', action: 'dismissed' });
  }
}
