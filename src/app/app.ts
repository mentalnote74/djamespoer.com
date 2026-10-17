import { Component, ElementRef, inject, signal } from '@angular/core';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { Page } from './layout/page/page';

@Component({
  imports: [Footer, Header, Page],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly identityPaused = signal(false);

  skipToMain(event: MouseEvent): void {
    const main = this.host.nativeElement.querySelector<HTMLElement>('main#main-content');
    if (main) {
      // The document base resolves a bare fragment against Home on subroutes.
      // Focus the shared, already-rendered landmark without changing URL/history.
      event.preventDefault();
      main.focus();
    }
  }
}
