import { Component, ElementRef, afterNextRender, inject, viewChild } from '@angular/core';
import { ModuleRecovery } from '../../services/module-recovery';
import { CookiePreferencesService } from './cookie-preferences.service';

@Component({ selector: 'app-cookie-load-error', templateUrl: './cookie-load-error.html' })
export class CookieLoadError {
  readonly recovery = inject(ModuleRecovery);
  readonly cookies = inject(CookiePreferencesService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterNextRender(() => {
      this.dialog()?.nativeElement.showModal();
      this.recovery.cookiesFailed(this.cookies.editing());
    });
  }
}
