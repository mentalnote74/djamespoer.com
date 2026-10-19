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
  readonly metrics: readonly DashboardMetric[] = [
    {
      id: 'completion',
      label: 'Estimated project complete',
      value: this.summary.percent + '%',
      note: this.summary.shipped + ' / ' + this.summary.total + ' known story points shipped',
      state: 'ready',
      level: this.summary.percent,
    },
  ];
}
