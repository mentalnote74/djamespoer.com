import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Initial lazy navigation may finish after window.load. Let its content paint first.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => window.dispatchEvent(new Event('portfolio-ready'))),
    );
  })
  .catch((err) => console.error(err));
