import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet],
  selector: 'app-page',
  styleUrl: './page.scss',
  templateUrl: './page.html',
})
export class Page {
  readonly independentLayout = signal(false);
  setLayout(layout: unknown): void {
    this.independentLayout.set(layout === 'independent');
  }
}
