import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-footer',
  styleUrl: './footer.scss',
  templateUrl: './footer.html',
})
export class Footer {
  readonly currentYear = new Date().getFullYear();

  accessibilityStatementOpen = false;

  toggleAccessibilityStatement(): void {
    this.accessibilityStatementOpen = !this.accessibilityStatementOpen;
  }
}
