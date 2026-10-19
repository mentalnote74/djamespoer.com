import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { BedlamConfig, BedlamPalette, bedlamThemePalette, createBedlam } from './engine';
import { BEDLAM_SEED, BEDLAM_TUNING } from './tuning';
@Component({ selector: 'app-bedlam', templateUrl: './bedlam.html', styleUrl: './bedlam.scss' })
export class Bedlam {
  readonly seed = input<string | number>(BEDLAM_SEED);
  readonly palette = input<BedlamPalette>(bedlamThemePalette);
  readonly config = input<BedlamConfig>({});
  readonly paused = model(false);
  private readonly mobile = signal(false);
  readonly settings = computed(() => ({ ...BEDLAM_TUNING, ...this.config() }));
  readonly layers = computed(() => {
    const config = this.settings();
    return createBedlam(this.palette(), this.seed(), {
      ...config,
      planes: this.mobile() ? Math.min(config.planes ?? 3, 2) : config.planes,
    });
  });
  private readonly field = viewChild<ElementRef<HTMLElement>>('field');
  private readonly visible = signal(true);
  private readonly foreground = signal(true);
  readonly motion = computed(() =>
    this.paused() || !this.visible() || !this.foreground() ? 'paused' : 'running',
  );
  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const host = this.field()?.nativeElement;
      if (!host) return;
      // Stable prerender/hydration recipe; reduce only after browser rendering.
      const viewport = window.matchMedia('(max-width: 600px)');
      const profile = () => this.mobile.set(viewport.matches);
      profile();
      viewport.addEventListener('change', profile);
      destroy.onDestroy(() => viewport.removeEventListener('change', profile));
      const document = host.ownerDocument;
      const visibility = () => this.foreground.set(!document.hidden);
      visibility();
      document.addEventListener('visibilitychange', visibility);
      const observer =
        typeof IntersectionObserver === 'undefined'
          ? undefined
          : new IntersectionObserver(([entry]) => this.visible.set(entry.isIntersecting));
      observer?.observe(host);
      destroy.onDestroy(() => {
        document.removeEventListener('visibilitychange', visibility);
        observer?.disconnect();
      });
    });
  }
}
