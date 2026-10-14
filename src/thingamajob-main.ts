import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ThingamajobTestHost } from './app/features/thingamajob/test-host';
bootstrapApplication(ThingamajobTestHost, {
  providers: [
    provideHttpClient(),
    provideRouter([
      {
        path: '',
        title: 'Thingamajob TEST workspace',
        loadComponent: () =>
          import('./app/features/thingamajob/workflow').then((m) => m.ThingamajobWorkflow),
      },
      { path: '**', redirectTo: '' },
    ]),
  ],
});
