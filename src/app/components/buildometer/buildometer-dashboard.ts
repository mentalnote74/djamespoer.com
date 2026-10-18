import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { InstrumentCluster } from './instrument-cluster';
import { MetricChart } from './metric-chart';
import { BuildometerDataStore } from './data/buildometer-data';
import { SKIN_OPTIONS, type InstrumentSkin } from './skins/skin.model';
import type { DashboardMetric } from './buildometer.model';
@Component({
  selector: 'app-buildometer-dashboard',
  imports: [InstrumentCluster, MetricChart],
  templateUrl: './buildometer-dashboard.html',
  styleUrl: './buildometer-dashboard.scss',
})
export class BuildometerDashboard {
  readonly store = inject(BuildometerDataStore);
  readonly skinOptions = SKIN_OPTIONS;
  readonly skin = signal<InstrumentSkin | null>(null);
  readonly skinError = signal(false);
  private version = 0;
  readonly metrics = computed<readonly DashboardMetric[]>(() => {
    const d = this.store.data();
    const rows: [string, string, keyof NonNullable<typeof d>['metrics']][] = [
      ['completion', 'Project complete', 'completion'],
      ['stories', 'Tracked done / open', 'done'],
      ['velocity', 'Velocity', 'velocity'],
      ['throughput', 'Jira throughput', 'throughput'],
      ['shipping', 'Deployments', 'deployments'],
      ['scope', 'Scope change', 'scopeChange'],
      ['burndown', 'Burndown', 'burndown'],
      ['bugs', 'Open bugs', 'bugHealth'],
    ];
    return rows.map(([id, label, key]) => {
      const m = d?.metrics[key],
        value =
          id === 'stories' && m?.value !== null && m?.value !== undefined
            ? `${m.value} / ${d?.metrics.remaining.value}`
            : m?.value === null || m?.value === undefined
              ? id === 'completion'
                ? '\u2014%'
                : 'Not measured'
              : String(m.value) + (id === 'completion' ? '%' : '');
      return {
        id,
        label,
        value,
        note: m?.reason || m?.unit || 'Awaiting source',
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
  constructor() {
    afterNextRender(() => {
      void this.store.load();
      void this.selectSkin('night-driver');
    });
  }
  changeSkin(e: Event): void {
    if (e.target instanceof HTMLSelectElement) void this.selectSkin(e.target.value);
  }
  async selectSkin(id: string): Promise<void> {
    const option = this.skinOptions.find((s) => s.id === id);
    if (!option) return;
    const v = ++this.version;
    try {
      const skin = await option.load();
      if (v === this.version) this.skin.set(skin);
    } catch {
      this.skinError.set(true);
    }
  }
}
