import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BuildometerTeaser } from '../buildometer/buildometer-teaser';
import { DeploymentHistory } from '../deployment-history/deployment-history';

/** Composition only. Each child retains its data, presentation and interaction ownership. */
@Component({
  selector: 'app-buildometer-overview',
  imports: [BuildometerTeaser, DeploymentHistory],
  templateUrl: './buildometer-overview.html',
  styleUrl: './buildometer-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildometerOverview {}
