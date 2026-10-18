import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes, RenderMode } from '@angular/ssr';
import { App } from './app/app';
import { appConfig } from './app/app.config';

const config = mergeApplicationConfig(appConfig, {
  providers: [
    provideServerRendering(
      withRoutes([
        { path: '', renderMode: RenderMode.Prerender },
        { path: '**', renderMode: RenderMode.Client },
      ]),
    ),
  ],
});
export default (context: BootstrapContext) => bootstrapApplication(App, config, context);
