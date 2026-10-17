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
let instanceSequence = 0;

@Component({ selector: 'app-bedlam', templateUrl: './bedlam.html', styleUrl: './bedlam.scss' })
export class Bedlam {
  readonly filterPrefix = `bedlam-cloud-${++instanceSequence}-`;
  readonly seed = input<string | number>('djamespoer-header');
  readonly palette = input<BedlamPalette>(bedlamThemePalette);
  readonly config = input<BedlamConfig>({});
  readonly speed = input(0.12);
  readonly paused = model(false);
  readonly layers = computed(() =>
    createBedlam(this.palette(), this.seed(), {
      ...this.config(),
      speed: this.config().speed ?? this.speed(),
    }),
  );
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
