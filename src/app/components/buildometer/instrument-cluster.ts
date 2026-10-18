import { Component, input } from '@angular/core';
import type { DashboardMetric } from './buildometer.model';
import type { InstrumentSkin } from './skins/skin.model';
/** One metric DOM for every skin; art never owns values or business data. */
@Component({
  selector: 'app-instrument-cluster',
  templateUrl: './instrument-cluster.html',
  styleUrl: './instrument-cluster.scss',
})
export class InstrumentCluster {
  readonly metrics = input.required<readonly DashboardMetric[]>();
  readonly skin = input<InstrumentSkin | null>(null);
}
