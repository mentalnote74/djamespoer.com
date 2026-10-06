import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DeploymentHistory } from './deployment-history';
import { SmartGrid } from '../smart-grid/smart-grid';
import { BuildDeploymentHistoryRow } from './deployment-history-row';
import { SAMPLE_DEPLOYMENTS } from './deployment-history.samples';
import { normalizeDeploymentHistory } from './deployment-history-data';
import { DeploymentHistoryLoader, DeploymentHistoryLoadState } from './deployment-history-loader';
import { ReplaySubject } from 'rxjs';

const normalized = normalizeDeploymentHistory(SAMPLE_DEPLOYMENTS);
if (!normalized.ok) throw new Error('Invalid test fixtures');
const ready: DeploymentHistoryLoadState = {
  status: 'ready',
  records: normalized.rows,
  freshness: {
    checkedAt: '2026-10-06T12:00:00.000Z',
    generatedAt: '2026-10-06T12:00:00.000Z',
    refreshStatus: 'ok',
  },
};

describe('DeploymentHistory consumer foundation', () => {
  it('uses pipeline record creation and requires explicit deployed stage', async () => {
    const { component } = await setup();
    const row = component.rows()[0]!;
    expect(component.formatCreatedAt(row)).toBe('Oct 5, 2026, 2:30 PM UTC');
    expect(component.formatStatus({ ...row, status: 'succeeded' })).toBe(
      'Succeeded \u00b7 Stage unavailable',
    );
    expect(component.formatStatus({ ...row, status: 'terminated' })).toContain('Terminated');
    expect(component.formatStatus({ ...row, status: 'succeeded', stage: 'deployed' })).toBe(
      'Succeeded \u00b7 Deployed',
    );
    expect(component.formatStatus({ ...row, status: 'failed' })).toBe(
      'Failed \u00b7 Stage unavailable',
    );
    expect(component.columns[4]!.text?.({ ...row, revision: undefined })).toBe('Unavailable');
    expect(component.columns[0]!.text?.({ ...row, summary: undefined })).toBe('Pipeline attempt');
  });

  async function setup() {
    const states = new ReplaySubject<DeploymentHistoryLoadState>(1);
    states.next(ready);
    await TestBed.configureTestingModule({
      imports: [DeploymentHistory],
      providers: [
        { provide: DeploymentHistoryLoader, useValue: { load: () => states.asObservable() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(DeploymentHistory);
    states.next(ready);
    fixture.componentRef.setInput('sampleData', true);
    fixture.detectChanges();
    const grid = fixture.debugElement.query(By.directive(SmartGrid))
      .componentInstance as SmartGrid<BuildDeploymentHistoryRow>;
    return {
      fixture,
      states,
      component: fixture.componentInstance,
      grid,
      root: fixture.nativeElement as HTMLElement,
    };
  }

  it('passes the complete sample collection and consumer contract to Smart Grid', async () => {
    const { component, grid, root } = await setup();
    expect(grid.rows()).toBe(component.rows());
    expect(grid.columns()).toBe(component.columns);
    expect(grid.rowKey()).toBe(component.rowKey);
    expect(grid.caption()).toBe('Sample pipeline attempts (development data)');
    expect(root.textContent).toContain('not actual pipeline attempts');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(root.querySelector('tbody')?.textContent).toContain(component.rows()[0]!.summary!);
    expect(root.querySelector('tbody')?.textContent).toContain(component.rows()[2]!.summary!);
  });

  it('identifies attempts independently of status, revision, and row position', async () => {
    const { component, grid } = await setup();
    const original = component.rows()[0]!;
    const updated: BuildDeploymentHistoryRow = {
      ...original,
      status: 'in-progress',
      revision: 'd'.repeat(7),
    };
    expect(grid.rowKey()(updated)).toBe(original.id);
    expect(new Set(component.rows().map(component.rowKey)).size).toBe(component.rows().length);
    expect([...component.rows()].reverse().map(component.rowKey)).toEqual(
      component.rows().map(component.rowKey).reverse(),
    );
  });

  it('keeps deployment labels and explicit UTC presentation in the consumer', async () => {
    const { component, root } = await setup();
    expect(component.columns.map((column) => column.header)).toEqual([
      'Change',
      'Attempt created (UTC)',
      'Target',
      'Result',
      'Revision',
    ]);
    expect(root.querySelector('tbody')?.textContent).toContain('Oct 5, 2026, 2:30 PM UTC');
    expect(root.querySelector('tbody')?.textContent).toContain('Production');
    expect(root.querySelector('tbody')?.textContent).toContain('Succeeded');
    expect(root.querySelector('tbody')?.textContent).toContain('Failed');
    expect(component.rows()[0]!.status).toBe('succeeded');
    expect(component.formatStatus({ ...component.rows()[0]!, status: 'in-progress' })).toBe(
      'In progress \u00b7 Stage unavailable',
    );
  });

  it('commits grid pagination requests through consumer state without slicing the input rows', async () => {
    const { fixture, states, component, grid, root } = await setup();
    expect(grid.pagination()).toEqual({ mode: 'client', pageIndex: 0, pageSize: 5 });
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 0, pageSize: 5 });
    component.changePage({ pageIndex: 0, pageSize: 2 });
    fixture.detectChanges();
    root.querySelectorAll<HTMLButtonElement>('.smart-grid__pager button')[1]!.click();
    fixture.detectChanges();
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 1, pageSize: 2 });
    expect(grid.pagination()).toEqual(component.pagination());
    expect(grid.rows()).toHaveLength(3);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')?.textContent).toContain(component.rows()[2]!.summary!);
    const select = root.querySelector<HTMLSelectElement>('select')!;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 0, pageSize: 5 });
    expect(grid.pagination()).toEqual(component.pagination());
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('passes loading state without displaying a stale populated history', async () => {
    const { fixture, states, grid, root } = await setup();
    states.next({ status: 'loading' });
    fixture.detectChanges();
    expect(grid.loading()).toBe(true);
    expect(grid.error()).toBeNull();
    expect(grid.rows()).toEqual([]);
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Loading results.');
    expect(root.querySelector('table')).not.toBeNull();
  });

  it('passes a public error message and recovers to populated history', async () => {
    const { fixture, states, grid, root } = await setup();
    states.next({ status: 'error', reason: 'load' });
    fixture.detectChanges();
    expect(grid.loading()).toBe(false);
    expect(grid.error()).toBe('Build & Deployment History could not be loaded.');
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
    states.next(ready);
    fixture.detectChanges();
    expect(grid.error()).toBeNull();
    expect(grid.rows()).toHaveLength(3);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('distinguishes empty history from malformed history', async () => {
    const { fixture, states, component, grid, root } = await setup();
    states.next({ ...ready, records: [] });
    fixture.componentRef.setInput('sampleData', false);
    fixture.detectChanges();
    expect(grid.error()).toBeNull();
    expect(grid.caption()).toBe('Pipeline attempts');
    expect(root.textContent).not.toContain('Development sample');
    expect(root.querySelector('[role="status"]')?.textContent).toBe(
      'No pipeline attempts to display.',
    );
    states.next({ status: 'error', reason: 'invalid-snapshot' });
    fixture.detectChanges();
    expect(grid.rows()).toEqual([]);
    expect(grid.error()).toBe('Build & Deployment History could not be verified.');

    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});
