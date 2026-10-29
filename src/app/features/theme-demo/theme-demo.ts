import { DOCUMENT } from '@angular/common';
import {
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ThemeState } from '../../services/theme-state';
import { livingFrame, livingTiming } from '../../services/living-theme';

@Component({
  selector: 'app-theme-demo',
  templateUrl: './theme-demo.html',
  styleUrl: './theme-demo.scss',
})
export class ThemeDemo {
  readonly themes = inject(ThemeState);
  private readonly document = inject(DOCUMENT);
  private readonly original = this.themes.activeTheme();
  readonly speed = signal(1);
  readonly elapsed = signal(0);
  readonly playing = signal(false);
  readonly reduced = signal(false);
  readonly timing = computed(() => ({
    interpolationMs: livingTiming.interpolationMs / this.speed(),
    wipeMs: livingTiming.wipeMs,
  }));
  readonly cycle = computed(() => livingFrame(0, this.timing()).cycleMs);
  readonly position = computed(() => Math.round((this.elapsed() / this.cycle()) * 1000));
  readonly cycleSeconds = computed(() => (this.cycle() / 1000).toFixed(1));
  readonly frame = computed(() => livingFrame(this.elapsed(), this.timing()));
  readonly phase = computed(() => {
    const frame = this.frame();
    return frame.wipe
      ? `${frame.wipe === 'sunset' ? 'Sunset' : 'Sunrise'} wipe`
      : `${this.name(frame.from)} → ${this.name(frame.to)}`;
  });
  private base = 0;
  private started = 0;
  private timer = 0;
  private resumeWhenVisible = false;
  private readonly clock = { elapsed: () => this.current(), refreshMs: 50 };
  constructor() {
    effect(() => {
      if (!this.themes.previewing()) untracked(() => this.pause());
    });
    afterNextRender(() => {
      const view = this.document.defaultView!;
      const motion = view.matchMedia('(prefers-reduced-motion: reduce)');
      const updateMotion = () => this.reduced.set(motion.matches);
      updateMotion();
      motion.addEventListener('change', updateMotion);
      const visibility = () => {
        if (this.document.hidden) {
          this.resumeWhenVisible = this.playing();
          this.pause();
        } else if (this.resumeWhenVisible) {
          this.resumeWhenVisible = false;
          this.play();
        }
      };
      this.document.addEventListener('visibilitychange', visibility);
      this.attach();
      this.cleanup = () => {
        motion.removeEventListener('change', updateMotion);
        this.document.removeEventListener('visibilitychange', visibility);
      };
    });
    inject(DestroyRef).onDestroy(() => {
      this.pause();
      this.cleanup?.();
      if (this.themes.previewing()) this.themes.setTheme(this.original);
    });
  }
  private cleanup?: () => void;
  name(id: string): string {
    return this.themes.availableThemes.find((t) => t.id === id)?.label ?? id;
  }
  private current(): number {
    const delta = this.playing() ? this.document.defaultView!.performance.now() - this.started : 0;
    return (this.base + delta) % this.cycle();
  }
  private attach(): void {
    this.themes.setTheme('dusk-to-dusk', { timing: this.timing(), clock: this.clock });
  }
  play(): void {
    if (this.playing()) return;
    if (!this.themes.previewing()) this.attach();
    this.started = this.document.defaultView!.performance.now();
    this.playing.set(true);
    this.timer = this.document.defaultView!.setInterval(
      () => this.elapsed.set(this.current()),
      100,
    );
  }
  pause(): void {
    if (this.playing()) {
      this.base = this.current();
      this.elapsed.set(this.base);
    }
    this.playing.set(false);
    this.document.defaultView?.clearInterval(this.timer);
  }
  toggle(): void {
    if (this.playing()) this.pause();
    else this.play();
  }
  seek(value: string): void {
    this.pause();
    this.base = (Math.min(999, Math.max(0, Number(value))) / 1000) * this.cycle();
    this.elapsed.set(this.base);
    if (!this.themes.previewing()) this.attach();
  }
  changeSpeed(value: string): void {
    const wasPlaying = this.playing();
    this.pause();
    const fraction = this.base / this.cycle();
    this.speed.set(Math.min(1440, Math.max(1, Number(value))));
    this.base = fraction * this.cycle();
    this.elapsed.set(this.base);
    this.attach();
    if (wasPlaying) this.play();
  }
  reset(): void {
    this.seek('0');
  }
}
