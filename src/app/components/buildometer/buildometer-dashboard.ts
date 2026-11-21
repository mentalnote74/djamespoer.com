import { progressPresentation, formatProgressTime } from './data/progress';
import { afterNextRender, Component, computed, inject } from '@angular/core';
import { MetricChart } from './metric-chart';
import { ProgressObservation } from './progress-observation';
import { BuildometerDataStore } from './data/buildometer-data';
import type { DashboardMetric } from './buildometer.model';
@Component({
  selector: 'app-buildometer-dashboard',
  imports: [MetricChart, ProgressObservation],
  templateUrl: './buildometer-dashboard.html',
  styleUrl: './buildometer-dashboard.scss',
})
export class BuildometerDashboard {
  readonly formatTime = formatProgressTime;
  readonly store = inject(BuildometerDataStore);
  readonly metrics = computed<readonly DashboardMetric[]>(() => {
    const d = this.store.data();
    const progress = progressPresentation(d?.supportingFacts.project);
    const rows: [string, string, keyof NonNullable<typeof d>['metrics']][] = [
      ['completion', 'Estimated project complete', 'completion'],
      ['velocity', 'Velocity', 'velocity'],
      ['throughput', 'Jira throughput', 'throughput'],
      ['shipping', 'Production deployments', 'deployments'],
      ['scope', 'Scope change', 'scopeChange'],
      ['burndown', 'Burndown', 'burndown'],
      ['bugs', 'Open bugs', 'bugHealth'],
    ];
    return rows.map(([id, label, key]) => {
      const m =
          id === 'completion'
            ? { ...d?.metrics.completion, value: progress.percent }
            : d?.metrics[key],
        value =
          m?.value === null || m?.value === undefined
            ? id === 'completion'
              ? '\u2014%'
              : 'Not measured'
            : String(m.value) + (id === 'completion' ? '%' : '');
      return {
        id,
        label,
        ...(id === 'completion' ? { progress } : {}),
        value,
        note:
          id === 'completion' && d?.supportingFacts.project
            ? `${d.supportingFacts.project.shipped} / ${d.supportingFacts.project.total} known story points shipped; ${d.supportingFacts.project.remaining} remaining`
            : m?.reason || m?.unit || 'Awaiting source',
        state:
          m?.value !== null && m?.value !== undefined
            ? 'ready'
            : this.store.loading()
              ? 'loading'
              : this.store.error()
                ? 'error'
                : 'unavailable',
        level: id === 'completion' ? (m?.value ?? null) : null,
      };
    });
  });
  /** The headline instrument leads the page; the rest read as a glance row. */
  readonly headline = computed(() => this.metrics()[0]);
  readonly glance = computed(() => this.metrics().slice(1));
  constructor() {
    afterNextRender(() => void this.store.load());
  }
}
