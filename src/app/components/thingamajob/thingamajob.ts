import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThingamajobWorkflow } from '../../features/thingamajob/workflow';
import { PORTFOLIO_WORKFLOW } from '../../features/thingamajob/portfolio-workflow';
import { PortfolioReview } from '../../features/thingamajob/portfolio-review';
@Component({
  imports: [RouterLink, ThingamajobWorkflow],
  providers: [{ provide: PORTFOLIO_WORKFLOW, useClass: PortfolioReview }],
  selector: 'app-thingamajob',
  templateUrl: './thingamajob.html',
  styleUrl: './thingamajob.scss',
})
export class Thingamajob {}
