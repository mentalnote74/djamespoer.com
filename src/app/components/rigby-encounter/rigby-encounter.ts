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
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicAnalytics } from '../../services/public-analytics';
import { PublicTrack } from '../../services/public-track';

type Pose = 'dormant' | 'arriving' | 'waiting' | 'reacting' | 'settled';
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
  readonly fed = signal(false);
  readonly pose = signal<Pose>('dormant');
  readonly elapsed = signal(0);
  readonly inView = signal(false);
  readonly visible = signal(false);
  readonly reduced = signal(true);
  readonly forced = signal(false);
  readonly paused = signal(false);
  // Native forced-color controls must not wait for hidden decorative artwork.
  readonly available = computed(() => this.ready() || this.forced());
  readonly moving = computed(
    () =>
      this.ready() &&
      this.inView() &&
      this.visible() &&
      !this.reduced() &&
      !this.forced() &&
      !this.paused() &&
      !this.dismissed(),
  );
  readonly frame = computed(() =>
    !this.fed() ? 0 : this.pose() === 'reacting' && this.elapsed() % 700 < 350 ? 1 : 2,
  );
  readonly lift = computed(() =>
    this.pose() === 'reacting' && !this.reduced() && !this.forced()
      ? -Math.round((Math.sin(((this.elapsed() % 700) / 700) * Math.PI) * 28) / 2) * 2
      : 0,
  );
  readonly entrance = computed(() =>
    this.pose() === 'arriving' ? -Math.round(((1 - this.elapsed() / 600) * 32) / 2) * 2 : 0,
  );
  readonly status = computed(() =>
    this.dismissed()
      ? 'Rigby is dismissed for this visit.'
      : this.failed()
        ? 'Rigby’s picture could not load. The portfolio is still yours to explore.'
        : this.fed()
          ? 'Rigby loved that biscuit! Explore the research story if you like.'
          : '',
  );
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  private readonly analytics = inject(PublicAnalytics);
  private readonly evidence = viewChild<ElementRef<HTMLAnchorElement>>('evidence');
  private shown = false;

  constructor() {
    effect(() => {
      if (!this.available() || !this.inView() || !this.visible() || this.dismissed()) return;
      if (!this.shown) {
        this.shown = true;
        this.analytics.track('rigby_encounter', { location: 'page-content', action: 'shown' });
      }
      if (this.pose() === 'dormant') {
        this.elapsed.set(0);
        this.pose.set(this.reduced() || this.forced() ? 'waiting' : 'arriving');
      }
      if ((this.reduced() || this.forced()) && ['arriving', 'reacting'].includes(this.pose()))
        this.pose.set(this.fed() ? 'settled' : 'waiting');
    });
    effect((cleanup) => {
      const view = this.document.defaultView;
      const pose = this.pose();
      if (!view || !this.moving() || (pose !== 'arriving' && pose !== 'reacting')) return;
      let previous: number | undefined;
      let request = 0;
      const tick = (now: number) => {
        if (previous !== undefined) this.advance(now - previous);
        previous = now;
        if (this.pose() === pose) request = view.requestAnimationFrame(tick);
      };
      request = view.requestAnimationFrame(tick);
      cleanup(() => view.cancelAnimationFrame(request));
    });
    afterNextRender(() => {
      const view = this.document.defaultView;
      if (!view) return;
      try {
        const saved = view.sessionStorage.getItem(SESSION_KEY);
        this.dismissed.set(saved === 'dismissed');
        if (saved === 'fed') {
          this.fed.set(true);
          this.pose.set('settled');
        }
      } catch {
        /* Optional session state never blocks the portfolio. */
      }
      const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
      const forced = view.matchMedia('(forced-colors: active)');
      const update = () => {
        this.visible.set(!this.document.hidden);
        this.reduced.set(reduced.matches);
        this.forced.set(forced.matches);
      };
      update();
      const sprite = this.host.nativeElement.querySelector('img');
      if (sprite?.complete) {
        if (sprite.naturalWidth) void this.decoded(sprite);
        else this.fail();
      }
      const observer = new IntersectionObserver((entries) =>
        this.inView.set(entries.some((e) => e.isIntersecting)),
      );
      observer.observe(this.host.nativeElement);
      this.document.addEventListener('visibilitychange', update);
      reduced.addEventListener('change', update);
      forced.addEventListener('change', update);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        this.document.removeEventListener('visibilitychange', update);
        reduced.removeEventListener('change', update);
        forced.removeEventListener('change', update);
      });
    });
  }

  async decoded(image: HTMLImageElement): Promise<void> {
    try {
      await image.decode();
      if (!this.destroy.destroyed && !this.failed()) this.ready.set(true);
    } catch {
      this.fail();
    }
  }
  fail(): void {
    this.failed.set(true);
    this.ready.set(false);
  }

  advance(milliseconds: number): void {
    if (!this.moving()) return;
    const duration = this.pose() === 'arriving' ? 600 : 2100;
    this.elapsed.update((value) => Math.min(duration, value + Math.min(milliseconds, 100)));
    if (this.elapsed() >= duration) this.pose.set(this.fed() ? 'settled' : 'waiting');
  }
  feed(): void {
    if (!this.available() || this.fed() || this.dismissed()) return;
    this.fed.set(true);
    this.elapsed.set(0);
    this.pose.set(this.reduced() || this.forced() ? 'settled' : 'reacting');
    this.remember('fed');
    this.analytics.track('rigby_encounter', { location: 'page-content', action: 'fed' });
  }
  dismiss(): void {
    this.dismissed.set(true);
    this.remember('dismissed');
    this.analytics.track('rigby_encounter', { location: 'page-content', action: 'dismissed' });
    this.evidence()?.nativeElement.focus();
  }
  private remember(value: 'fed' | 'dismissed'): void {
    try {
      this.document.defaultView?.sessionStorage.setItem(SESSION_KEY, value);
    } catch {
      /* optional */
    }
  }
}
