import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { SmartGridCell } from '../smart-grid/smart-grid-cell';
import { SmartGrid } from '../smart-grid/smart-grid';
import {
  SmartGridColumn,
  SmartGridPage,
  SmartGridPagination,
} from '../smart-grid/smart-grid.types';
import { BuildDeploymentHistoryRow } from './deployment-history-row';
import { DeploymentHistoryLoader, DeploymentHistoryLoadState } from './deployment-history-loader';
import { MobileDelivery } from '../../services/mobile-delivery';

type DeploymentColumnId = 'summary' | 'created' | 'environment' | 'status' | 'revision';

@Component({
  selector: 'app-deployment-history',
  imports: [SmartGrid, SmartGridCell],
  templateUrl: './deployment-history.html',
  styleUrl: './deployment-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeploymentHistory {
  readonly source = signal<DeploymentHistoryLoadState>({ status: 'loading' });

  constructor() {
    const loader = inject(DeploymentHistoryLoader);
    const delivery = inject(MobileDelivery);
    const element = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    // Noncritical evidence: no request until a rendered consumer enters the viewport.
    afterNextRender(() => {
      // Keep the existing compact mobile default after hydration.
      if (delivery.mobile())
        this.pagination.set({ mode: 'client', pageIndex: 0, pageSize: 5 });
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        const subscription = loader.load().subscribe((state) => this.source.set(state));
        destroyRef.onDestroy(() => subscription.unsubscribe());
      });
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
  readonly sampleData = input(false);
  readonly caption = input('Pipeline attempts');
  readonly showCaption = input(true);
  readonly hiddenColumns = input<readonly DeploymentColumnId[]>([]);
  readonly compact = input(false);
  readonly statusStripes = input(false);
  private readonly summaryCell = viewChild<SmartGridCell<BuildDeploymentHistoryRow>>('summaryCell');
  private readonly createdCell = viewChild<SmartGridCell<BuildDeploymentHistoryRow>>('createdCell');
  readonly rows = computed<readonly BuildDeploymentHistoryRow[]>(() => {
    const source = this.source();
    return source.status === 'ready'
      ? [...source.records].sort(
          (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
        )
      : [];
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
  readonly pagination = signal<SmartGridPagination>({ mode: 'client', pageIndex: 0, pageSize: 10 });
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

  readonly visibleColumns = computed<readonly SmartGridColumn<BuildDeploymentHistoryRow>[]>(() =>
    this.columns
      .filter((column) => !this.hiddenColumns().includes(column.id as DeploymentColumnId))
      .map((column) => {
        const cell =
          column.id === 'summary'
            ? this.summaryCell()?.template
            : column.id === 'created'
              ? this.createdCell()?.template
              : undefined;
        return cell
          ? {
              id: column.id,
              header: column.header,
              rowHeader: column.rowHeader,
              width: this.compact() && column.id === 'summary' ? '44%' : undefined,
              cell,
            }
          : column;
      }),
  );
  readonly rowTone = (row: BuildDeploymentHistoryRow): 'positive' | 'negative' | 'neutral' =>
    row.status === 'succeeded'
      ? 'positive'
      : row.status === 'failed' || row.status === 'terminated'
        ? 'negative'
        : 'neutral';

  formatCompactCreatedAt(row: BuildDeploymentHistoryRow): string {
    const date = new Date(row.createdAt).toISOString();
    return `${date.slice(5, 7)}/${date.slice(8, 10)} ${date.slice(11, 16)}Z`;
  }

  statusCue(row: BuildDeploymentHistoryRow): string {
    switch (row.status) {
      case 'succeeded':
        return '\u2713';
      case 'failed':
        return '\u00d7 Failed';
      case 'terminated':
        return '\u00d7 Stopped';
      case 'in-progress':
        return '\u2026 Running';
      case 'queued':
        return '\u2026 Queued';
      case 'cancelled':
        return '\u2013 Cancelled';
      case 'skipped':
        return '\u2013 Skipped';
    }
  }

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
