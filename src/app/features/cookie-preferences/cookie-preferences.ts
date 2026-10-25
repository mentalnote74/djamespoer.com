import { LucideX } from '@lucide/angular';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookiePreferencesService } from './cookie-preferences.service';
import { COOKIE_VARIETIES } from './preferences';
import { RigbyPreferences } from './rigby-preferences';
import { CookieHuntService } from '../cookie-hunt/cookie-hunt.service';
import { CookieSprite } from '../cookie-hunt/cookie-sprite';
@Component({
  selector: 'app-cookie-preferences',
  imports: [LucideX, RouterLink, CookieSprite],
  templateUrl: './cookie-preferences.html',
  styleUrl: './cookie-preferences.scss',
})
export class CookiePreferences {
  readonly hunt = inject(CookieHuntService);
  readonly rigby = inject(RigbyPreferences);
  readonly preferences = inject(CookiePreferencesService);
  readonly varieties = COOKIE_VARIETIES;
  readonly selected = signal<readonly string[]>([]);
  readonly choosing = signal(false);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.preferences.opened()) {
        this.selected.set([...this.preferences.selection()]);
        this.choosing.set(false);
        if (!dialog.open) {
          dialog.showModal();
          this.heading()?.nativeElement.focus();
        }
      } else if (dialog.open) dialog.close();
    });
  }
  toggle(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selected.update((values) =>
      checked ? [...values, id] : values.filter((value) => value !== id),
    );
  }
  acceptAll(): void {
    this.preferences.save(this.varieties.map((v) => v.id));
  }
  rejectAll(): void {
    this.preferences.save([]);
  }
  close(event?: Event): void {
    event?.preventDefault();
    this.preferences.close();
  }
}
