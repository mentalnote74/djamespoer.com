import { CookiePreferencesService } from './features/cookie-preferences/cookie-preferences.service';
import { RigbyPreferences } from './features/cookie-preferences/rigby-preferences';
import { MobileDelivery } from './services/mobile-delivery';
import { CookiePreferences } from './features/cookie-preferences/cookie-preferences';
import { Component, ElementRef, inject, signal } from '@angular/core';
import { Footer } from './components/footer/footer';
import { Header } from './components/header/header';
import { Page } from './layout/page/page';

@Component({
  imports: [Footer, Header, Page, CookiePreferences],
  selector: 'app-root',
  host: { '[class.with-rigby]': 'rigby.enabled()' },
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly rigby = inject(RigbyPreferences);
  readonly cookies = inject(CookiePreferencesService);
  readonly delivery = inject(MobileDelivery);
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
