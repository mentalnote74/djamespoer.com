import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { BedlamConfig, BedlamPalette, bedlamThemePalette, createBedlam } from './engine';
import { BEDLAM_TUNING } from './tuning';
let instanceSequence = 0;
@Component({ selector: 'app-bedlam', templateUrl: './bedlam.html', styleUrl: './bedlam.scss' })
export class Bedlam {
  readonly filterId = `bedlam-field-${++instanceSequence}`;
  readonly seed = input<string | number>('djamespoer-header');
  readonly palette = input<BedlamPalette>(bedlamThemePalette);
  readonly config = input<BedlamConfig>({});
  readonly paused = model(false);
  private readonly mobile = signal(false);
  private readonly visible = signal(true);
  private readonly foreground = signal(true);
  private readonly reduced = signal(true);
  private readonly forced = signal(false);
  private readonly field = viewChild<ElementRef<SVGSVGElement>>('field');
  readonly recipe = computed(() => {
    const config = { ...BEDLAM_TUNING, ...this.config() };
    return createBedlam(this.palette(), this.seed(), {
      ...config,
      detail: this.mobile() ? 1 : config.detail,
    });
  });
  readonly motion = computed(() =>
    this.paused() ||
    this.reduced() ||
    this.forced() ||
    !this.visible() ||
    !this.foreground() ||
    !this.recipe().moving
      ? 'paused'
      : 'running',
  );
  constructor() {
    effect(() => {
      const svg = this.field()?.nativeElement;
      if (!svg || typeof svg.pauseAnimations !== 'function') return;
      if (this.motion() === 'paused') svg.pauseAnimations();
      else svg.unpauseAnimations();
    });
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const svg = this.field()?.nativeElement;
      if (!svg) return;
      const doc = svg.ownerDocument;
      const media = [
        window.matchMedia('(max-width: 600px)'),
        window.matchMedia('(prefers-reduced-motion: reduce)'),
        window.matchMedia('(forced-colors: active)'),
      ];
      const profile = () => {
        this.mobile.set(media[0].matches);
        this.reduced.set(media[1].matches);
        this.forced.set(media[2].matches);
      };
      profile();
      media.forEach((m) => m.addEventListener('change', profile));
      const visibility = () => this.foreground.set(!doc.hidden);
      visibility();
      doc.addEventListener('visibilitychange', visibility);
      const observer =
        typeof IntersectionObserver === 'undefined'
          ? undefined
          : new IntersectionObserver(([entry]) => this.visible.set(entry.isIntersecting));
      observer?.observe(svg);
      destroy.onDestroy(() => {
        media.forEach((m) => m.removeEventListener('change', profile));
        doc.removeEventListener('visibilitychange', visibility);
        observer?.disconnect();
      });
    });
  }
}
