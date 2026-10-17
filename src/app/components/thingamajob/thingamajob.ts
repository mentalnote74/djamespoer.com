import { Component, signal } from '@angular/core';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PORTFOLIO_WORKFLOW } from '../../features/thingamajob/portfolio-workflow';
import { PortfolioReview } from '../../features/thingamajob/portfolio-review';
@Component({
  imports: [ThingamajobWorkflow],
  providers: [{ provide: PORTFOLIO_WORKFLOW, useClass: PortfolioReview }],
  selector: 'app-thingamajob',
  templateUrl: './thingamajob.html',
  styleUrl: './thingamajob.scss',
})
export class Thingamajob {
  readonly demoInitialized = signal(false);
}
