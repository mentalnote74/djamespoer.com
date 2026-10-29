import {
  Component,
  ElementRef,
  DestroyRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DANCE_DURATION, DanceRequest, RIGBY_DANCES } from './rigby-dances';

@Component({
  selector: 'app-rigby-dance',
  templateUrl: './rigby-dance.html',
  styleUrl: './rigby-dance.scss',
  host: { 'aria-hidden': 'true' },
})
export class RigbyDance {
  readonly request = input.required<DanceRequest>();
  readonly still = input(false);
  readonly suspended = input(false);
  readonly finished = output<number>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ready = signal(false);
  private animations: Animation[] = [];
  private generation = 0;
  constructor() {
    afterNextRender(() => this.ready.set(true));
    effect((cleanup) => {
      const request = this.request(),
        still = this.still();
      if (!this.ready()) return;
      const generation = ++this.generation;
      this.cancel();
      let canceled = false;
      void (async () => {
        const image = new Image();
        image.src = '/assets/rigby/dance-poses-v1.webp';
        try {
          await image.decode();
        } catch {
          if (!canceled) this.finished.emit(request.token);
          return;
        }
        if (canceled || generation !== this.generation) return;
        const routine = RIGBY_DANCES[request.flavor];
        const sprite = this.host.nativeElement.querySelector<HTMLElement>('.dance-sprite');
        const mover = this.host.nativeElement.querySelector<HTMLElement>('.dance-step');
        if (!routine || !sprite || !mover) return;
        const steps = still ? [routine.steps[0], routine.steps[0]] : routine.steps;
        const options: KeyframeAnimationOptions = { duration: DANCE_DURATION, fill: 'both' };
        this.animations = [
          sprite.animate(
            steps.map((s) => ({
              backgroundPosition: `${-(s.pose % 4) * 64}px ${-Math.floor(s.pose / 4) * 64}px`,
              easing: 'steps(1,end)',
            })),
            options,
          ),
          mover.animate(
            steps.map((s) => ({
              transform: still ? 'none' : `translate(${s.x}px, ${s.y}px) rotate(${s.turn}deg)`,
            })),
            options,
          ),
        ];
        this.syncPause();
        void Promise.all(this.animations.map((a) => a.finished))
          .then(() => {
            if (!canceled && generation === this.generation) this.finished.emit(request.token);
          })
          .catch(() => {
            /* Replaced or dismissed: no stale completion. */
          });
      })();
      cleanup(() => {
        canceled = true;
        this.cancel();
      });
    });
    effect(() => {
      this.suspended();
      this.syncPause();
    });
    inject(DestroyRef).onDestroy(() => {
      this.generation++;
      this.cancel();
    });
  }
  private syncPause(): void {
    for (const animation of this.animations) {
      if (this.suspended()) animation.pause();
      else animation.play();
    }
  }
  private cancel(): void {
    for (const animation of this.animations) animation.cancel();
    this.animations = [];
  }
}
