import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { ThingamajobTestHost } from './app/features/thingamajob/test-host';
import { WorkflowApi } from './app/features/thingamajob/workflow-api';
import { WORKFLOW_API } from './app/features/thingamajob/portfolio-workflow';
import { TestSession, testSessionInterceptor } from './app/features/thingamajob/test-session';
bootstrapApplication(ThingamajobTestHost, {
  providers: [
    WorkflowApi,
    { provide: WORKFLOW_API, useExisting: WorkflowApi },
    TestSession,
    provideHttpClient(withInterceptors([testSessionInterceptor])),
    provideRouter(
      [
        {
          path: 'evaluate',
          title: 'Thingamajob — evaluate a job description',
          loadComponent: () =>
            import('./app/features/thingamajob/jd-evaluation').then((m) => m.JdEvaluation),
        },
        {
          path: '',
          pathMatch: 'full',
          title: 'Thingamajob - your career record',
          loadComponent: () =>
            import('./app/features/thingamajob/career-record').then((m) => m.CareerRecord),
        },
        {
          path: 'admin',
          data: { internal: true },
          title: 'Thingamajob internal tools',
          loadComponent: () =>
            import('./app/features/thingamajob/career-record').then((m) => m.CareerRecord),
        },
        { path: '**', redirectTo: '' },
      ],
      withHashLocation(),
    ),
  ],
});
