import { Component } from '@angular/core';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PORTFOLIO_WORKFLOW } from '../../features/thingamajob/portfolio-workflow';
import { PortfolioReview } from '../../features/thingamajob/portfolio-review';

@Component({
  selector: 'app-thingamajob-product',
  imports: [ThingamajobWorkflow],
  // Public case study stays local. A protected evaluator belongs in the protected bootstrap,
  // with server-scoped APIs, not an adapter swap on this public route.
  providers: [{ provide: PORTFOLIO_WORKFLOW, useClass: PortfolioReview }],
  templateUrl: './thingamajob-product.html',
  styleUrl: './thingamajob-product.scss',
})
export class ThingamajobProduct {}
