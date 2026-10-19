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
let instanceSequence = 0;

@Component({ selector: 'app-bedlam', templateUrl: './bedlam.html', styleUrl: './bedlam.scss' })
export class Bedlam {
  readonly filterPrefix = `bedlam-cloud-${++instanceSequence}-`;
  readonly seed = input<string | number>(BEDLAM_SEED);
  readonly palette = input<BedlamPalette>(bedlamThemePalette);
  readonly config = input<BedlamConfig>({});
  readonly speed = input(BEDLAM_TUNING.speed!);
  readonly paused = model(false);
  private readonly mobile = signal(false);
  readonly settings = computed(() => ({
    ...BEDLAM_TUNING,
    ...this.config(),
    layers: { ...BEDLAM_TUNING.layers, ...this.config().layers },
  }));
  readonly presentation = computed(() => {
    const config = this.settings();
    const clamp = (value: number | undefined, fallback: number, min: number, max: number) =>
      Number.isFinite(value) ? Math.max(min, Math.min(max, value!)) : fallback;
    return {
      opacity: clamp(config.sceneOpacity, 0.72, 0, 1),
      rate: clamp(config.motionRate, 1.44, 0.25, 4),
    };
  });
  readonly layers = computed(() => {
    const config = this.settings();
    const mobile = this.mobile();
    const recipe = createBedlam(this.palette(), this.seed(), {
      ...config,
      ...(mobile
        ? {
            density: Math.min(config.density ?? 0.4, 0.4),
            particles: false,
            particleCount: 0,
            layers: { ...config.layers, rings: false },
          }
        : {}),
      speed: this.config().speed ?? this.speed(),
    });
    if (!mobile) return recipe;
    // Keep the strongest near-field material from the same seeded recipe.
    // Removing the other atmospheres also removes their SVG filter surfaces.
    const nearest = recipe
      .filter((layer) => layer.kind === 'nebula')
      .reduce(
        (near, layer) =>
          !near ||
          parseFloat(layer.style['--bedlam-depth']) > parseFloat(near.style['--bedlam-depth'])
            ? layer
            : near,
        undefined as (typeof recipe)[number] | undefined,
      );
    return recipe.filter((layer) => layer.kind !== 'nebula' || layer === nearest);
  });
  private readonly field = viewChild<ElementRef<HTMLElement>>('field');
  private readonly visible = signal(true);
  private readonly foreground = signal(true);
  readonly motion = computed(() =>
    this.paused() ||
    (this.config().speed ?? this.speed()) === 0 ||
    !this.visible() ||
    !this.foreground()
      ? 'paused'
      : 'running',
  );
  constructor() {
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const host = this.field()?.nativeElement;
      if (!host) return;
      // Both server and hydration start with the identical full recipe. Reduce only
      // after browser rendering, and restore the original recipe on wider viewports.
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
