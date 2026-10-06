import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SmartGrid } from '../smart-grid/smart-grid';
import {
  SmartGridColumn,
  SmartGridPage,
  SmartGridPagination,
} from '../smart-grid/smart-grid.types';
import { BuildDeploymentHistoryRow } from './deployment-history-row';
import { DeploymentHistoryLoader } from './deployment-history-loader';

@Component({
  selector: 'app-deployment-history',
  imports: [SmartGrid],
  templateUrl: './deployment-history.html',
  styleUrl: './deployment-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentHistory {
  readonly source = toSignal(inject(DeploymentHistoryLoader).load(), {
    initialValue: { status: 'loading' } as const,
  });
  readonly sampleData = input(false);
  readonly rows = computed<readonly BuildDeploymentHistoryRow[]>(() => {
    const source = this.source();
    return source.status === 'ready' ? source.records : [];
  });
  readonly freshness = computed(() => {
    const source = this.source();
    return source.status === 'ready' ? source.freshness : null;
  });
  readonly loading = computed(() => this.source().status === 'loading');
  readonly error = computed(() => {
    const source = this.source();
    if (source.status === 'error')
      return source.reason === 'invalid-snapshot'
        ? 'Build & Deployment History could not be verified.'
        : 'Build & Deployment History could not be loaded.';
    return null;
  });
  // Preserve the approved initial client-pagination size.
  readonly pagination = signal<SmartGridPagination>({ mode: 'client', pageIndex: 0, pageSize: 5 });
  readonly pageSizes: readonly number[] = [5, 10];
  readonly rowKey = (row: BuildDeploymentHistoryRow): string => row.id;

  private readonly dateFormatter = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });

  readonly columns: readonly SmartGridColumn<BuildDeploymentHistoryRow>[] = [
    {
      id: 'summary',
      header: 'Change',
      rowHeader: true,
      text: (row) => row.summary ?? 'Pipeline attempt',
    },
    { id: 'created', header: 'Attempt created (UTC)', text: (row) => this.formatCreatedAt(row) },
    { id: 'environment', header: 'Target', text: (row) => this.formatEnvironment(row) },
    { id: 'status', header: 'Result', text: (row) => this.formatStatus(row) },
    { id: 'revision', header: 'Revision', text: (row) => row.revision ?? 'Unavailable' },
  ];

  formatCreatedAt(row: BuildDeploymentHistoryRow): string {
    return `${this.dateFormatter.format(new Date(row.createdAt))} UTC`;
  }

  formatEnvironment(row: BuildDeploymentHistoryRow): string {
    const labels: Record<BuildDeploymentHistoryRow['environment'], string> = {
      production: 'Production',
      preview: 'Preview',
    };
    return labels[row.environment];
  }

  formatStatus(row: BuildDeploymentHistoryRow): string {
    const labels: Record<BuildDeploymentHistoryRow['status'], string> = {
      queued: 'Queued',
      'in-progress': 'In progress',
      succeeded: 'Succeeded',
      failed: 'Failed',
      cancelled: 'Cancelled',
      skipped: 'Skipped',
      terminated: 'Terminated',
    };
    const stages = { deployed: 'Deployed' };
    return `${labels[row.status]} \u00b7 ${row.stage ? stages[row.stage] : 'Stage unavailable'}`;
  }

  changePage(page: SmartGridPage): void {
    this.pagination.set({ mode: 'client', ...page });
  }
}
