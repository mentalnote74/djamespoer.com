import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { App } from './app/app';
import journal from '../public/data/product-journal.json';
import { PRERENDER_JOURNAL } from './app/components/daily-scrum-brief/journal.model';
import { appConfig } from './app/app.config';
import { PUBLIC_PAGES } from './app/content/public-pages';
import { JOURNAL_DATES } from './app/generated/journal-routes';

const config = mergeApplicationConfig(appConfig, {
  providers: [
    { provide: PRERENDER_JOURNAL, useValue: journal },
    provideServerRendering(
      withRoutes([
        ...PUBLIC_PAGES.map(({ path }) => ({ path, renderMode: RenderMode.Prerender as const })),
        {
          path: 'product-journal/:date',
          renderMode: RenderMode.Prerender,
          getPrerenderParams: async () => {
            return JOURNAL_DATES.map((date) => ({ date }));
          },
        },
        { path: '**', renderMode: RenderMode.Client },
      ]),
    ),
  ],
});
export default (context: BootstrapContext) => bootstrapApplication(App, config, context);
