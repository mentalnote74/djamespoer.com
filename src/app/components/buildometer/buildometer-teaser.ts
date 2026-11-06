import { progressPresentation } from './data/progress';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { InstrumentCluster } from './instrument-cluster';
import type { DashboardMetric } from './buildometer.model';
import { BUILDOMETER_SUMMARY } from '../../generated/buildometer-summary';
@Component({
  selector: 'app-buildometer-teaser',
  imports: [RouterLink, InstrumentCluster],
  templateUrl: './buildometer-teaser.html',
  styleUrl: './buildometer-teaser.scss',
})
export class BuildometerTeaser {
  readonly summary = BUILDOMETER_SUMMARY;
  readonly progress = progressPresentation(this.summary);
  readonly metrics: readonly DashboardMetric[] = [
    {
      id: 'completion',
      label: 'Estimated project complete',
      value: this.progress.percent === null ? 'Not measured' : this.progress.percent + '%',
      note: this.summary.shipped + ' / ' + this.summary.total + ' known story points shipped',
      state: this.progress.percent === null ? 'unavailable' : 'ready',
      progress: this.progress,
      level: this.progress.percent,
    },
  ];
}
