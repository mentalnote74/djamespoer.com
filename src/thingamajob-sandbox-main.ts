import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { JdSandbox } from './app/features/thingamajob/jd-sandbox';
import { JD_EVALUATION_API } from './app/features/thingamajob/jd-evaluation';

bootstrapApplication(JdSandbox, {
  providers: [
    provideHttpClient(),
    {
      provide: JD_EVALUATION_API,
      useValue: { input: '/test/thingamajob/jd-input', evaluate: '/test/thingamajob/evaluate' },
    },
  ],
});
