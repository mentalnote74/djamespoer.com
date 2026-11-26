import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BuildometerDashboard } from './buildometer-dashboard';
import { BuildometerDataStore } from './data/buildometer-data';
import type { BuildometerData } from './data/contract';

/** The newest week of reports reads as a timeline; older ones fold away. */
const RECENT_REPORTS = 7;
@Component({
  selector: 'app-buildometer',
  imports: [RouterLink, BuildometerDashboard],
  templateUrl: './buildometer.html',
  styleUrl: './buildometer.scss',
})
export class Buildometer {
  readonly store = inject(BuildometerDataStore);
  recentReports(data: BuildometerData) {
    return (data.dailyReports ?? []).slice(0, RECENT_REPORTS);
  }
  earlierReports(data: BuildometerData) {
    return (data.dailyReports ?? []).slice(RECENT_REPORTS);
  }
}
