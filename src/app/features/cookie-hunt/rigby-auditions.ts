import { Component, DestroyRef, ElementRef, inject, output, signal } from '@angular/core';
import { RIGBY_DANCES } from './rigby-dances';
@Component({
  selector: 'app-rigby-auditions',
  templateUrl: './rigby-auditions.html',
  styleUrl: './rigby-auditions.scss',
})
export class RigbyAuditions {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly dances = RIGBY_DANCES;
  readonly audition = output<number>();
  readonly stop = output<void>();
  readonly circus = output<void>();
  readonly selected = signal<number | null>(null);
  private frame = 0;
  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
  }
  play(index: number, circus = false): void {
    cancelAnimationFrame(this.frame);
    this.selected.set(index);
    this.host.nativeElement
      .querySelector('[data-rigby-audition-stage]')
      ?.scrollIntoView({ block: 'center', behavior: 'instant' });
    // Let the scroll handler settle before starting; scrolling cancels a live dance.
    this.frame = requestAnimationFrame(() => {
      this.frame = requestAnimationFrame(() =>
        circus ? this.circus.emit() : this.audition.emit(index),
      );
    });
  }
  stopAudition(): void {
    cancelAnimationFrame(this.frame);
    this.stop.emit();
  }
}
