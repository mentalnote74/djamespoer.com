import { Component } from '@angular/core';
import { JdEvaluation, JD_EVALUATION_API } from '../../features/thingamajob/jd-evaluation';
@Component({
  imports: [JdEvaluation],
  providers: [
    {
      provide: JD_EVALUATION_API,
      useValue: {
        input: '/test/thingamajob/jd-input',
        evaluate: '/test/thingamajob/evaluate',
        public: true,
      },
    },
  ],
  selector: 'app-thingamajob',
  templateUrl: './thingamajob.html',
  styleUrl: './thingamajob.scss',
})
export class Thingamajob {}
