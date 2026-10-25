import {
  Component,
  inject,
  viewChild,
  ElementRef,
  effect,
  afterNextRender,
  Injector,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RigbyPreferences } from '../cookie-preferences/rigby-preferences';
import { CookiePreferencesService } from '../cookie-preferences/cookie-preferences.service';
@Component({
  selector: 'app-rigby-greeting',
  templateUrl: './rigby-greeting.html',
  styleUrl: './rigby-greeting.scss',
})
export class RigbyGreeting {
  readonly rigby = inject(RigbyPreferences);
  private readonly preferences = inject(CookiePreferencesService);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('hello');
  private readonly title = viewChild<ElementRef<HTMLElement>>('title');
  readonly still = signal(true);
  private seen = 0;
  private returnTarget: HTMLElement | null = null;
  constructor() {
    effect(() => {
      const request = this.rigby.greetingRequest(),
        opened = this.preferences.opened();
      if (!request || request <= this.seen || opened || !this.dialog()) return;
      this.seen = request;
      afterNextRender(
        () => {
          const dialog = this.dialog()?.nativeElement;
          if (!dialog || this.document.querySelector('dialog[open]')) return;
          this.returnTarget =
            this.document.activeElement instanceof HTMLElement ? this.document.activeElement : null;
          this.still.set(
            this.rigby.paused() ||
              !!this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches,
          );
          dialog.showModal();
          this.title()?.nativeElement.focus();
          try {
            this.document.defaultView?.localStorage.setItem('rigby.greeting.seen.v1', '1');
          } catch {
            /* Optional storage. */
          }
        },
        { injector: this.injector },
      );
    });
  }
  startPlaying(): void {
    this.rigby.setEnabled(true, false);
    this.close();
  }
  close(event?: Event): void {
    event?.preventDefault();
    this.dialog()?.nativeElement.close();
    // The companion is hidden while a modal is open; restore after its lane is rendered again.
    const view = this.document.defaultView;
    const restore = () => {
      const target =
        this.returnTarget?.isConnected && this.returnTarget !== this.document.body
          ? this.returnTarget
          : this.document.querySelector<HTMLElement>('.companion-hello, main');
      target?.focus({ preventScroll: true });
    };
    if (view) view.requestAnimationFrame(() => view.requestAnimationFrame(restore));
    else restore();
  }
}
