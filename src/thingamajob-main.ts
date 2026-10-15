import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ThingamajobTestHost } from './app/features/thingamajob/test-host';
import { WorkflowApi } from './app/features/thingamajob/workflow-api';
import { WORKFLOW_API } from './app/features/thingamajob/portfolio-workflow';
bootstrapApplication(ThingamajobTestHost, {
  providers: [
    WorkflowApi,
    { provide: WORKFLOW_API, useExisting: WorkflowApi },
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
