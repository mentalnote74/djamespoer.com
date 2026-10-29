import { Component, afterNextRender, inject } from '@angular/core';
import { ModuleRecovery } from '../../services/module-recovery';

@Component({
  selector: 'app-rigby-load-error',
  templateUrl: './rigby-load-error.html',
})
export class RigbyLoadError {
  readonly recovery = inject(ModuleRecovery);
  constructor() {
    afterNextRender(() => this.recovery.greetingFailed());
  }
}
