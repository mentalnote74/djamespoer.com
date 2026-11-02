import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicTrack } from '../../services/public-track';

@Component({
  selector: 'app-swv-slide',
  imports: [RouterLink, PublicTrack],
  templateUrl: './swv-slide.html',
  styleUrl: './swv-slide.scss',
})
export class SwvSlide {
  readonly active = input(true);
  readonly hero = input(false);
  private readonly inView = signal(false);
  private readonly visible = signal(false);
  private readonly document = inject(DOCUMENT);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroy = inject(DestroyRef);
  readonly mounted = computed(() => this.active() && this.inView() && this.visible());

  constructor() {
    afterNextRender(() => {
      const update = () => this.visible.set(!this.document.hidden);
      update();
      const observer = new IntersectionObserver((entries) =>
        this.inView.set(entries.some((entry) => entry.isIntersecting)),
      );
      observer.observe(this.element.nativeElement);
      this.document.addEventListener('visibilitychange', update);
      this.destroy.onDestroy(() => {
        observer.disconnect();
        this.document.removeEventListener('visibilitychange', update);
      });
    });
  }
}
