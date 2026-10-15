import { Component } from '@angular/core';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PORTFOLIO_WORKFLOW } from '../../features/thingamajob/portfolio-workflow';
import { PortfolioReview } from '../../features/thingamajob/portfolio-review';

@Component({
  selector: 'app-thingamajob-product',
  imports: [ThingamajobWorkflow],
  providers: [{ provide: PORTFOLIO_WORKFLOW, useClass: PortfolioReview }],
  templateUrl: './thingamajob-product.html',
  styleUrl: './thingamajob-product.scss',
})
export class ThingamajobProduct {}
