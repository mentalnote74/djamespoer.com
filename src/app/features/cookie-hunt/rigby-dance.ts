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
import {
  DANCE_DURATION,
  DANCE_CLIPS,
  DanceRequest,
  RIGBY_DANCES,
  type DanceStep,
} from './rigby-dances';

@Component({
  selector: 'app-rigby-dance',
  templateUrl: './rigby-dance.html',
  styleUrl: './rigby-dance.scss',
  host: { 'aria-hidden': 'true' },
})
export class RigbyDance {
  readonly crumbs = [0, 1, 2, 3, 4, 5];
  readonly request = input.required<DanceRequest>();
  readonly still = input(false);
  readonly facing = input(1);
  readonly air = input(112);
  readonly suspended = input(false);
  readonly finished = output<number>();
  readonly unavailable = output<number>();
  private atlas?: Promise<void>;
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
        if (!this.atlas) {
          const image = new Image();
          image.src = '/assets/rigby/dance-poses-v1.webp';
          this.atlas = image.decode();
        }
        try {
          await this.atlas;
        } catch {
          if (!canceled) this.unavailable.emit(request.token);
          return;
        }
        if (canceled || generation !== this.generation) return;
        const routine = RIGBY_DANCES[request.flavor];
        const sprite = this.host.nativeElement.querySelector<HTMLElement>('.dance-sprite');
        const mover = this.host.nativeElement.querySelector<HTMLElement>('.dance-step');
        if (!routine || !sprite || !mover) return;
        const intro: readonly DanceStep[] = request.hulking
          ? [
              { pose: 2, x: 0, y: 0, turn: 0 },
              { pose: 12, x: 0, y: 0, turn: 0 },
              { pose: 13, x: 0, y: -8, turn: 0 },
            ]
          : [];
        const stillPose = request.blue ? { pose: 13, x: 0, y: 0, turn: 0 } : routine.steps[0];
        const steps = still ? [stillPose, stillPose] : [...intro, ...routine.steps];
        const options: KeyframeAnimationOptions = { duration: DANCE_DURATION, fill: 'both' };
        this.animations = [
          sprite.animate(
            steps.map((s, index) => ({
              backgroundPosition: `${-(s.pose % 4) * 64}px ${-Math.floor(s.pose / 4) * 64}px`,
              easing: 'steps(1,end)',
              clipPath: DANCE_CLIPS[s.pose],
              filter:
                request.blue && s.pose < 13 && (!request.hulking || index > 1)
                  ? 'hue-rotate(175deg) saturate(0.8)'
                  : 'none',
              transform:
                !still && s.pose >= 13
                  ? `scale(${s.pose % 2 ? 1.12 : 0.94}, ${s.pose % 2 ? 0.94 : 1.08})`
                  : 'none',
            })),
            options,
          ),
          mover.animate(
            steps.map((s) => ({
              transform: still
                ? 'none'
                : `translate(${s.x}px, ${Math.max(s.y, -this.air())}px) rotate(${s.turn}deg)`,
            })),
            options,
          ),
        ];
        if ((request.blue || request.flavor === 8) && !still) {
          const blueStart = request.blue
            ? request.hulking
              ? 2 / (steps.length - 1)
              : 0.01
            : steps.findIndex((s) => s.pose >= 13) / (steps.length - 1);
          const blueEnd = request.blue
            ? 0.99
            : (Math.max(...steps.map((s, index) => (s.pose >= 13 ? index : -1))) + 1) /
              (steps.length - 1);
          for (const [index, crumb] of Array.from(
            this.host.nativeElement.querySelectorAll<HTMLElement>('.cookie-crumb'),
          ).entries()) {
            const start = blueStart + (index * (blueEnd - blueStart - 0.18)) / 6;
            const end = Math.min(blueEnd, start + 0.18);
            this.animations.push(
              crumb.animate(
                [
                  { offset: 0, opacity: 0, transform: 'translate(0,0)' },
                  { offset: start, opacity: 0, transform: 'translate(0,0)' },
                  { offset: start + 0.005, opacity: 1, transform: 'translate(0,0)' },
                  {
                    offset: end,
                    opacity: 0,
                    transform: `translate(${(index % 2 ? 1 : -1) * (24 + index * 5)}px, ${(index % 3) * 12 - 30}px) rotate(${index * 83}deg)`,
                  },
                  { offset: 1, opacity: 0 },
                ],
                options,
              ),
            );
          }
          const nom = this.host.nativeElement.querySelector<HTMLElement>('.cookie-nom');
          if (nom)
            this.animations.push(
              nom.animate(
                [
                  { offset: 0, opacity: 0 },
                  { offset: blueStart, opacity: 0 },
                  { offset: blueStart + 0.005, opacity: 1 },
                  { offset: blueEnd - 0.005, opacity: 1 },
                  { offset: blueEnd, opacity: 0 },
                  { offset: 1, opacity: 0 },
                ],
                options,
              ),
            );
        }
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
