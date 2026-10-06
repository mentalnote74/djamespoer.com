import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { DeploymentHistory } from './deployment-history';
import { SmartGrid } from '../smart-grid/smart-grid';
import { BuildDeploymentHistoryRow } from './deployment-history-row';

// Fictional sanitized snapshots, not sample runtime data or provider payloads.
const rows: readonly BuildDeploymentHistoryRow[] = [
  {
    id: 'attempt-' + 'a'.repeat(64),
    summary: 'Fixture change A',
    createdAt: '2026-10-05T10:00:00.000Z',
    revision: 'a'.repeat(7),
    environment: 'production',
    status: 'succeeded',
  },
  {
    id: 'attempt-' + 'b'.repeat(64),
    summary: 'Fixture change B',
    createdAt: '2026-10-05T11:00:00.000Z',
    revision: 'b'.repeat(7),
    environment: 'preview',
    status: 'failed',
  },
  {
    id: 'attempt-' + 'c'.repeat(64),
    summary: 'Fixture change C',
    createdAt: '2026-10-05T12:00:00.000Z',
    revision: 'c'.repeat(7),
    environment: 'preview',
    status: 'in-progress',
  },
];
const snapshot = {
  schemaVersion: 4,
  checkedAt: '2026-10-06T12:00:00.000Z',
  generatedAt: '2026-10-06T12:01:00.000Z',
  refreshStatus: 'ok',
  rows,
};

describe('DeploymentHistory snapshot composition', () => {
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeploymentHistory],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  function setup() {
    const fixture = TestBed.createComponent(DeploymentHistory);
    fixture.detectChanges();
    const request = http.expectOne('/data/deployment-history.json');
    const grid = fixture.debugElement.query(By.directive(SmartGrid))
      .componentInstance as SmartGrid<BuildDeploymentHistoryRow>;
    return {
      fixture,
      request,
      grid,
      component: fixture.componentInstance,
      root: fixture.nativeElement as HTMLElement,
    };
  }

  it('begins loading without illustrative rows or development labels', () => {
    const { fixture, grid, root, component } = setup();
    expect(grid.loading()).toBe(true);
    expect(grid.rows()).toEqual([]);
    expect(component.freshness()).toBeNull();
    expect(grid.caption()).toBe('Pipeline attempts');
    expect(root.querySelector('[role="status"]')?.textContent).toBe('Loading results.');
    expect(root.textContent).not.toMatch(/Sample:|sample-attempt|Development sample/);
    fixture.destroy();
  });

  it('passes valid rows through Smart Grid with consumer presentation', () => {
    const { fixture, request, grid, root } = setup();
    request.flush(JSON.stringify(snapshot));
    fixture.detectChanges();
    expect(grid.loading()).toBe(false);
    expect(grid.error()).toBeNull();
    expect(grid.rows()).toEqual(rows);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(root.querySelector('tbody')?.textContent).toContain('Fixture change A');
    expect(root.querySelector('tbody')?.textContent).toContain('Succeeded');
    expect(root.querySelector('tbody')?.textContent).toContain('Oct 5, 2026, 10:00 AM UTC');
    expect(root.querySelector('tbody')?.textContent).toContain('Oct 5, 2026, 11:00 AM UTC');
  });

  it('renders verified-empty history normally with no sample fallback', () => {
    const { fixture, request, grid, root } = setup();
    request.flush(JSON.stringify({ ...snapshot, rows: [] }));
    fixture.detectChanges();
    expect(grid.rows()).toEqual([]);
    expect(grid.loading()).toBe(false);
    expect(grid.error()).toBeNull();
    expect(root.querySelector('[role="status"]')?.textContent).toBe(
      'No pipeline attempts to display.',
    );
    expect(root.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(root.textContent).not.toContain('Sample:');
  });

  it('maps load failure to safe existing error behavior without a sample fallback', () => {
    const { fixture, request, grid, root, component } = setup();
    request.flush('private error detail', { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(grid.error()).toBe('Build & Deployment History could not be loaded.');
    expect(grid.rows()).toEqual([]);
    expect(component.freshness()).toBeNull();
    expect(root.textContent).not.toMatch(/private error detail|Sample:/);
  });

  it('maps invalid-snapshot failure to a safe verification error', () => {
    const { fixture, request, grid, root } = setup();
    request.flush('{}');
    fixture.detectChanges();
    expect(grid.error()).toBe('Build & Deployment History could not be verified.');
    expect(grid.loading()).toBe(false);
    expect(grid.rows()).toEqual([]);
    expect(root.querySelector('[role="status"]')?.textContent).toBe(grid.error());
    expect(root.textContent).not.toMatch(/schemaVersion|invalid-snapshot|Sample:/);
  });

  it('retains exact freshness separately without displaying it or adding it to rows', () => {
    const { fixture, request, component, grid, root } = setup();
    request.flush(JSON.stringify(snapshot));
    fixture.detectChanges();
    expect(component.freshness()).toEqual({
      checkedAt: snapshot.checkedAt,
      generatedAt: snapshot.generatedAt,
      refreshStatus: 'ok',
    });
    expect(Object.keys(grid.rows()[0]!)).not.toContain('checkedAt');
    expect(root.textContent).not.toContain(snapshot.checkedAt);
  });

  it('destruction cancels the pending HTTP request', () => {
    const { fixture, request } = setup();
    expect(request.cancelled).toBe(false);
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });

  it('shows five of nineteen attempts on the first of four pages', () => {
    const { fixture, request, grid, root } = setup();
    const attempts = Array.from({ length: 19 }, (_, index) => ({
      ...rows[0]!,
      id: 'attempt-' + index.toString(16).padStart(64, '0'),
    }));
    request.flush(JSON.stringify({ ...snapshot, rows: attempts }));
    fixture.detectChanges();
    expect(grid.rows()).toHaveLength(19);
    expect(root.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(grid.pageCount()).toBe(4);
    expect(root.querySelector<HTMLSelectElement>('select')!.value).toBe('5');
  });

  it('keeps controlled pagination after snapshot rows arrive', () => {
    const { fixture, request, component, grid, root } = setup();
    request.flush(JSON.stringify(snapshot));
    fixture.detectChanges();
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 0, pageSize: 5 });
    component.changePage({ pageIndex: 0, pageSize: 2 });
    fixture.detectChanges();
    root.querySelectorAll<HTMLButtonElement>('.smart-grid__pager button')[1]!.click();
    fixture.detectChanges();
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 1, pageSize: 2 });
    expect(grid.pagination()).toEqual(component.pagination());
    expect(root.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(root.querySelector('tbody')?.textContent).toContain('Fixture change C');
    const select = root.querySelector<HTMLSelectElement>('select')!;
    select.value = '5';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component.pagination()).toEqual({ mode: 'client', pageIndex: 0, pageSize: 5 });
    expect(root.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(grid.rows()).toHaveLength(3);
  });
});
