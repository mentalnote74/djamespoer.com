import { Component, model } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
})
export class Footer {
  readonly identityPaused = model(false);
  readonly toggleIdentity = (paused: boolean): boolean => !paused;
  readonly currentYear = new Date().getFullYear();

  accessibilityStatementOpen = false;

  toggleAccessibilityStatement(): void {
    this.accessibilityStatementOpen = !this.accessibilityStatementOpen;
  }
}
