import { provideClientHydration } from '@angular/platform-browser';
import { PublicAnalytics } from './services/public-analytics';
import { ThemeState } from './services/theme-state';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { PageMetadataStrategy } from './services/page-metadata-strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      inject(ThemeState);
      inject(PublicAnalytics);
    }),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideClientHydration(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: TitleStrategy, useExisting: PageMetadataStrategy },
  ],
};
