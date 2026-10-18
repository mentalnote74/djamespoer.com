import { Component, computed, input } from '@angular/core';
import type { Point } from './data/contract';
@Component({
  selector: 'app-metric-chart',
  templateUrl: './metric-chart.html',
  styleUrl: './metric-chart.scss',
})
export class MetricChart {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly unit = input('items');
  readonly points = input<readonly Point[]>([]);
  readonly comparison = input<readonly Point[]>([]);
  readonly compareLabel = input('Comparison');
  readonly kind = input<'line' | 'bar'>('bar');
  readonly max = computed(() =>
    Math.max(1, ...this.points().map((p) => p.value), ...this.comparison().map((p) => p.value)),
  );
  readonly maxLabel = computed(() => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(this.max()));
  readonly bars = computed(() =>
    this.points().map((p, i, a) => ({
      ...p,
      x: 40 + (i * 440) / a.length,
      y: 160 - (p.value / this.max()) * 130,
      height: (p.value / this.max()) * 130,
      width: Math.max(2, 440 / a.length - 4),
    })),
  );
  readonly line = computed(() =>
    this.points()
      .map(
        (p, i, a) =>
          `${40 + (i * 440) / Math.max(1, a.length - 1)},${160 - (p.value / this.max()) * 130}`,
      )
      .join(' '),
  );
  readonly compareLine = computed(() =>
    this.comparison()
      .map(
        (p, i, a) =>
          `${40 + (i * 440) / Math.max(1, a.length - 1)},${160 - (p.value / this.max()) * 130}`,
      )
      .join(' '),
  );
  label(date: string): string {
    return date.slice(5, 10);
  }
}
